/**
 * Gemessen 2026-09-17: `VID_20260802_222203` traegt Laeufer und Springer auf b8/c8 vertauscht,
 * `2026-08-08-11-59-12` dasselbe auf f1/g1. Die Korrekturen lagen seit dem 2026-08-19 auf der
 * Platte — und trotzdem schrieb die Lane auf ANDEREN Frames derselben Felder 65-mal das
 * FEN-Wort, weil der Schutz je ZELLE greift und der Tausch am FELD haengt.
 */
import { expect, test } from "vitest";

import { standingSquares } from "@/lib/setup-swap";

/** Wie `decided` in der Lane: `stem|square` -> was der Mensch dort entschieden hat. */
const swapped: Record<string, string> = Object.fromEntries(
  ["000291", "000306", "000318", "000333", "000345", "000360"].flatMap((stem) => [
    [`${stem}|b8`, "bB"],
    [`${stem}|c8`, "bN"],
  ]),
);

test("ein Feld, das die Aufnahme durchgehend anders nennt, steht auf diesem Wort", () => {
  const standing = standingSquares(swapped);

  expect(standing.get("b8")).toEqual({ label: "bB", n: 6 });
  expect(standing.get("c8")).toEqual({ label: "bN", n: 6 });
});

test("eine einzelne Korrektur macht noch kein Feld aus", () => {
  expect(standingSquares({ "000291|e4": "empty" }).has("e4")).toBe(false);
});

test("ein uneiniges Feld steht auf gar nichts — das ist strittig, nicht getauscht", () => {
  const split = Object.fromEntries(
    ["000291", "000306", "000318", "000333", "000345", "000360"].map((stem, i) => [
      `${stem}|d4`,
      i % 2 === 0 ? "wP" : "empty",
    ]),
  );

  expect(standingSquares(split).has("d4")).toBe(false);
});

test("`empty` zaehlt nicht als Aufbau — eine Hand raeumt das Feld, sie tauscht es nicht", () => {
  const hands = Object.fromEntries(
    ["000291", "000306", "000318", "000333", "000345", "000360"].map((stem) => [
      `${stem}|g5`,
      "empty",
    ]),
  );

  expect(standingSquares(hands).has("g5")).toBe(false);
});
