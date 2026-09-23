/**
 * Order-preserving match of candidate SANs against the truth SANs.
 *
 * A line-by-line mirror of `src/chesslab/realgames/confirm.py:lcs_report` — including the tie-break
 * (`table[i+1][j] >= table[i][j+1]` advances TRUTH first), so a move committed out of order
 * counts as invented instead of quietly matching a later identical SAN backwards. The Python
 * CLI and this view report the same three numbers about the same file, or one of them is lying.
 */
export type LcsReport = {
  matched: [number, number][];
  invented: number[];
  missed: number[];
};

export function lcsReport(truth: string[], cand: string[]): LcsReport {
  const n = truth.length;
  const m = cand.length;
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] =
        truth[i] === cand[j]
          ? 1 + table[i + 1][j + 1]
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const matched: [number, number][] = [];
  const invented: number[] = [];
  const missed: number[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (truth[i] === cand[j]) {
      matched.push([i, j]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      missed.push(i++);
    } else {
      invented.push(j++);
    }
  }
  for (; i < n; i++) missed.push(i);
  for (; j < m; j++) invented.push(j);
  return { matched, invented, missed };
}

/** The plies the FEN timeline may trust: every matched one, plus the invented ones kept. */
export function reviewedPlies(
  moves: { ply: number }[],
  matched: [number, number][],
  kept: number[],
): number[] {
  const keep = new Set<number>([...matched.map(([, j]) => j), ...kept]);
  return [...keep].sort((a, b) => a - b).map((j) => Math.trunc(moves[j].ply));
}
