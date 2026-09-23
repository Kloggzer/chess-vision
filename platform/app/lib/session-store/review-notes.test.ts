import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { readJsonl } from "@/lib/jsonl";
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

let dir: string;
beforeEach(async () => {
  fail.on = null;
  dir = await tempDataRoot("review-notes");
  (globalThis as { __chesslabReviewNotes?: Map<string, unknown> }).__chesslabReviewNotes?.clear();
});

const load = () => import("@/lib/session-store/review-notes");

test("a board verdict lands in the file and comes back reload-proof", async () => {
  const { appendReviewNotes, unusableBoards, reviewNotesPath } = await load();
  await appendReviewNotes([{ session_id: "rg-a", frame: "001482", verdict: "unusable-board" }]);
  expect(await unusableBoards("rg-a")).toEqual(new Set(["001482"]));
  const text = await readFile(reviewNotesPath(), "utf8");
  expect(JSON.parse(text.trim())).toMatchObject({ session_id: "rg-a", frame: "001482", verdict: "unusable-board" });
});

test("ein FEHLENDES Ledger bleibt leer — nur der Lesefehler wirft", async () => {
  const { unusableBoards } = await load();
  expect(await unusableBoards("rg-a")).toEqual(new Set());
});

test("intervals and boards are separate answers, per session", async () => {
  const { appendReviewNotes, unusableBoards, badIntervals } = await load();
  await appendReviewNotes([
    { session_id: "rg-a", ply: 34, verdict: "bad-interval" },
    { session_id: "rg-b", frame: "000100", verdict: "unusable-board", reason: "dunkler Müll" },
  ]);
  expect(await badIntervals("rg-a")).toEqual(new Set([34]));
  expect(await unusableBoards("rg-a")).toEqual(new Set());
  expect(await unusableBoards("rg-b")).toEqual(new Set(["000100"]));
});

test("validate refuses what the wire must never carry", async () => {
  const { validateNote } = await load();
  expect(() => validateNote({ session_id: "rg-a", frame: "x", verdict: "nope" })).toThrow(/verdict/);
  expect(() => validateNote({ session_id: "rg-a", ply: -1, verdict: "bad-interval" })).toThrow(/ply/);
  expect(validateNote({ session_id: "rg-a", ply: 3, verdict: "bad-interval" })).toEqual({
    session_id: "rg-a",
    ply: 3,
    verdict: "bad-interval",
  });
});

test("the matte review's two questions are answered per frame, last row winning", async () => {
  const { appendReviewNotes, frameReviews, unusableBoards } = await load();
  await appendReviewNotes([
    { session_id: "rg-a", frame: "000144", verdict: "matte-bad" },
    { session_id: "rg-a", frame: "000144", verdict: "matte-ok" },
    { session_id: "rg-a", frame: "000144", verdict: "position-ok" },
  ]);
  const got = (await frameReviews("rg-a")).get("000144");
  expect(got).toMatchObject({ matte: "ok", position: "ok" });
  expect(got?.matteAt).toMatch(/^\d{4}-\d\d-\d\dT/);
  // A frame verdict is not a thrown-out board — the two must never bleed into each other.
  expect(await unusableBoards("rg-a")).toEqual(new Set());
});

test("a reported hand is a frame verdict, never a thrown board — the FEN still holds", async () => {
  const { appendReviewNotes, frameReviews, unusableBoards } = await load();
  await appendReviewNotes([
    { session_id: "rg-a", frame: "000447", verdict: "dirty-frame", reason: "Labeln-Strom: d" },
    { session_id: "rg-a", frame: "000447", verdict: "matte-ok" },
  ]);
  expect((await frameReviews("rg-a")).get("000447")).toMatchObject({ dirty: true, matte: "ok" });
  expect(await unusableBoards("rg-a")).toEqual(new Set());
});

