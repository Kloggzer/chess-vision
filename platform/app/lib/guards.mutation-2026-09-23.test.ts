/** Wachen, die bei der Mutationsprobe vom 2026-09-23 alle Tests ueberlebten — je Test eine. */
import { mkdir, readFile, readdir, stat, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ rename: null as null | string, read: null as null | string }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  const reject = (code: string, file: string) => Promise.reject(Object.assign(new Error(`${code}: ${file}`), { code }));
  return {
    ...real,
    rename: (from: string, to: string) =>
      String(to) === fail.rename ? reject("EPERM", String(to)) : real.rename(from, to),
    readFile: (file: string, ...rest: unknown[]) =>
      String(file) === fail.read ? reject("EACCES", String(file)) : (real.readFile as (...a: unknown[]) => unknown)(file, ...rest),
  };
});

beforeEach(() => {
  fail.rename = null;
  fail.read = null;
});

test("writeFileAtomic laesst nach einem gescheiterten rename keine Zwischendatei liegen", async () => {
  const root = await tempDataRoot("atomic-rm");
  const file = path.join(root, "x.json");
  fail.rename = file;
  const { writeFileAtomic } = await import("@/lib/atomic");
  await expect(writeFileAtomic(file, "{}")).rejects.toThrow(/EPERM/);
  expect(await readdir(root)).toEqual([]);
});

test("appendRows ohne Zeilen fasst die Datei nicht an, auch keinen abgerissenen Schwanz", async () => {
  const root = await tempDataRoot("append-empty");
  const torn = path.join(root, "torn.jsonl");
  await writeFile(torn, '{"a":1}\n{"b"', "utf8");
  const { appendRows } = await import("@/lib/atomic");
  expect(await appendRows(torn, [])).toBe(0);
  expect(await readFile(torn, "utf8")).toBe('{"a":1}\n{"b"');
  expect(await appendRows(path.join(root, "none.jsonl"), [])).toBe(0);
  expect(await readdir(root)).toEqual(["torn.jsonl"]);
});

test("der Stempel traegt die Groesse: gleiche mtime, anderer Inhalt ist ein anderer Stand", async () => {
  const file = path.join(await tempDataRoot("stamp-size"), "reference.pgn");
  const when = new Date("2026-09-23T10:00:00Z");
  const { stampOrMissing } = await import("@/lib/measurement");
  await writeFile(file, "1. e4 *\n", "utf8");
  await utimes(file, when, when);
  const before = await stampOrMissing(file);
  await writeFile(file, "1. e4 e5 *\n", "utf8");
  await utimes(file, when, when);
  expect((await stat(file)).mtimeMs).toBe(when.getTime());
  expect(await stampOrMissing(file)).not.toBe(before);
});

test("loadMeasurement: ein anderer salt ist ein anderer Cache-Eintrag", async () => {
  const file = path.join(await tempDataRoot("salt"), "flags.jsonl");
  await writeFile(file, '{"a":1}\n', "utf8");
  const { clearMeasurementCache, loadMeasurement } = await import("@/lib/measurement");
  clearMeasurementCache();
  const parse = vi.fn((rows: Record<string, unknown>[]) => rows.length);
  await loadMeasurement(file, parse, "matte-1");
  await loadMeasurement(file, parse, "matte-1");
  expect(parse).toHaveBeenCalledTimes(1);
  await loadMeasurement(file, parse, "matte-2");
  expect(parse).toHaveBeenCalledTimes(2);
});

test("validateNote prueft den frame-Namen", async () => {
  const { validateNote } = await import("@/lib/session-store/review-notes");
  expect(() => validateNote({ session_id: "rg-x", frame: "../evil", verdict: "matte-ok" })).toThrow(/frame/);
});

test("ein Widerruf ohne Ledger legt keins an", async () => {
  await tempDataRoot("drop-none");
  const { dropReviewNotes, reviewNotesPath } = await import("@/lib/session-store/review-notes");
  expect(await dropReviewNotes([{ session_id: "rg-x", frame: "000001", verdict: "dirty-frame" }])).toBe(0);
  await expect(stat(reviewNotesPath())).rejects.toMatchObject({ code: "ENOENT" });
});

test("ein EACCES beim Widerruf ist kein „nichts zu entfernen\" — und das Ledger bleibt stehen", async () => {
  await tempDataRoot("drop-eacces");
  const { dropReviewNotes, reviewNotesPath } = await import("@/lib/session-store/review-notes");
  const file = reviewNotesPath();
  await mkdir(path.dirname(file), { recursive: true });
  const body = '{"session_id":"rg-x","frame":"000001","verdict":"dirty-frame","ts":"t"}\n';
  await writeFile(file, body, "utf8");
  fail.read = file;
  await expect(dropReviewNotes([{ session_id: "rg-x", frame: "000001", verdict: "dirty-frame" }])).rejects.toThrow(/EACCES/);
  fail.read = null;
  expect(await readFile(file, "utf8")).toBe(body);
});

test("eine Ablehnung wird gemerkt, bis ein Mensch sie beantwortet", async () => {
  const root = await tempDataRoot("adopt-remember");
  const game = path.join(root, "recordings", "g");
  await mkdir(game, { recursive: true });
  const { adoptOffered, clearAdoptFailures } = await import("@/lib/chain/chain");
  clearAdoptFailures();
  await adoptOffered(["g"]);
  await mkdir(path.join(game, "files", "games"), { recursive: true });
  await writeFile(path.join(game, "files", "games", "a.pgn"), "1. e4 *\n", "utf8");
  await adoptOffered(["g"]);
  await expect(stat(path.join(game, "reference.pgn"))).rejects.toMatchObject({ code: "ENOENT" });
  clearAdoptFailures();
  await adoptOffered(["g"]);
  expect(await readFile(path.join(game, "reference.pgn"), "utf8")).toBe("1. e4 *\n");
});

test("referenceOrigin vergleicht nur die .pgn des Handys, nicht seine Records", async () => {
  const root = await tempDataRoot("origin-pgn-only");
  const game = path.join(root, "recordings", "g");
  const games = path.join(game, "files", "games");
  await mkdir(games, { recursive: true });
  await writeFile(path.join(game, "reference.pgn"), "1. d4 *\n", "utf8");
  await writeFile(path.join(games, "rec.json"), "1. d4 *\n", "utf8");
  await writeFile(path.join(games, "a.pgn"), "1. e4 *\n", "utf8");
  const { referenceOrigin } = await import("@/lib/chain/chain");
  expect(await referenceOrigin("g")).toBe("outside");
});

test("validate prueft die session_id selbst — sonst landet ein Mehr-Aufnahmen-Stapel halb", async () => {
  const { validate } = await import("@/lib/session-store/corrections");
  expect(() => validate({ session_id: "../x", frame: "000001", square: "a1", label: "wP" })).toThrow(/session_id/);
});
