/** In-memory only: one board with twelve flags = one board, not twelve (fixed old header bug). */
import type { Correction, Ledger } from "@/lib/corrections";

export type Tally = {
  /** Distinct frames written to either ledger. */
  boards: Set<string>;
  cellsOccluded: number;
  cellsConfirmed: number;
  piecesCorrected: number;
};

export const emptyTally = (): Tally => ({
  boards: new Set(),
  cellsOccluded: 0,
  cellsConfirmed: 0,
  piecesCorrected: 0,
});

export function addRows(tally: Tally, rows: Correction[], ledger: Ledger): Tally {
  const next: Tally = { ...tally, boards: new Set(tally.boards) };
  for (const row of rows) {
    next.boards.add(row.frame);
    if (ledger === "reviewed") next.cellsConfirmed++;
    else if (row.label === "occluded") next.cellsOccluded++;
    else if (row.label !== "empty") next.piecesCorrected++;
  }
  return next;
}
