import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { coveredSquares, PIECE_VISIBLE_MAX } from "@/lib/classes";
import { claimsAnything } from "@/lib/label/verify";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ needle: null as string | null }));

// Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` des Lesers vorbei.
vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  const hop = (op: "stat" | "readdir") => (file: string, ...rest: unknown[]) =>
    fail.needle !== null && String(file).includes(fail.needle)
      ? Promise.reject(Object.assign(new Error(`EACCES: ${file}`), { code: "EACCES" }))
      : (real[op] as (...a: unknown[]) => unknown)(file, ...rest);
  return { ...real, stat: hop("stat"), readdir: hop("readdir") };
});

let dir: string;
beforeEach(async () => {
  fail.needle = null;
  dir = await tempDataRoot("matte");
  await mkdir(path.join(dir, "recordings", "g"), { recursive: true });
  (globalThis as { __chesslabMattes?: Map<string, unknown> }).__chesslabMattes?.clear();
});

/** `n` occluded rows, as the exporter writes them — the pile a matte run is measured against. */
const pile = (n: number) =>
  Array.from({ length: n }, (_, i) => JSON.stringify({ frame: `f${i}.png`, dirty: true, dirty_reason: "occluded" })).join("\n") + "\n";

const write = (lines: string[]) =>
  writeFile(path.join(dir, "recordings", "g", "matte.jsonl"), lines.join("\n") + "\n", "utf8");

test("the threshold is the one the loss uses, and it is exclusive", () => {
  expect(PIECE_VISIBLE_MAX).toBe(0.15);
  expect(coveredSquares({ a1: 0.15, b1: 0.1501, c1: 0.9 })).toEqual(["b1", "c1"]);
});

test("a frame's coverage comes back keyed by stem, a skipped one without an alpha", async () => {
  const { loadMatte } = await import("@/lib/session-store/matte");
  // OHNE abschliessenden Umbruch: der Umbruch entscheidet, ob die letzte Zeile ein laufender
  // Schreiber oder Beschaedigung ist (`lib/jsonl.ts`).
  await writeFile(path.join(dir, "recordings", "g", "matte.jsonl"), [
    JSON.stringify({ frame: "000144", ply: 1, reason: "occluded", concepts: { hand: 0.9 }, coverage: { a1: 0.0, h4: 0.94 } }),
    JSON.stringify({ frame: "000150", ply: 1, reason: "occluded", skipped: "zone too big" }),
    '{"frame": "000160", "cov',
  ].join("\n"), "utf8");
  const matte = await loadMatte("g");
  expect(matte.get("000144")?.coverage?.h4).toBe(0.94);
  expect(matte.get("000144")?.reason).toBe("occluded");
  expect(matte.get("000150")?.skipped).toBe("zone too big");
  // A half-written trailing line is not a matte; it must not take the readable ones down with it.
  expect(matte.has("000160")).toBe(false);
});

test("a session without a matte answers empty, which is not an error", async () => {
  const { loadMatte } = await import("@/lib/session-store/matte");
  expect((await loadMatte("g")).size).toBe(0);
});

test("a recut row says whose alpha its numbers came from", async () => {
  const { loadMatte } = await import("@/lib/session-store/matte");
  await write([
    JSON.stringify({ frame: "000144", coverage: { a1: 0.9 }, alpha: "fixed" }),
    JSON.stringify({ frame: "000145", coverage: { a1: 0.9 } }),
  ]);
  const matte = await loadMatte("g");
  expect(matte.get("000144")?.alpha).toBe("fixed");
  expect(matte.get("000145")?.alpha).toBeUndefined();
});

test("painted pixels are pending until a recut newer than them has read the file", async () => {
  const { alphaState } = await import("@/lib/session-store/matte");
  const sam = { stem: "1", concepts: {}, coverage: {} };
  const fixed = { ...sam, alpha: "fixed" };
  expect(alphaState(sam, undefined, 100)).toBe("sam");
  expect(alphaState(sam, 90, 100)).toBe("pending");
  expect(alphaState(fixed, 90, 100)).toBe("fixed");
  // Painted AGAIN after the recut: the numbers on screen are SAM's once more.
  expect(alphaState(fixed, 110, 100)).toBe("pending");
});

test("a session without corrected alphas answers an empty map, not an error", async () => {
  const { fixedAlphas } = await import("@/lib/session-store/matte");
  expect((await fixedAlphas("g")).size).toBe(0);
});

// Als "niemand hat gemalt" gelesen zeigte die Lane SAMs Zahlen als bestaetigt.
test("ein I/O-Fehler am mattes-Verzeichnis ist kein „niemand hat gemalt\"", async () => {
  const { fixedAlphas } = await import("@/lib/session-store/matte");
  await mkdir(path.join(dir, "recordings", "g", "mattes"), { recursive: true });
  await writeFile(path.join(dir, "recordings", "g", "mattes", "000001.fixed.webp"), "x", "utf8");
  expect([...(await fixedAlphas("g")).keys()]).toEqual(["000001"]);
  fail.needle = "mattes";
  await expect(fixedAlphas("g")).rejects.toThrow(/EACCES/);
});

