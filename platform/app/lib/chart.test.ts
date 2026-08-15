import { expect, test } from "vitest";
import { barPct, maxOf, niceMax } from "./chart";

test("niceMax rounds up to 1/2/5 × 10ⁿ and keeps an exact value", () => {
  expect(niceMax(0.329)).toBeCloseTo(0.5);
  expect(niceMax(0.5)).toBeCloseTo(0.5);
  expect(niceMax(106_707)).toBe(200_000);
  expect(niceMax(2073)).toBe(5000);
  expect(niceMax(1000)).toBe(1000);
});

test("niceMax answers 1 for nothing to scale", () => {
  expect(niceMax(0)).toBe(1);
  expect(niceMax(Number.NaN)).toBe(1);
});

test("barPct clamps and survives an empty axis", () => {
  expect(barPct(50, 200)).toBe(25);
  expect(barPct(300, 200)).toBe(100);
  expect(barPct(-5, 200)).toBe(0);
  expect(barPct(5, 0)).toBe(0);
});

test("maxOf skips nulls instead of counting them as zero", () => {
  expect(maxOf([null, 12, undefined, 7])).toBe(12);
  expect(maxOf([null, undefined])).toBe(0);
});
