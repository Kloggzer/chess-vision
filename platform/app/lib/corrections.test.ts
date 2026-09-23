import { appendFile, readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { appendCorrections, correctionsPath, decidedKeys, judgedKeys, recentVerdicts, validate } from "@/lib/corrections";
import { appendUnusableCells } from "@/lib/unusable-cells";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => boolean) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return {
    ...real,
    // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
    stat: (file: string, ...rest: unknown[]) =>
      fail.on?.(String(file))
        ? Promise.reject(Object.assign(new Error(`EMFILE: ${file}`), { code: "EMFILE" }))
        : (real.stat as (...a: unknown[]) => unknown)(file, ...rest),
  };
});

/** A row a previous session wrote — the writer must never touch it. */
const EXISTING =
  '{"session_id": "rg-rec-1", "frame": "000001", "square": "a1", "label": "occluded", ' +
  '"ts": "2026-08-01T00:00:00+00:00"}\n';
const LEGACY = EXISTING.replace("rg-rec-1", "rg-old");

let root: string;
let file: string;
let legacyFile: string;

beforeEach(async () => {
  fail.on = null;
  root = await tempDataRoot("corrections");
  // One ledger per recording since 2026-08-20: the id keeps `rg-`, the directory never had it.
  // "g" gehoert dazu, seit der Schreiber eine fehlende Aufnahme ABLEHNT statt sie anzulegen.
  for (const name of ["rec-1", "old", "g"]) await mkdir(path.join(root, "recordings", name), { recursive: true });
  file = path.join(root, "recordings", "rec-1", "corrections.jsonl");
  legacyFile = path.join(root, "recordings", "old", "corrections.jsonl");
  await writeFile(file, EXISTING, "utf8");
  await writeFile(legacyFile, LEGACY, "utf8");
});

async function post(rows: unknown) {
  const { POST } = await import("@/app/api/corrections/route");
  return POST(
    new Request("http://localhost/api/corrections", {
      method: "POST",
      body: JSON.stringify({ rows }),
    }),
  );
}

test("the corrections POST appends schema-valid rows and rewrites nothing", async () => {
  const response = await post([
    { session_id: "rg-rec-1", frame: "004211", square: "e2", label: "wP" },
    { session_id: "rg-rec-1", frame: "004211", square: "e3", label: "wQ" },
  ]);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ written: 2 });

  const text = await readFile(file, "utf8");
  expect(text.startsWith(EXISTING)).toBe(true); // append-only: the prefix is byte-identical
  const lines = text.trimEnd().split("\n");
  expect(lines.length).toBe(3);

  const row = JSON.parse(lines[1]);
  expect(Object.keys(row).sort()).toEqual(["frame", "label", "session_id", "square", "ts"]);
  expect(row).toMatchObject({
    session_id: "rg-rec-1",
    frame: "004211",
    square: "e2",
    label: "wP",
  });
  expect(row.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/);
  expect(text.endsWith("\n")).toBe(true);
});

test("a row outside the schema is refused whole — nothing of the batch lands", async () => {
  for (const bad of [
    { session_id: "rg-rec-1", frame: "004211", square: "e9", label: "occluded" },
    { session_id: "rg-rec-1", frame: "004211", square: "e2", label: "hand" },
    // The 14th class is history: it is read back below, and never written again.
    { session_id: "rg-rec-1", frame: "004211", square: "e2", label: "occluded" },
    { session_id: "../escape", frame: "004211", square: "e2", label: "empty" },
    { session_id: "rg-rec-1", frame: "../../etc", square: "e2", label: "empty" },
  ]) {
    expect((await post([bad])).status, JSON.stringify(bad)).toBe(400);
  }
  expect(await readFile(file, "utf8")).toBe(EXISTING);
});

test("an undo is a superseding row, because load_corrections is last-line-wins", async () => {
  await post([{ session_id: "rg-rec-1", frame: "004211", square: "e2", label: "wP" }]);
  await post([{ session_id: "rg-rec-1", frame: "004211", square: "e2", label: "wQ" }]);
  expect((await decidedKeys("rec-1")).get("004211|e2")).toBe("wQ");
});

test("a retract row takes the cell out of the judged map and leaves Python a normal label", async () => {
  await post([{ session_id: "rg-rec-1", frame: "004211", square: "e2", label: "wP" }]);
  expect((await judgedKeys("rec-1")).has("004211|e2")).toBe(true);

  // `z` after the flush: the label the cell falls back to, plus the tombstone.
  const response = await post([
    { session_id: "rg-rec-1", frame: "004211", square: "e2", label: "wR", retract: true },
  ]);
  expect(response.status).toBe(200);

  // The board reopens — this is the half a plain superseding row cannot do.
  expect((await decidedKeys("rec-1")).has("004211|e2")).toBe(false);
  expect((await judgedKeys("rec-1")).has("004211|e2")).toBe(false);

  // And `load_corrections` reads four keys with last line winning: `wR` is the training label.
  const last = JSON.parse((await readFile(file, "utf8")).trimEnd().split("\n").pop()!);
  expect(last).toMatchObject({ square: "e2", label: "wR", retract: true });
});