test("eine zurückgenommene dirty-Meldung verschwindet aus der Datei — sonst exportiert sie weiter", async () => {
  const { appendReviewNotes, dropReviewNotes, frameReviews, unusableBoards } = await load();
  await appendReviewNotes([
    { session_id: "rg-a", frame: "006186", verdict: "dirty-frame", reason: "Labeln-Strom: Crop-Ecke" },
    { session_id: "rg-a", frame: "006512", verdict: "dirty-frame" },
    { session_id: "rg-a", frame: "006186", verdict: "unusable-board" },
  ]);
  await dropReviewNotes([{ session_id: "rg-a", frame: "006186", verdict: "dirty-frame" }]);
  expect(await frameReviews("rg-a")).toEqual(new Map([["006512", { dirty: true }]]));
  // Nur die eine Frage wird zurückgenommen, die anderen Urteile über dasselbe Frame bleiben.
  expect(await unusableBoards("rg-a")).toEqual(new Set(["006186"]));
});

test("nothing may write an unreadable-square verdict — coverage answers that", async () => {
  const { validateNote } = await load();
  expect(() => validateNote({ session_id: "rg-a", frame: "000144", verdict: "unreadable" })).toThrow(/verdict/);
  expect(() => validateNote({ session_id: "rg-a", frame: "000144", verdict: "occluded" })).toThrow(/verdict/);
});

test("a half-written trailing line is skipped, not fatal", async () => {
  const { appendReviewNotes, unusableBoards, reviewNotesPath } = await load();
  await appendReviewNotes([{ session_id: "rg-a", frame: "000001", verdict: "unusable-board" }]);
  const file = reviewNotesPath();
  await writeFile(file, (await readFile(file, "utf8")) + '{"session_id":"rg-a","fr', "utf8");
  expect(await unusableBoards("rg-a")).toEqual(new Set(["000001"]));
});

// `app/api/review-notes` nimmt die Zeile ueber `validateNote` an — der geteilte Tuersteher war der laxere.
test("ein fehlendes `ply` ist kein Urteil ueber Halbzug 0", async () => {
  const { validateNote } = await load();
  for (const ply of [null, "", true, [], false]) {
    expect(() => validateNote({ session_id: "rg-a", ply, verdict: "bad-interval" })).toThrow(/ply/);
  }
  expect(validateNote({ session_id: "rg-a", ply: 34, verdict: "bad-interval" }))
    .toEqual({ session_id: "rg-a", ply: 34, verdict: "bad-interval" });
  expect(validateNote({ session_id: "rg-a", ply: "34", verdict: "bad-interval" }))
    .toEqual({ session_id: "rg-a", ply: 34, verdict: "bad-interval" });
});

test("ein unlesbares review-notes.jsonl wirft, statt jedes Urteil zu verlieren", async () => {
  const { unusableBoards, badIntervals, reviewNotesPath } = await load();
  // Ein Verzeichnis an der Stelle der Datei: `stat` gelingt, `readFile` wirft EISDIR.
  await mkdir(reviewNotesPath(), { recursive: true });
  await expect(unusableBoards("rg-a")).rejects.toThrow();
  await expect(badIntervals("rg-a")).rejects.toThrow();
});

test("review-notes: ein EMFILE nach dem ersten Wegwurf liefert nicht den leeren Stand von davor", async () => {
  // Der Cache-Schluessel war `"none"` fuer JEDEN `stat`-Fehler, nicht nur fuer ENOENT.
  const { reviewNotesPath, unusableBoards } = await load();
  expect((await unusableBoards("rg-g")).size).toBe(0);
  const file = reviewNotesPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ session_id: "rg-g", ts: "t", frame: "000001", verdict: "unusable-board" }) + "\n", "utf8");
  fail.on = (f) => f === file;
  await expect(unusableBoards("rg-g")).rejects.toThrow(/EMFILE/);
});

const note = (frame: string) =>
  JSON.stringify({ session_id: "rg-a", frame, verdict: "unusable-board", ts: "2026-09-17T00:00:00+00:00" });
const drop = async (frame: string) =>
  (await load()).dropReviewNotes([{ session_id: "rg-a", frame, verdict: "unusable-board" }]);

