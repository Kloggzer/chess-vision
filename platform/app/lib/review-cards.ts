/**
 * The confirm page's review cards — ONE card per commit frame, not per ply.
 *
 * A recovery bridge or a pair lands several plies on ONE frame. Rendered per ply that produced N
 * cards showing the SAME picture, and that picture is the position after the WHOLE sequence: the
 * card titled "ply 1 e5" asked a human to vouch for a board that already contained ply 2. There
 * is exactly one thing a human can answer at such a frame — does the END position match? — so
 * the plies sharing a frame become one card with one series and one verdict.
 *
 * The wire stays as it was: the client posts INDICES into the candidate's move list and
 * `writeConfirmation` turns them into `reviewed_plies`. A card keeps the index that owns an
 * interval (`realgames.known_segments` skips every ply whose next commit is on its own frame, so
 * the in-between plies carry no frames either way and are dropped exactly as before).
 *
 * Pure — no filesystem, so the client component may import its types.
 */
import { Chess } from "chess.js";

import type { FrameStem } from "@/lib/data";

export type MoveSquares = { from: string; to: string };

export type ReviewMove = {
  ply: number;
  san: string;
  frame: number;
  decider?: string;
  fen_after?: string;
};

export type ReviewPly = {
  /** Index into the candidate's move list — the identity `kept` names on the wire. */
  index: number;
  ply: number;
  san: string;
  squares: MoveSquares | null;
};

export type ReviewCard = {
  /** Stable key: the first candidate index the card decides. */
  id: number;
  /** The plies this card decides, chronological. More than one = a multi-commit. */
  plies: ReviewPly[];
  frame: number;
  /** The review frames on disk between this commit and the next, chronological. */
  stems: FrameStem[];
  /** Index into [stems] nearest the commit — where the card opens. */
  start: number;
  /** Indices posted as `kept` when the human says the picture matches. */
  keep: number[];
  /** SANs of EVERY ply committed on this frame, including ones the LCS already matched. */
  group: string[];
  /** False when no ply of this card owns an interval — keeping it exports no frames. */
  carriesFrames: boolean;
  /** Pre-fix pair row: ONE entry holding several halves — the picture shows the position after ALL. */
  collapsed: boolean;
  /** How the tracker decided these plies, when they agree — `cnn_recovery` means committed LATE. */
  decider: string | null;
  /** At least one of the plies also appears as missing from the reference. */
  duplicate: boolean;
};

/**
 * From/to squares of a SAN, replayed from the TRACKER's own position chain (the ply may be
 * illegal against the reference game, but it was legal against the tracker's board).
 */
export function moveSquares(fenBefore: string | undefined, san: string): MoveSquares | null {
  if (!fenBefore) return null;
  try {
    const chess = new Chess(fenBefore);
    const move = chess.move(san);
    return { from: move.from, to: move.to };
  } catch {
    return null;
  }
}

/**
 * The MATCHED plies as viewing entries — same grouping, same windows, no verdict.
 *
 * A reference game vouches for the MOVES, not for the pictures: a hand, a slipped crop or a dark
 * frame ruins an interval the LCS happily calls matched. So the confirm page shows those series
 * too, read-only — the human eyeballs them, the wire stays untouched.
 */
export function buildGalleryCards({
  moves,
  matched,
  stems,
  startFen,
}: {
  moves: ReviewMove[];
  /** `lcsReport().matched` — `[truth index, candidate index]`. */
  matched: [number, number][];
  stems: FrameStem[];
  startFen?: string;
}): ReviewCard[] {
  const indices = matched.map(([, j]) => j).sort((a, b) => a - b);
  return buildReviewCards({ moves, indices, stems, startFen });
}

/**
 * A ply owns an interval when the NEXT commit is on a later frame — the same rule
 * `realgames.known_segments` applies (`end <= start` contributes nothing, and the last move of
 * the file has no end at all).
 */
function ownsFrames(moves: ReviewMove[], i: number): boolean {
  const next = moves[i + 1];
  return next !== undefined && next.frame > moves[i].frame;
}

/** Runs of CONSECUTIVE reviewable indices that share a commit frame — frame equality is the key,
 *  the recovery stamp in a row's reason is only a hint. */
function groupByFrame(moves: ReviewMove[], indices: number[]): number[][] {
  const out: number[][] = [];
  for (const index of indices) {
    const run = out.at(-1);
    const prev = run?.at(-1);
    if (run && prev === index - 1 && moves[prev].frame === moves[index].frame) run.push(index);
    else out.push([index]);
  }
  return out;
}

/**
 * One card per commit frame under review.
 *
 * `indices` are the plies the human must judge (the LCS's invented set, or all of them when the
 * game has no reference). The window runs from two frames before the commit to the next commit
 * AFTER the whole same-frame run, so a collapsed card shows the one series that exists instead of
 * N copies of it.
 */
export function buildReviewCards({
  moves,
  indices,
  stems,
  startFen,
  missedSans = new Set<string>(),
}: {
  moves: ReviewMove[];
  indices: number[];
  stems: FrameStem[];
  startFen?: string;
  missedSans?: ReadonlySet<string>;
}): ReviewCard[] {
  return groupByFrame(moves, indices).map((members) => {
    const frame = moves[members[0]].frame;
    // The window closes at the next commit after the FULL same-frame run — plies the LCS already
    // matched sit on that frame too, and they do not shorten what the human gets to look at.
    let last = members[members.length - 1];
    while (moves[last + 1]?.frame === frame) last++;
    const until = moves[last + 1]?.frame ?? frame + 90;
    const window = stems.filter((s) => {
      const n = Number(s.stem);
      return n >= frame - 2 && n < Math.max(until, frame + 3);
    });
    // Start on the stem nearest the commit — the old single-frame behaviour, now a position.
    const start = window.reduce(
      (best, s, i) =>
        Math.abs(Number(s.stem) - frame) < Math.abs(Number(window[best].stem) - frame) ? i : best,
      0,
    );
    const plies: ReviewPly[] = members.map((index) => ({
      index,
      ply: moves[index].ply,
      san: moves[index].san,
      squares: moveSquares(index === 0 ? startFen : moves[index - 1].fen_after, moves[index].san),
    }));
    const owning = members.filter((i) => ownsFrames(moves, i));
    const deciders = new Set(members.map((i) => moves[i].decider ?? null));
    return {
      id: members[0],
      plies,
      frame,
      stems: window,
      start,
      // Nothing of this card owns an interval (its frame-mate was matched, or the file ends
      // here): keeping it exports nothing, so post the plies themselves and stay wire-identical
      // to the per-ply cards this replaced.
      keep: owning.length > 0 ? owning : members,
      group: moves.filter((m) => m.frame === frame).map((m) => m.san),
      carriesFrames: owning.length > 0,
      // Multi-half commits, both eras. Since the pair fix a group is SEVERAL rows on one frame;
      // before it a pair was ONE row whose san cannot be replayed from the previous fen (the
      // collapsed halves) — `moveSquares` failing on a pair/recovery decider is that signature.
      collapsed:
        plies.length === 1 &&
        plies[0].squares === null &&
        ["cnn_pair", "cnn_recovery"].includes(moves[members[0]].decider ?? ""),
      decider: deciders.size === 1 ? (moves[members[0]].decider ?? null) : null,
      duplicate: members.some((i) => missedSans.has(moves[i].san)),
    };
  });
}
