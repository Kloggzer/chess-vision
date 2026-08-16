/**
 * The proposal SCHEMA and the questions you can ask of it — pure, and deliberately free of
 * `node:fs`.
 *
 * Split out of `lib/proposals.ts` on 2026-08-09 because the filter bar is a client component and
 * imported one constant from it: a single value import drags the whole module, `node:fs/promises`
 * included, into the browser bundle, and Turbopack fails the page at runtime. Types are erased and
 * were harmless; the constant was not. Anything a client component needs belongs here.
 */
export type Proposal = {
  session_id: string;
  frame: string;
  square: string;
  fen_label: string;
  proposed: string;
  score: number;
  /** Pixel channel alone, present only when a model also scored the cell. */
  pixel_score?: number;
  /** The grid-groove hand read (0.35 = blur fringe, 0.5/0.7/0.85 = 2/3/4 missing edges). */
  grid_score?: number;
  /** The model's sparse per-class softmax (classes under 1 % omitted) — the filter's input. */
  probs?: Record<string, number>;
};

/** The one query that is not a class: the model's argmax contradicts the FEN label. */
export const DISAGREE = "disagree";

export type Filter = {
  /** A class name, or [DISAGREE]. */
  klass: string;
  min: number;
};

/** Cells a filter selects. `disagree` needs no threshold beyond the model's own confidence. */
export function matches(row: Proposal, f: Filter): boolean {
  // The occluded question is answered by EVERY channel the producer has, not only a model's
  // softmax: `score` is already the max of pixel, model and grid. Requiring `probs` here meant a
  // session proposed without --model answered "nothing" to "show me occlusion" — the filter that
  // could not be run at all (2026-08-10).
  if (f.klass === "occluded") return Math.max(row.score, row.probs?.occluded ?? 0) >= f.min;
  const probs = row.probs;
  if (!probs) return false;
  if (f.klass !== DISAGREE) return (probs[f.klass] ?? 0) >= f.min;
  const [top, p] = Object.entries(probs).reduce((a, b) => (b[1] > a[1] ? b : a), ["", 0]);
  return p >= f.min && top !== row.fen_label && top !== "occluded";
}

/** The model's own verdict for a cell: its best class and how sure it is. */
export function topRead(row: Proposal): { label: string; p: number } | null {
  const probs = row.probs;
  if (!probs) return null;
  const [label, p] = Object.entries(probs).reduce((a, b) => (b[1] > a[1] ? b : a), ["", 0]);
  return label ? { label, p } : null;
}

/**
 * What "yes, correct" WRITES for a matched cell — only the query knows what it asked.
 *
 * A threshold query is answered by its own class: "occluded >= 0.5" means the human confirms
 * OCCLUDED, even where the model's argmax is something else, because a threshold question is not
 * an argmax question. The disagree query has no class of its own, so there the answer is the
 * model's top read, and a cell with no reading at all cannot be confirmed.
 */
export function acceptLabel(row: Proposal, f: Filter): string | null {
  if (f.klass !== DISAGREE) return f.klass;
  return topRead(row)?.label ?? null;
}

/** The BOARDS a filter hits: one entry per frame, with the cells that matched on it. */
export function framesMatching(rows: Proposal[], f: Filter): { stem: string; cells: Proposal[] }[] {
  const byFrame = new Map<string, Proposal[]>();
  for (const row of rows) {
    if (!matches(row, f)) continue;
    const list = byFrame.get(row.frame);
    if (list) list.push(row);
    else byFrame.set(row.frame, [row]);
  }
  return [...byFrame.entries()]
    .map(([stem, cells]) => ({ stem, cells }))
    .sort((a, b) => b.cells.length - a.cells.length || a.stem.localeCompare(b.stem));
}

/** Every class the model actually emitted, so the filter offers real options only. */
export function classesSeen(rows: Proposal[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) for (const k of Object.keys(row.probs ?? {})) seen.add(k);
  return [...seen].sort();
}

export function proposalKey(p: { frame: string; square: string }): string {
  return `${p.frame}|${p.square}`;
}

/** The thresholds a human actually asks for — 0.05 is the "show me anything at all" end. */
export const STEPS = [0.05, 0.1, 0.25, 0.5, 0.75, 0.9];

/**
 * What `Klassenwand` asks before anyone touches it. The sharpest end first: 11 091 cells over the
 * corpus against 52 285 at 0.1, and a confident contradiction is the likeliest real label error
 * (Northcutt 2021). Every wider question is one click away in the lane head.
 */
export const DEFAULT_WALL: Filter = { klass: DISAGREE, min: 0.9 };

/**
 * The `Klassenwand` predicate (CONCEPT.md 4.2): one class ≥ `min` WHERE THE FEN SAYS OTHERWISE —
 * `matches` alone answers "P(bQ) ≥ 0.5" on the cells the FEN already calls bQ too, a wall of
 * agreement that asks no labeling question. [DISAGREE] carries its contradiction itself.
 */
export function contradicts(row: Proposal, f: Filter): boolean {
  return matches(row, f) && (f.klass === DISAGREE || f.klass !== row.fen_label);
}

/** How a query reads in a chip or a header — a lane prints its question, never a bare number. */
export const queryText = (f: Filter): string =>
  f.klass === DISAGREE ? `Modell ≠ FEN ab ${f.min}` : `${f.klass} ≥ ${f.min}`;

/** One BOARD of an answer: cell keys and the two words per cell, never the rows behind them. */
export type QueryHit = {
  session: string;
  stem: string;
  squares: string[];
  reads: Record<string, string>;
  /** What agreeing with the query writes here (`acceptLabel`) — the server decides, not the page. */
  accept: Record<string, string>;
};

export type QueryAnswer = {
  classes: string[];
  filter: Filter;
  phase: string;
  hits: QueryHit[];
  cells: number;
  /** Server milliseconds of the scan, printed in the lane head — it reads 309 k rows and says so. */
  ms: number;
};