// Uebersprungen las sich das Frame als NIE gemattet, obwohl sein Alpha auf der Platte liegt.
test("eine kaputte Zeile mitten in matte.jsonl wird gemeldet, nicht uebersprungen", async () => {
  const { loadMatte } = await import("@/lib/session-store/matte");
  const row = (stem: string) =>
    JSON.stringify({ frame: stem, ply: 1, reason: "occluded", concepts: { hand: 1 }, coverage: { e2: 0.9 } });
  await write([row("000100"), '{"frame": "000200"', row("000300")]);
  await expect(loadMatte("g")).rejects.toThrow(/beschaedigte Zeile/);
});

test("the census counts DISTINCT frames — a recut leaves the same stem twice", async () => {
  const { matteCensus } = await import("@/lib/session-store/matte");
  const dir = path.join(process.env.CHESSLAB_DATA_DIR ?? "", "recordings", "g");
  await writeFile(path.join(dir, "log.jsonl"), pile(3), "utf8");
  // Stems, not lines: a recut writes stems twice, and counting lines hides the frames still missing.
  // `skipped` zaehlt nicht mit: SAM hat abgelehnt, es liegt kein Alpha da.
  await write([
    JSON.stringify({ frame: "f0", coverage: { a1: 0.9 } }),
    JSON.stringify({ frame: "f1", skipped: "zone too big" }),
    JSON.stringify({ frame: "f0", coverage: { a1: 0.8 }, alpha: "fixed" }),
  ]);
  expect(await matteCensus("g")).toEqual({ done: 1, total: 3, target: 3 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 });
});

test("a session at the run's target is done, with the untouched pile still on the record", async () => {
  const { matteCensus, matteTarget } = await import("@/lib/session-store/matte");
  const dir = path.join(process.env.CHESSLAB_DATA_DIR ?? "", "recordings", "g");
  await writeFile(path.join(dir, "log.jsonl"), pile(394), "utf8");
  await write(Array.from({ length: matteTarget() },
                         (_, i) => JSON.stringify({ frame: `f${i}`, coverage: { a1: 0.0 } })));
  // rg-2026-08-08-00-39-57: 80 of 394 by intent. The target caps the bar, the pile stays visible.
  expect(await matteCensus("g")).toEqual({ done: 80, total: 394, target: 80 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 });
});

test("only occluded rows are the pile, and a session nobody exported has none", async () => {
  const { matteCensus } = await import("@/lib/session-store/matte");
  const dir = path.join(process.env.CHESSLAB_DATA_DIR ?? "", "recordings", "g");
  expect(await matteCensus("g")).toEqual({ done: 0, total: 0, target: 0 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 });
  await writeFile(path.join(dir, "log.jsonl"), [
    JSON.stringify({ frame: "1.png", dirty: true, dirty_reason: "occluded" }),
    JSON.stringify({ frame: "2.png", dirty: true, dirty_reason: "grid-late" }),
    JSON.stringify({ frame: "3.png" }),
  ].join("\n") + "\n", "utf8");
  expect(await matteCensus("g")).toEqual({ done: 0, total: 1, target: 1 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 });
});

test("gemeldete Frames zählen getrennt — der occluded-Stapel kennt sie nicht", async () => {
  const rec = path.join(dir, "recordings", "g");
  await mkdir(rec, { recursive: true });
  await writeFile(
    path.join(rec, "log.jsonl"),
    [
      { frame: "frames/000001.png", board: "boards/000001.webp", dirty: true, dirty_reason: "occluded" },
      { frame: "frames/000002.png", board: "boards/000002.webp", dirty: true, dirty_reason: "stale" },
    ]
      .map((r) => JSON.stringify(r))
      .join("\n") + "\n",
    "utf8",
  );
  await writeFile(path.join(rec, "matte.jsonl"), JSON.stringify({ frame: "000001", coverage: {} }) + "\n", "utf8");
  await mkdir(path.join(dir, "labels"), { recursive: true });
  await writeFile(
    path.join(dir, "labels", "review-notes.jsonl"),
    [
      { session_id: "rg-g", frame: "000001", verdict: "dirty-frame" },
      { session_id: "rg-g", frame: "000002", verdict: "dirty-frame" },
    ]
      .map((r) => JSON.stringify(r))
      .join("\n") + "\n",
    "utf8",
  );
  const { matteCensus } = await import("@/lib/session-store/matte");
  const census = await matteCensus("g");
  // 000001 hat eine Matte, 000002 ist `stale` und damit weder im Stapel noch gemattet.
  expect(census.total).toBe(1);
  expect(census.reported).toBe(1);
});

