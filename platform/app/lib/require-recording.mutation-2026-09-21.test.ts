import { readdir } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { appendCorrections } from "@/lib/corrections";
import { dataDir } from "@/lib/data";
import { appendUnusableCells } from "@/lib/unusable-cells";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

/**
 * `requireRecording` haelt beide Ledger-Tueren: `appendRows` legte die Aufnahme sonst aus einem
 * Tippfehler in `session_id` mit an, und `listGames` fuehrt jedes Verzeichnis als Aufnahme — mit
 * Trainingseingabe darin, die niemand mehr einer Aufnahme zuordnen kann.
 */
const NAME = "2026-09-21-12-00-00";
const ID = `rg-${NAME}`;

beforeEach(async () => {
  const root = await tempDataRoot("require-recording");
  await writeSession({ root, name: NAME, fps: 30, rows: [{ frame: 100 }] });
});

const recordings = () => readdir(path.join(dataDir(), "recordings"));

test("ein Tippfehler in der session_id legt keine Aufnahme an", async () => {
  const row = { session_id: `${ID}-tippfehler`, frame: "000100", square: "a1", label: "wP" };
  await expect(appendCorrections([row])).rejects.toThrow("keine Aufnahme");
  await expect(appendUnusableCells([{ ...row, unusable: true }])).rejects.toThrow("keine Aufnahme");
  expect(await recordings()).toEqual([NAME]);
});

test("die echte Aufnahme nimmt beide Ledger an", async () => {
  const row = { session_id: ID, frame: "000100", square: "a1", label: "wP" };
  expect(await appendCorrections([row])).toBe(1);
  expect(await appendUnusableCells([{ ...row, unusable: true }])).toBe(1);
  expect(await recordings()).toEqual([NAME]);
});
