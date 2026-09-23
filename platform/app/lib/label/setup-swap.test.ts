/** 2026-09-17: ein Aufbau-Tausch (b8/c8) haengt am FELD; der Zellschutz liess die Lane 65-mal das FEN-Wort schreiben. */
import { expect, test } from "vitest";
import { standingSquares } from "@/lib/label/setup-swap";

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
