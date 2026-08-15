import { expect, test } from "vitest";
import { addRows, emptyTally } from "@/lib/session-tally";

const row = (frame: string, square: string, label: string) => ({
  session_id: "rg-g",
  frame,
  square,
  label,
});

test("one board with twelve flags is ONE board, not twelve", () => {
  // The counter this replaces read written ROWS (`streams.tsx:35`), so a single hand read as 12.
  const rows = Array.from({ length: 12 }, (_, i) => row("000100", `a${(i % 8) + 1}`, "occluded"));
  const tally = addRows(emptyTally(), rows, "corrections");
  expect(tally.boards.size).toBe(1);
  expect(tally.cellsOccluded).toBe(12);
});

test("the three cell counters split by ledger and by label", () => {
  let tally = addRows(emptyTally(), [row("000100", "e4", "occluded"), row("000100", "e5", "wQ")], "corrections");
  tally = addRows(tally, [row("000200", "a1", "empty")], "corrections");
  tally = addRows(tally, [row("000200", "a2", "wR")], "reviewed");

  expect(tally.boards.size).toBe(2);
  expect(tally.cellsOccluded).toBe(1);
  expect(tally.cellsConfirmed).toBe(1); // the reviewed row, whatever its label
  expect(tally.piecesCorrected).toBe(1); // wQ; `empty` is neither a piece nor occlusion
});

test("adding rows never edits the tally it was given", () => {
  const first = addRows(emptyTally(), [row("000100", "e4", "occluded")], "corrections");
  addRows(first, [row("000200", "e4", "occluded")], "corrections");
  expect(first.boards.size).toBe(1);
});