/** Der Widerruf schreibt das GLOBALE Ledger neu: eine unlesbare Zeile ist trotzdem ein menschliches Urteil. */
test("ein Widerruf laesst eine unlesbare Zeile stehen", async () => {
  const file = (await load()).reviewNotesPath();
  const unreadable = '{"session_id":"rg-a","frame":"000009","verd';
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, [note("000001"), unreadable, note("000002")].join("\n") + "\n", "utf8");

  expect(await drop("000001")).toBe(1);
  const lines = (await readFile(file, "utf8")).split("\n").filter((l) => l !== "");
  expect(lines, "das unleserliche Urteil wurde beim Neuschreiben verschluckt").toEqual([unreadable, note("000002")]);
});

/** Review 2026-09-17: ein `\n` hinter dem halben Schwanz machte ihn zu Korruption MITTENDRIN. */
async function withHalfTail(): Promise<{ file: string; half: string }> {
  const file = (await load()).reviewNotesPath();
  const half = '{"session_id":"rg-a","frame":"000003","verd';
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${note("000001")}\n${note("000002")}\n${half}`, "utf8");
  await drop("000001");
  return { file, half };
}

test("ein Widerruf macht aus dem halben Schwanz keine Korruption mittendrin", async () => {
  const got = readJsonl(await readFile((await withHalfTail()).file, "utf8"));
  expect(got.corrupt, "die halbe Zeile wurde mit \n abgeschlossen statt abgeschnitten").toBe(0);
  expect(got.rows.map((r) => r.frame)).toEqual(["000002"]);
});

test("und danach ist das Ledger fuer JEDE Sitzung unlesbar, nicht nur fuer die betroffene", async () => {
  await withHalfTail();
  await expect((await load()).unusableBoards("rg-b")).resolves.toEqual(new Set());
});

test("der halbe Schwanz ueberlebt den Widerruf, er wird nicht weggeworfen", async () => {
  // Abschneiden vermiede die Korruption auch — und verloere die Zeile, die der andere Schreiber gerade schreibt.
  const { file, half } = await withHalfTail();
  const text = await readFile(file, "utf8");
  expect(text.endsWith(half), "der laufende Schreiber haengt an genau diese halbe Zeile an").toBe(true);
  expect(readJsonl(text).tail, "und sie gilt weiter als Schwanz, nicht als Zeile").toBe(true);
});

const post = async (body: unknown) => {
  const { POST } = await import("@/app/api/review-notes/route");
  return POST(new Request("http://local/api/review-notes", { method: "POST", body: JSON.stringify(body) }));
};

// `/api/corrections` und `/api/unusable-cells` werfen auf ein Nicht-Array; hier wurde es zu `[]` und 200.
test("refuses a body whose rows is not an array instead of reporting written: 0", async () => {
  await mkdir(path.join(dir, "recordings", "rec-1"), { recursive: true });
  const answer = await post({ rows: { session_id: "rg-rec-1", frame: "000001", verdict: "matte-ok" } });
  expect(answer.status, "BUG: a malformed body is accepted as an empty batch").toBe(400);
});

test("refuses a retract whose rows is not an array", async () => {
  await mkdir(path.join(dir, "recordings", "rec-1"), { recursive: true });
  expect((await post({ retract: true, rows: "000001" })).status).toBe(400);
});

// `adoptDirty` lief ohne `await` und die Route antwortete 200 — scheiterte schon der START, sah das niemand.
test("a launch that never happened is in the answer", async () => {
  await mkdir(path.join(dir, "recordings", "g"), { recursive: true });
  process.env.CHESSLAB_UV = path.join(dir, "gibt-es-nicht.exe");
  const answer = (await (await post({ rows: [{ session_id: "rg-g", frame: "000002", verdict: "dirty-frame" }] })).json()) as
    { written: number; adoptFailed?: string[] };
  expect(answer.written).toBe(1);
  expect(answer.adoptFailed, "BUG: 200 beweist nur den Zettel, nicht den Start").toEqual([expect.stringContaining("g")]);
});

test("a launch that worked says nothing extra", async () => {
  await mkdir(path.join(dir, "recordings", "g"), { recursive: true });
  process.env.CHESSLAB_UV = process.execPath;
  const answer = await post({ rows: [{ session_id: "rg-g", frame: "000002", verdict: "dirty-frame" }] });
  expect(await answer.json()).toEqual({ written: 1, adoptFailed: [] });
});
