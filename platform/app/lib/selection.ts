/**
 * What a flagged board WRITES, derived from what is painted on it.
 *
 * The confirm button used to commit the FLAGS instead of the selection: twelve proposals wrote
 * twelve rows even when the human wanted three ("ich will nur die Reihe unten rechts markieren,
 * kann aber dann nicht die 3 committen", 2026-08-15). Flags are a SELECTION now, and this says
 * what the selection means. Pure — the brush is a client component.
 */

export type Labels = Record<string, string>;
export type Row = { square: string; label: string };

export type PlanInput = {
  squares: readonly string[];
  /** `{square: label}` the filter flagged — pre-selected, individually answerable. */
  proposals: Labels;
  /** What the human painted this session, per square. Paint beats the flag. */
  painted: Labels;
  /** The FEN's word, or the correction already on file at page load — where a flag off lands. */
  base: Labels;
  /** `base` plus what this session already wrote — nothing here needs writing again. */
  onFile: Labels;
};

export type BoardPlan = {
  /** What each square SHOWS: paint over flag over what is on file. */
  labels: Labels;
  /** Flags still carrying their proposed label — the ones confirm commits. */
  selected: string[];
  /** Flags taken off with nothing to correct — the review ledger's rows. */
  rejected: string[];
  /** Every square whose answer differs from what is on file: `corrections.jsonl`. */
  corrections: Row[];
  /** The subset of [corrections] the human actually painted — what flushes on navigate-away. */
  paintRows: Row[];
  /** Corrections plus the flags that need no row — the honest count on the confirm button. */
  committed: Row[];
};

/**
 * One pass over the board. A flag is `selected` while it shows its proposed label, `rejected`
 * once it is back on the label the file already holds — those two are the toggle, and a flag
 * repainted to some THIRD label is neither: its correction row is the record.
 */
export function planBoard(input: PlanInput): BoardPlan {
  const { squares, proposals, painted, base, onFile } = input;
  const labels: Labels = {};
  const selected: string[] = [];
  const rejected: string[] = [];
  const corrections: Row[] = [];
  const paintRows: Row[] = [];
  const keep = new Set<string>();

  for (const square of squares) {
    const fallback = base[square];
    const proposal = proposals[square];
    const label = painted[square] ?? proposal ?? fallback;
    labels[square] = label;

    const differs = label !== (onFile[square] ?? fallback);
    if (differs) {
      corrections.push({ square, label });
      keep.add(square);
      if (painted[square] !== undefined) paintRows.push({ square, label });
    }
    if (proposal === undefined) continue;
    if (label === proposal) {
      selected.push(square);
      keep.add(square);
    } else if (label === fallback && !differs) rejected.push(square);
  }

  const committed = squares.filter((sq) => keep.has(sq)).map((sq) => ({ square: sq, label: labels[sq] }));
  return { labels, selected, rejected, corrections, paintRows, committed };
}

/**
 * Every flag off, every brush stroke kept — the ✗ button's plan ("nichts verdeckt, FEN stimmt").
 * Painted cells win over the fill, so a board that was worked on still writes its corrections.
 */
export function planRejectAll(input: PlanInput): BoardPlan {
  const off: Labels = {};
  for (const square of Object.keys(input.proposals)) {
    if (input.base[square] !== undefined) off[square] = input.base[square];
  }
  return planBoard({ ...input, painted: { ...off, ...input.painted } });
}

/**
 * The label one click lands on. A flagged cell answers the FLAG first — proposal, then the word
 * on file, then the FEN's own — so taking a flag off is one click even where the file already
 * holds the proposed label and the two lead entries dedup into one. Unflagged cells keep the old
 * three-step cycle: what the FEN says, what the brush holds, empty.
 */
export function cycleNext(at: {
  current: string;
  proposal?: string;
  base: string;
  fen: string;
  brush: string;
}): string {
  const { current, proposal, base, fen, brush } = at;
  const order = [...new Set(proposal ? [proposal, base, fen, brush, "empty"] : [fen, brush, "empty"])];
  return order[(order.indexOf(current) + 1) % order.length];
}

/** The confirm button's promise, live: exactly what it commits, and how many flags it drops. */
export function confirmLabel(plan: BoardPlan): string {
  const n = plan.committed.length;
  const kinds = [...new Set(plan.committed.map((r) => r.label))];
  const as = kinds.length === 1 ? ` as ${kinds[0]}` : "";
  const off = plan.rejected.length > 0 ? ` · ${plan.rejected.length} flags off` : "";
  return `confirm ${n} ${n === 1 ? "cell" : "cells"}${as}${off} → next board`;
}
