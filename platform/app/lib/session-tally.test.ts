import { expect, test } from "vitest";
import { addRows, emptyTally } from "@/lib/session-tally";

const row = (frame: string, square: string, label: string) => ({
  session_id: "rg-g",
  frame,
  square,
  label,
});

test("one board with twelve flags is ONE board, not twelve", () => {
  const rows = Array.from({ length: 12 }, (_, i) => row("000100", `a${(i % 8) + 1}`, "wP"));
  const tally = addRows(emptyTally(), rows, "corrections");
  expect(tally.boards.size).toBe(1);
  expect(tally.piecesCorrected).toBe(12);
});

test("the cell counters split by ledger and by label", () => {
  let tally = addRows(emptyTally(), [row("000100", "e5", "wQ")], "corrections");
  tally = addRows(tally, [row("000200", "a1", "empty")], "corrections");
  tally = addRows(tally, [row("000200", "a2", "wR")], "reviewed");

  expect(tally.boards.size).toBe(2);
  expect(tally.cellsConfirmed).toBe(1); // the reviewed row, whatever its label
  expect(tally.piecesCorrected).toBe(1); // wQ; `empty` is not a piece
});

test("adding rows never edits the tally it was given", () => {
  const first = addRows(emptyTally(), [row("000100", "e4", "wP")], "corrections");
  addRows(first, [row("000200", "e4", "wP")], "corrections");
  expect(first.boards.size).toBe(1);
});
