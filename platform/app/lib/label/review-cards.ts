/** One card per frame (not ply); plies on same frame collapse with shared picture. Wire: index stays intact. */
import { Chess } from "chess.js";

import { lcsReport, type LcsReport } from "@/lib/lcs";
import type { FrameStem } from "@/lib/session-store/recordings";

export type MoveSquares = { from: string; to: string };

export type ReviewMove = {
  ply: number;
  san: string;
  frame: number;
  /** Retime's cleanest held frame — the picture; `frame` stays the label frame the position entered on. */
  frame_review?: number;
  /** Cells still covered on that picture: over 0 the whole hold carried a hand. */
  review_covered?: number;
  decider?: string;
  fen_after?: string;
};

type ReviewPly = {
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
  /**
   * The picture the move STARTED from — the frame nearest the previous commit, where that position
   * has settled. "Shows the photo the position AFTER this move?" is unanswerable without it, and
   * the card's own window reaches only 2 frames back, which is still mid-move (User, 2026-08-17).
   */
  before: FrameStem | null;
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
  /** Cells covered on the card's own picture — the best the hold had, 0 when the hand was gone. */
  covered: number | null;
  /** Frames from this commit to the next one; null for the last. Under [SHORT_HOLD] the position
   *  never stood still — the phone committed late and the picture shows a later move (16-20-19, ply 7). */
  held: number | null;
};

/** A hand needs about a second to make a move; a shorter hold is a commit that lagged reality. */
export const SHORT_HOLD = 15;

/** How far a retimed card's own frames reach around its picture — `retime.REVIEW_CONTEXT` plus one. */
const REVIEW_SPREAD = 3;

function moveSquares(
  fenBefore: string | undefined,
  san: string,
): MoveSquares | null {
  if (!fenBefore) return null;
  try {
    const chess = new Chess(fenBefore);
    const move = chess.move(san);
    return { from: move.from, to: move.to };
  } catch {
    return null;
  }
}

/** Matched plies as read-only entries: same grouping/windows, but no verdict. */
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

function ownsFrames(moves: ReviewMove[], i: number): boolean {
  const next = moves[i + 1];
  return next === undefined || next.frame > moves[i].frame;
}

function groupByFrame(moves: ReviewMove[], indices: number[]): number[][] {
  const out: number[][] = [];
  for (const index of indices) {
    const run = out.at(-1);
    const prev = run?.at(-1);
    if (run && prev === index - 1 && moves[prev].frame === moves[index].frame)
      run.push(index);
    else out.push([index]);
  }
  return out;
}

/** The frame on disk closest to [at] — the review set is sparse, so an exact index rarely exists. */
function nearestStem(stems: FrameStem[], at: number): FrameStem | null {
  return stems.reduce<FrameStem | null>(
    (best, s) =>
      best === null ||
      Math.abs(Number(s.stem) - at) < Math.abs(Number(best.stem) - at)
        ? s
        : best,
    null,
  );
}

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
  // The previous group's commit, carried across the map: that is where the position this card's
  // move started from is standing still.
  let settledAt: number | null = null;
  return groupByFrame(moves, indices).map((members) => {
    const frame = moves[members[0]].frame;
    const picture = moves[members[0]].frame_review ?? frame;
    const before = nearestStem(
      stems,
      settledAt ?? Number(stems[0]?.stem ?? frame),
    );
    const previous = settledAt;
    settledAt = picture;
    let last = members[members.length - 1];
    while (moves[last + 1]?.frame === frame) last++;
    const next = moves[last + 1]?.frame ?? null;
    const until = next ?? frame + 90;
    // A retimed ply owns exactly the frames written around its picture; the phone-timed branch
    // reaches back to the previous commit because that is where its evidence lies, and dragging
    // that reach into a retimed set showed the PREVIOUS position (docs/retime.md).
    const window = moves[members[0]].frame_review
      ? stems.filter((s) => Math.abs(Number(s.stem) - picture) <= REVIEW_SPREAD)
      : stems.filter((s) => {
          const n = Number(s.stem);
          return n > (previous ?? -1) && n < Math.max(until, picture + 3);
        });
    const start = window.reduce(
      (best, s, i) =>
        Math.abs(Number(s.stem) - picture) <
        Math.abs(Number(window[best].stem) - picture)
          ? i
          : best,
      0,
    );
    const plies: ReviewPly[] = members.map((index) => ({
      index,
      ply: moves[index].ply,
      san: moves[index].san,
      squares: moveSquares(
        index === 0 ? startFen : moves[index - 1].fen_after,
        moves[index].san,
      ),
    }));
    const owning = members.filter((i) => ownsFrames(moves, i));
    const deciders = new Set(members.map((i) => moves[i].decider ?? null));
    return {
      id: members[0],
      plies,
      frame,
      stems: window,
      start,
      before: before && Number(before.stem) < frame ? before : null,
      keep: owning.length > 0 ? owning : members,
      group: moves.filter((m) => m.frame === frame).map((m) => m.san),
      carriesFrames: owning.length > 0,
      collapsed:
        plies.length === 1 &&
        plies[0].squares === null &&
        ["cnn_pair", "cnn_recovery"].includes(moves[members[0]].decider ?? ""),
      decider: deciders.size === 1 ? (moves[members[0]].decider ?? null) : null,
      duplicate: members.some((i) => missedSans.has(moves[i].san)),
      covered: moves[members[0]].review_covered ?? null,
      held: next === null ? null : next - frame,
    };
  });
}

export type Review = LcsReport & { cards: ReviewCard[]; gallery: ReviewCard[] };

/** LCS gegen die Wahrheit, daraus Karten und Galerie — `/confirm` und der ZUEGE-Strom bauen sie
 *  gleich (CONCEPT.md §10.3). Ohne Wahrheit ist JEDER Halbzug des Menschen, nichts fehlt. */
export function reviewOf({ moves, truth, stems, startFen }: {
  moves: ReviewMove[];
  truth: string[] | null;
  stems: FrameStem[];
  startFen?: string;
}): Review {
  const { matched, invented, missed } = truth
    ? lcsReport(truth, moves.map((m) => m.san))
    : { matched: [] as [number, number][], invented: moves.map((_, i) => i), missed: [] };
  const missedSans = new Set(missed.map((i) => truth?.[i] ?? ""));
  return {
    matched, invented, missed,
    cards: buildReviewCards({ moves, indices: invented, stems, startFen, missedSans }),
    gallery: buildGalleryCards({ moves, matched, stems, startFen }),
  };
}
