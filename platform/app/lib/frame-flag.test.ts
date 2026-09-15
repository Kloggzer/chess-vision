import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { flagFrame } from "@/lib/frame-flag";
import { loadSession } from "@/lib/session";
import { type RowSpec, sessionRow, tempDataRoot, writeSession } from "@/lib/test-fixtures";

const NAME = "2026-09-14-10-00-00";
let dir: string;

const row = (frame: number, extra: Partial<RowSpec> = {}): RowSpec => ({
  frame,
  fen: "8/8/8/8/8/8/8/R6R w - - 0 1",
  dirty: true,
  extra: { dirty_reason: "stale" },
  ...extra,
});

const log = () => readFile(path.join(dir, "log.jsonl"), "utf8");

beforeEach(async () => {
  const root = await tempDataRoot("frameflag");
  dir = await writeSession({
    root,
    name: NAME,
    fps: 30,
    moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
    rows: [row(100), row(200), row(300)],
  });
});

test("the flag lands on ONE row and every other line stays byte for byte", async () => {
  const before = (await log()).split("\n");
  const res = await flagFrame(NAME, "000200", true);
  expect(res).toMatchObject({ stem: "000200", unusable: true });
  const after = (await log()).split("\n");
  expect(after[0]).toBe(before[0]);
  expect(after[2]).toBe(before[2]);
  expect(JSON.parse(after[1])).toEqual({ ...sessionRow(row(200)), unusable: true });
  // Der Stem kommt vom BRETT wie vom Frame — beide Schreibweisen stehen in derselben Zeile.
  expect(await flagFrame(NAME, "000300", true)).toMatchObject({ unusable: true });
});

test("`data/` ist nicht wiederherstellbar: jede Aenderung legt vorher eine Sicherung", async () => {
  const res = await flagFrame(NAME, "000100", true);
  expect(res.backup).toMatch(/^log\.jsonl\.bak\.\d{8}-\d{6}/);
  const kept = await readFile(path.join(dir, res.backup!), "utf8");
  expect(JSON.parse(kept.split("\n")[0])).not.toHaveProperty("unusable");
  // Zwei Urteile in derselben Sekunde duerfen sich nicht gegenseitig ueberschreiben.
  const second = await flagFrame(NAME, "000200", true);
  expect(second.backup).not.toBe(res.backup);
  expect((await readdir(dir)).filter((f) => f.includes(".bak."))).toHaveLength(2);
});

test("ein Urteil, das nichts aendert, schreibt auch nichts", async () => {
  await flagFrame(NAME, "000100", true);
  const text = await log();
  const again = await flagFrame(NAME, "000100", true);
  expect(again.backup).toBeNull();
  expect(await log()).toBe(text);
  // Zuruecknehmen ist derselbe Weg, und DAS schreibt wieder.
  expect((await flagFrame(NAME, "000100", false)).backup).not.toBeNull();
  expect(JSON.parse((await log()).split("\n")[0]).unusable).toBe(false);
});

test("ein unbekannter Stem ist ein Fehler, kein stiller Nulllauf", async () => {
  await expect(flagFrame(NAME, "999999", true)).rejects.toThrow("999999");
  expect((await readdir(dir)).some((f) => f.includes(".bak."))).toBe(false);
});

test("das geflaggte Frame verlaesst den Strom, weil `loadSession` es mitliest", async () => {
  expect((await loadSession(NAME)).byStem.get("000200")!.unusable).toBe(false);
  await flagFrame(NAME, "000200", true);
  expect((await loadSession(NAME)).byStem.get("000200")!.unusable).toBe(true);
});
