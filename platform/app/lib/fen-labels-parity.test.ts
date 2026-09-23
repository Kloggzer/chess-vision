/** `fenLabels` against the labels Python wrote through `GameState.label_for` (python-chess). */
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { fenLabels } from "@/lib/fen";

type Case = { fen: string; labels: Record<string, string>; boardPart: string };

const CASES = (
  JSON.parse(
    readFileSync(path.join(__dirname, "../../../tests/data/fen_labels_parity.json"), "utf8"),
  ) as { cases: Case[] }
).cases;

test("the fixture is the shared one, not a stub", () => {
  expect(CASES.length).toBeGreaterThanOrEqual(6);
  expect(Object.keys(CASES[0].labels)).toHaveLength(64);
});

test("fenLabels matches the labels python-chess hands out", () => {
  for (const c of CASES) {
    expect(fenLabels(c.fen), c.fen).toEqual(c.labels);
  }
});
