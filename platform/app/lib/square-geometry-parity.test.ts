/**
 * Shared fixture with `test_square_geometry_parity.py` and `SquareGeometryParityTest.kt`. Only the TS
 * box is unrounded (Python/Kotlin round half-to-even), so `boxExact` is the parity and the rounded box need only stay within 0.5 px.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { squareColRow, squareCropBox } from "@/lib/warp";

type Case = {
  square: string;
  boardSize: number;
  padSide: number;
  whitePov: boolean;
  col: number;
  row: number;
  box: number[];
  boxUnclamped: number[];
  boxExact: number[];
};

const CASES = (
  JSON.parse(
    readFileSync(
      path.join(
        __dirname,
        "../../../android/core-engine/src/test/resources/parity/_geometry/square_geometry_parity.json",
      ),
      "utf8",
    ),
  ) as { cases: Case[] }
).cases;

test("the fixture is the shared one, not a stub", () => {
  expect(CASES.length).toBeGreaterThanOrEqual(100);
});

test("squareColRow matches the shared fixture", () => {
  for (const c of CASES) {
    expect(squareColRow(c.square, c.whitePov)).toEqual([c.col, c.row]);
  }
});

test("the unrounded crop box matches the shared fixture exactly", () => {
  for (const c of CASES) {
    const b = squareCropBox(c.square, c.boardSize, { pad_side: c.padSide }, c.whitePov);
    const where = `${c.square}@${c.boardSize}/${c.padSide}/pov=${c.whitePov}`;
    for (const [got, want] of [
      [b.x0, c.boxExact[0]],
      [b.y0, c.boxExact[1]],
      [b.x1, c.boxExact[2]],
      [b.y1, c.boxExact[3]],
    ] as const) {
      expect(got, where).toBeCloseTo(want, 9);
    }
  }
});

test("the TS box never drifts a whole pixel from the box Python and Kotlin cut", () => {
  for (const c of CASES) {
    const b = squareCropBox(c.square, c.boardSize, { pad_side: c.padSide }, c.whitePov);
    const where = `${c.square}@${c.boardSize}/${c.padSide}/pov=${c.whitePov}`;
    [b.x0, b.y0, b.x1, b.y1].forEach((v, i) => {
      expect(Math.abs(v - c.boxUnclamped[i]), `${where}[${i}]`).toBeLessThanOrEqual(0.5);
    });
  }
});
