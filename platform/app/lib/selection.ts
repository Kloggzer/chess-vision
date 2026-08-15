/** Flags are a selection now, not rows (fixed 2026-08-15). Pure — brush is client-side. */

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

/** ✗ button: flags off, brush strokes kept. Painted cells win over fill. */
export function planRejectAll(input: PlanInput): BoardPlan {
  const off: Labels = {};
  for (const square of Object.keys(input.proposals)) {
    if (input.base[square] !== undefined) off[square] = input.base[square];
  }
  return planBoard({ ...input, painted: { ...off, ...input.painted } });
}

/**
 * Flagged: `proposal ⇄ brush ⇄ base` (4.2.1) — the brush is IN the cycle, deduped, so a flag whose
 * brush repeats it stays the two-step toggle. Without it the `FEN unklar` lane, whose flag IS the
 * FEN's word, cycled `wQ ⇄ empty` and the one label it exists to write was unreachable by click.
 */
export function cycleNext(at: {
  current: string;
  proposal?: string;
  base: string;
  fen: string;
  brush: string;
}): string {
  const { current, proposal, base, fen, brush } = at;
  const other = proposal === undefined ? base : [base, fen, "empty"].find((l) => l !== proposal) ?? base;
  const order = [...new Set(proposal === undefined ? [fen, brush, "empty"] : [proposal, brush, other])];
  return order[(order.indexOf(current) + 1) % order.length];
}

/** The confirm button's promise, live: exactly what it commits, and how many flags it drops. */
export function confirmLabel(plan: BoardPlan): string {
  const n = plan.committed.length;
  const kinds = [...new Set(plan.committed.map((r) => r.label))];
  const as = kinds.length === 1 ? ` als ${kinds[0]}` : "";
  const off = plan.rejected.length > 0 ? ` · ${plan.rejected.length} Flags ab` : "";
  return `${n} ${n === 1 ? "Zelle" : "Zellen"}${as}${off} → nächstes Brett`;
}
