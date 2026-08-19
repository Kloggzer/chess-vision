import { expect, test } from "vitest";
import { dirtyOnPage, dirtyRows, frameKey } from "@/lib/dirty-frames";

/** Eine Seite der Zell-Lane, wie sie Frames mischt: dasselbe Frame in mehreren Feldern. */
const page = [
  { session: 0, stem: "006186", square: "c1" },
  { session: 0, stem: "006186", square: "a1" },
  { session: 0, stem: "006512", square: "c1" },
  { session: 1, stem: "006186", square: "c1" },
  { session: 0, stem: "006186", square: "h8" },
];

test("eine Marke gilt dem Frame — jede Geschwisterkarte leuchtet mit, fremde nicht", () => {
  const reported = new Set([frameKey(page[0])]);
  expect(dirtyOnPage(page, reported)).toEqual(new Set([0, 1, 4]));
  // Gleicher Stem, andere Session ist ein ANDERES Frame — der Schlüssel ist das Paar.
  expect(dirtyOnPage(page, new Set([frameKey(page[3])]))).toEqual(new Set([3]));
  expect(dirtyOnPage(page, new Set<string>())).toEqual(new Set());
});

test("der Klick schreibt EINE dirty-frame-Zeile für das Frame, ohne Feld", () => {
  const rows = dirtyRows("rg-2026-08-16-20-41-33", "006186", "Labeln-Strom: Crop-Ecke");
  expect(rows).toEqual([
    {
      session_id: "rg-2026-08-16-20-41-33",
      frame: "006186",
      verdict: "dirty-frame",
      reason: "Labeln-Strom: Crop-Ecke",
    },
  ]);
  expect(JSON.stringify(rows[0])).not.toContain("square");
});
