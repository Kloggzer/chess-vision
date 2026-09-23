/** Stellen, die JSON/JSONL anders beantworteten als `lib/jsonl.ts` und `lib/serialize.ts` es festlegen. */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";

const realWrite = (await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises")).writeFile;
/** Der Schreiber, den die Produktion sieht — je Test umgehaengt, sonst der echte. */
let onWrite: typeof realWrite = realWrite;

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return { ...actual, default: actual, writeFile: (...args: Parameters<typeof realWrite>) => onWrite(...args) };
});

const { flagFrame } = await import("@/lib/frame-flag");
const { readJsonl } = await import("@/lib/jsonl");
const { readUseless, setUseless } = await import("@/lib/useless");
const { appendReviewNotes, dropReviewNotes, reviewNotesPath, unusableBoards } = await import("@/lib/review-notes");
const { tempDataRoot, writeSession } = await import("@/lib/test-fixtures");

const NAME = "2026-09-16-10-00-00";
let root: string;
let dir: string;

beforeEach(async () => {
  onWrite = realWrite;
  root = await tempDataRoot("jsondur");
  dir = await writeSession({
    root,
    name: NAME,
    fps: 30,
    moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
    rows: [{ frame: 100 }, { frame: 200 }, { frame: 300 }],
  });
});

// Wer waehrend des Exports flaggt, schrieb die halbe Zeile mit `"\n"` zurueck: aus `tail` wurde `corrupt`.
test("flagFrame macht aus dem erwartbaren Schwanz keine dauerhafte Beschaedigung", async () => {
  const file = path.join(dir, "log.jsonl");
  await realWrite(file, (await readFile(file, "utf8")) + '{"frame":"frames/000400.png","ply":2,"fe', "utf8");
  const before = await readFile(file, "utf8");
  expect(readJsonl(before)).toMatchObject({ tail: true, corrupt: 0 });

  await flagFrame(NAME, "000100", true).catch(() => {});
  expect(readJsonl(await readFile(file, "utf8")).corrupt).toBe(0);
});

// Als "nie geflaggt" gelesen lief die Kette wieder und der Widerruf fiel lautlos mit 200 aus.
test("eine unlesbare useless.json ist nicht dasselbe wie keine", async () => {
  const file = path.join(dir, "useless.json");
  await realWrite(file, '{"at":"2026-09-16T10:00:00Z", "rea', "utf8");
  await expect(readUseless(NAME)).rejects.toThrow();
  await expect(setUseless(NAME, false)).rejects.toThrow();
  expect(await readUseless("nicht-da-2026-01-01-00-00-00").catch(() => "warf")).toBeNull();
});

// Ein blankes `writeFile` kuerzt zuerst; bricht es ab, sind die Urteile aller Sitzungen halb da.
test("ein abgebrochener Widerruf laesst das Ledger ganz", async () => {
  await appendReviewNotes([
    { session_id: NAME, frame: "000100", verdict: "matte-ok" },
    { session_id: NAME, frame: "000200", verdict: "matte-ok" },
  ]);
  const file = reviewNotesPath();
  const whole = await readFile(file, "utf8");

  onWrite = (async (target: Parameters<typeof realWrite>[0], data: Parameters<typeof realWrite>[1]) => {
    await realWrite(target, String(data).slice(0, 20), "utf8");
    throw new Error("ENOSPC");
  }) as typeof realWrite;
  await dropReviewNotes([{ session_id: NAME, frame: "000100", verdict: "matte-ok" }]).catch(() => {});
  onWrite = realWrite;

  expect(await readFile(file, "utf8")).toBe(whole);
});

test("nach dem Abbruch schreibt der naechste Widerruf wieder", async () => {
  await appendReviewNotes([{ session_id: NAME, frame: "000100", verdict: "matte-ok" }]);
  expect(await dropReviewNotes([{ session_id: NAME, frame: "000100", verdict: "matte-ok" }])).toBe(1);
  expect(await readFile(reviewNotesPath(), "utf8")).toBe("");
});

// Still uebersprungen stand das weggeworfene Frame wieder in der Lane, ohne jeden Fehler.
test("eine kaputte Zeile mitten im Urteils-Ledger wird gemeldet, nicht uebersprungen", async () => {
  const verdict = (frame: string) =>
    JSON.stringify({ session_id: "rg-g", frame, verdict: "unusable-board", ts: "2026-09-16T10:00:00+00:00" });
  await mkdir(path.join(root, "labels"), { recursive: true });
  await realWrite(reviewNotesPath(), `${verdict("000100")}\n{"session_id": "rg-g"\n${verdict("000300")}\n`, "utf8");
  (globalThis as { __chesslabReviewNotes?: Map<string, unknown> }).__chesslabReviewNotes?.clear();
  await expect(unusableBoards("rg-g")).rejects.toThrow(/beschaedigte Zeile/);
});