test("ein Alpha ohne jede Behauptung gehört nicht in die Review", () => {
  // Die MESSUNG bleibt trotzdem stehen: sie trennt "gemessen, frei" von "nie angesehen".
  expect(claimsAnything({ a1: 0, b2: 0 })).toBe(false);
  expect(claimsAnything({})).toBe(false);
  // Spuren unter PIECE_VISIBLE_MAX zaehlen nicht: die Karte zeigt dort "0 Felder > 0.15".
  expect(claimsAnything({ a1: 0, b2: 0.02 })).toBe(false);
  expect(claimsAnything({ a1: 0, b2: PIECE_VISIBLE_MAX + 0.01 })).toBe(true);
});

test("a matte for a frame the export no longer picks does not count as done", async () => {
  const { matteCensus } = await import("@/lib/session-store/matte");
  const dir = path.join(process.env.CHESSLAB_DATA_DIR ?? "", "recordings", "g");
  await writeFile(path.join(dir, "log.jsonl"), pile(3), "utf8");
  // Nach einem Re-Export zeigen die alten Zeilen auf Stems, die der neue Plan nicht mehr waehlt —
  // sie duerfen die Session nicht als erledigt melden.
  await write([
    JSON.stringify({ frame: "verwaist-1", coverage: { a1: 0.9 } }),
    JSON.stringify({ frame: "verwaist-2", coverage: { a1: 0.9 } }),
    JSON.stringify({ frame: "f0", coverage: { a1: 0.9 } }),
  ]);
  expect(await matteCensus("g")).toEqual({ done: 1, total: 3, target: 3, reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 });
});

test("the pile is read from the board path, extension and directory stripped", async () => {
  const { matteCensus } = await import("@/lib/session-store/matte");
  const dir = path.join(process.env.CHESSLAB_DATA_DIR ?? "", "recordings", "g");
  const row = JSON.stringify({ board: "boards/000930.webp", dirty: true, dirty_reason: "occluded" });
  await writeFile(path.join(dir, "log.jsonl"), `${row}\n`, "utf8");
  await write([JSON.stringify({ frame: "000930", coverage: { a1: 0.9 } })]);
  expect(await matteCensus("g")).toEqual({ done: 1, total: 1, target: 1, reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 });
});

test("the pile names a frame by its board, not by the source frame beside it", async () => {
  const { matteCensus } = await import("@/lib/session-store/matte");
  const dir = path.join(process.env.CHESSLAB_DATA_DIR ?? "", "recordings", "g");
  const row = JSON.stringify({ frame: "frames/000010.png", board: "boards/000011.webp", dirty: true, dirty_reason: "occluded" });
  await writeFile(path.join(dir, "log.jsonl"), `${row}
`, "utf8");
  await write([JSON.stringify({ frame: "000011", coverage: { a1: 0.9 } })]);
  expect(await matteCensus("g")).toEqual({ done: 1, total: 1, target: 1, reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 });
});

test("a row SAM declined is no matte, even when it carries a coverage", async () => {
  const { matteCensus } = await import("@/lib/session-store/matte");
  const dir = path.join(process.env.CHESSLAB_DATA_DIR ?? "", "recordings", "g");
  await writeFile(path.join(dir, "log.jsonl"), pile(1), "utf8");
  await write([JSON.stringify({ frame: "f0", skipped: "zone too big", coverage: { a1: 0.9 } })]);
  expect(await matteCensus("g")).toEqual({ done: 0, total: 1, target: 1, reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 });
});

test("a merge after the verdict reopens the frame; a verdict after the merge closes it", async () => {
  const { reopened } = await import("@/lib/label/verify");
  expect(reopened({ matte: "ok", matteAt: "2026-09-11T20:00:00+00:00" }, "2026-09-11T23:00:00+00:00")).toBe(true);
  expect(reopened({ matte: "ok", matteAt: "2026-09-12T08:00:00+00:00" }, "2026-09-11T23:00:00+00:00")).toBe(false);
  expect(reopened({ matte: "ok" }, undefined)).toBe(false);
});

test("eine spaetere Absage nimmt die Matte zurueck — im Census wie im Leser", async () => {
  const { loadMatte, matteCensus } = await import("@/lib/session-store/matte");
  const dir = path.join(process.env.CHESSLAB_DATA_DIR ?? "", "recordings", "g");
  await writeFile(path.join(dir, "log.jsonl"), pile(2), "utf8");
  // matte.jsonl ist eine Historie: die juengste Zeile je Frame gilt, ueberall.
  await write([
    JSON.stringify({ frame: "f0", coverage: { a1: 0.9 } }),
    JSON.stringify({ frame: "f1", skipped: "zone too big" }),
    JSON.stringify({ frame: "f0", skipped: "zone too big" }),
    JSON.stringify({ frame: "f1", coverage: { a1: 0.2 } }),
  ]);
  const matte = await loadMatte("g");
  expect(matte.get("f0")?.skipped).toBe("zone too big");
  expect(matte.get("f1")?.coverage).toEqual({ a1: 0.2 });
  expect((await matteCensus("g")).done).toBe(1);
});
