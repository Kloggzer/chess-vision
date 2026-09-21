/**
 * Gezaehlt wird der BEGANGENE Zug. Der Replay druckt auch `decider=rejected`, und die mitzuzaehlen
 * meldete der Karte "3 Zuege" fuer einen Kandidaten mit leerer Zugliste. Ein Nenner von 0 ist
 * ausserdem kein Balken, sondern eine Division, die niemand sehen will.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { progressOf } from "@/lib/progress";
import { tempDataRoot } from "@/lib/test-fixtures";

let root: string;

beforeEach(async () => {
  root = await tempDataRoot("progress-decider");
});

async function log(lines: string[]): Promise<string> {
  const file = path.join(root, "run.log");
  await writeFile(file, ["$ desktop.bat replay", ...lines].join("\n") + "\n", "utf8");
  return file;
}

test("verworfene Entscheidungen sind keine Zuege", async () => {
  const file = await log([
    "decision: ply=1 decider=commit",
    "decision: ply=7 decider=rejected",
  ]);
  expect((await progressOf("g", file)).plies).toBe(1);
});

test("ein Nenner von 0 ergibt keinen Balken", async () => {
  expect((await progressOf("g", await log(["0/0 frames"]))).frames).toBeNull();
  expect((await progressOf("g", await log(["12/40 frames"]))).frames).toEqual({ at: 12, total: 40 });
});
