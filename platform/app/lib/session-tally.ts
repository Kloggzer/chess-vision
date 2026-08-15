/**
 * What this sitting has done, counted in the units of CONCEPT.md 6.1 — in memory, since the page
 * loaded, never persisted: a session counter that survives a reload is a lie about one sitting.
 *
 * The count that was wrong before is `Bretter`: the old header counted written ROWS, so one board
 * with twelve flags read as "12".
 */
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

/**
 * `reviewed` rows are the confirmations ("the FEN was right"), corrections are the training rows;
 * of those, everything that is not `occluded` or `empty` is the identity work D2 says has not
 * moved in 2 758 rows.
 */
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