test("the reviewed ledger is untouched by a retract — only corrections carry the tombstone", async () => {
  await appendCorrections([{ session_id: "rg-g", frame: "000030", square: "e4", label: "wP" }], "reviewed");
  await appendCorrections([
    { session_id: "rg-g", frame: "000030", square: "e4", label: "wP", retract: true },
  ]);
  // The review row still says a human looked; the corrections ledger holds no verdict.
  expect((await decidedKeys("g", "reviewed")).has("000030|e4")).toBe(true);
  expect((await decidedKeys("g")).has("000030|e4")).toBe(false);
});

test("a review row is recorded, but never in the training input", async () => {
  await appendCorrections([{ session_id: "rg-g", frame: "000030", square: "e4", label: "wP" }], "reviewed");

  // The file that feeds `chesslab slice` must be byte-for-byte what it was.
  expect(await readFile(file, "utf8")).toBe(EXISTING);
  expect(await readFile(correctionsPath("g"), "utf8").catch(() => null)).toBe(null);
  expect(await decidedKeys("g")).toEqual(new Map());
  // But the work is on the record, and the views read both.
  expect(await decidedKeys("g", "reviewed")).toEqual(new Map([["000030|e4", "wP"]]));
  expect(await judgedKeys("g")).toEqual(new Map([["000030|e4", "wP"]]));
});

test("a legacy occluded row stays readable, it just cannot be written again", async () => {
  expect((await decidedKeys("old")).get("000001|a1")).toBe("occluded");
  expect((await post([{ session_id: "rg-old", frame: "000001", square: "a1", label: "occluded" }])).status).toBe(400);
  expect(await readFile(legacyFile, "utf8")).toBe(LEGACY);
});

test("the ledger cache follows the file: a foreign append is seen, an unchanged file is not re-split", async () => {
  // Python and a second tab write this file too, so the cache may only be keyed on the file's own
  // mtime and size — never on "we last wrote it".
  await appendCorrections([{ session_id: "rg-g", frame: "000030", square: "e4", label: "wP" }]);
  expect((await decidedKeys("g")).get("000030|e4")).toBe("wP");

  await appendFile(
    correctionsPath("g"),
    '{"session_id": "rg-g", "frame": "000030", "square": "e4", "label": "occluded", "ts": "2026-08-15T00:00:00+00:00"}\n',
    "utf8",
  );
  expect((await decidedKeys("g")).get("000030|e4")).toBe("occluded");

  // A cached map that leaks would be edited by the merge in `judgedKeys` and stay edited.
  const before = await decidedKeys("g");
  before.set("000030|e4", "bK");
  expect((await decidedKeys("g")).get("000030|e4")).toBe("occluded");
});

test("a correction outranks an older review of the same cell", async () => {
  await appendCorrections([{ session_id: "rg-g", frame: "000030", square: "e4", label: "wP" }], "reviewed");
  await appendCorrections([{ session_id: "rg-g", frame: "000030", square: "e4", label: "occluded" }]);

  expect((await judgedKeys("g")).get("000030|e4")).toBe("occluded");
});

test("recentVerdicts returns both ledgers newest first, and a retracted cell is gone", async () => {
  await appendCorrections([{ session_id: "rg-rec-1", frame: "000002", square: "b2", label: "wP" }], "reviewed");
  await appendCorrections([{ session_id: "rg-rec-1", frame: "000003", square: "c3", label: "bB" }]);
  await appendCorrections([{ session_id: "rg-rec-1", frame: "000002", square: "b2", label: "wP", retract: true }], "reviewed");

  const rows = await recentVerdicts("rec-1", 10);
  expect(rows.map((r) => `${r.frame}|${r.square}|${r.label}|${r.ledger}`)).toEqual([
    "000003|c3|bB|corrections",
    "000001|a1|occluded|corrections",
  ]);
});

test("recentVerdicts caps at the limit, keeping the newest", async () => {
  await appendCorrections([{ session_id: "rg-rec-1", frame: "000009", square: "d4", label: "wN" }]);
  expect((await recentVerdicts("rec-1", 1)).map((r) => r.square)).toEqual(["d4"]);
});

test("recentVerdicts agrees with judgedKeys when both ledgers share a second", async () => {
  await writeFile(
    path.join(path.dirname(file), "reviewed.jsonl"),
    EXISTING.replace('"label": "occluded"', '"label": "wP"'),
    "utf8",
  );

  expect((await judgedKeys("rec-1")).get("000001|a1")).toBe("occluded");
  expect(
    (await recentVerdicts("rec-1", 10)).find((r) => `${r.frame}|${r.square}` === "000001|a1")?.label,
    "the recent view must show the correction that actually wins, not a same-second review row",
  ).toBe("occluded");
});

test("ledgerChanges keeps file order and the value each row replaced", async () => {
  await appendCorrections([{ session_id: "rg-rec-1", frame: "000001", square: "a1", label: "wR" }]);
  await appendCorrections([{ session_id: "rg-rec-1", frame: "000001", square: "a1", label: "wB" }]);

  const rows = await (await import("@/lib/corrections")).ledgerChanges("rec-1", "corrections");
  expect(rows.map((r) => [r.label, r.before, r.seq])).toEqual([
    ["occluded", null, 0],
    ["wR", "occluded", 1],
    ["wB", "wR", 2],
  ]);
});

test("recentVerdicts shows the label that actually stands, even when the review row is newer", async () => {
  // Erst korrigiert, danach „FEN stimmt": `judgedKeys` laesst die Korrektur gewinnen, `recentVerdicts` liess die juengere Zeile gewinnen.
  const row = (label: string, ts: string) =>
    JSON.stringify({ session_id: "rg-rec-1", frame: "000001", square: "a1", label, ts }) + "\n";
  await writeFile(file, row("bB", "2026-09-01T00:00:00+00:00"), "utf8");
  await writeFile(path.join(path.dirname(file), "reviewed.jsonl"), row("wP", "2026-09-02T00:00:00+00:00"), "utf8");

  expect((await judgedKeys("rec-1")).get("000001|a1")).toBe("bB");
  expect(
    (await recentVerdicts("rec-1", 10)).find((r) => `${r.frame}|${r.square}` === "000001|a1")?.label,
    "the recent view must show the correction that actually wins, not a newer review row",
  ).toBe("bB");
});

test("corrections: ein EMFILE nach dem ersten Urteil liefert nicht den leeren Stand von davor", async () => {
  // Der Cache-Schluessel war `"none"` fuer JEDEN `stat`-Fehler, nicht nur fuer ENOENT.
  expect((await decidedKeys("g")).size).toBe(0);
  const ledger = correctionsPath("g");
  await writeFile(ledger, JSON.stringify({ session_id: "rg-g", ts: "t", frame: "000001", square: "e4", label: "wP" }) + "\n", "utf8");
  fail.on = (f) => f === ledger;
  await expect(decidedKeys("g")).rejects.toThrow(/EMFILE/);
});

const door = (extra: Record<string, unknown>) =>
  ({ session_id: "rg-rec-1", frame: "000001", square: "a1", label: "wP", ...extra });

test("was kein Feld a1..h8 ist, kommt nicht ins Ledger", () => {
  for (const square of ["j9", "a9", "A1", "a1 ", "", "a10"]) {
    expect(() => validate(door({ square })), square).toThrow(/bad square/);
  }
  expect(() => validate({ session_id: "rg-rec-1", frame: "000001", label: "wP" })).toThrow(/bad square/);
});

test("nur das woertliche true ist ein Grabstein", () => {
  // Wahrheitsartiges wie `"false"` oder `1` als Widerruf gelesen loescht ein gerade gefaelltes Urteil.
  for (const retract of [false, "false", "no", 1, 0, null]) {
    expect(validate(door({ retract })), String(retract)).not.toHaveProperty("retract");
  }
  expect(validate(door({ retract: true })).retract).toBe(true);
});

// `requireRecording` haelt beide Ledger-Tueren: sonst legte ein Tippfehler in `session_id` eine Aufnahme an.
test("ein Tippfehler in der session_id legt keine Aufnahme an", async () => {
  const row = { session_id: "rg-rec-1-tippfehler", frame: "000100", square: "a1", label: "wP" };
  await expect(appendCorrections([row])).rejects.toThrow("keine Aufnahme");
  await expect(appendUnusableCells([{ ...row, unusable: true }])).rejects.toThrow("keine Aufnahme");
  expect((await readdir(path.join(root, "recordings"))).sort()).toEqual(["g", "old", "rec-1"]);
});

test("die echte Aufnahme nimmt beide Ledger an", async () => {
  const row = { session_id: "rg-rec-1", frame: "000100", square: "a1", label: "wP" };
  expect(await appendCorrections([row])).toBe(1);
  expect(await appendUnusableCells([{ ...row, unusable: true }])).toBe(1);
  expect((await readdir(path.join(root, "recordings"))).sort()).toEqual(["g", "old", "rec-1"]);
});
