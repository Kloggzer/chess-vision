import { buildGalleryCards, buildReviewCards, type Review, type ReviewMove } from "@/lib/label/review-cards";
import { lcsReport, moveSquares, type MoveSquares } from "@/lib/py/ops";
import type { StreamGame } from "@/lib/label/zuege";
import {
  confirmedAgainst, listFrameStems, loadCandidate, readReference, readReferenceBytes, referenceDigest,
  type Candidate, type FrameStem,
} from "@/lib/session-store/recordings";
import { referenceOrigin, type ReferenceOrigin } from "@/lib/session-store/reference";
import { badIntervals } from "@/lib/session-store/review-notes";
import { sessionId } from "@/lib/session-store/session";

/** Die Pfeilfelder JEDES Halbzugs, aus der Kette des Trackers selbst (`fen_after` des vorigen) —
 *  python-chess im Worker, dieselbe Lesart wie `realgames confirm`. */
export function squaresOf(moves: ReviewMove[], startFen?: string): Promise<(MoveSquares | null)[]> {
  return moveSquares(moves.map((m, i) => [(i === 0 ? startFen : moves[i - 1].fen_after) ?? null, m.san]));
}

/** LCS gegen die Wahrheit, daraus Karten und Galerie — `/confirm` und der ZUEGE-Strom bauen sie
 *  gleich (CONCEPT.md §10.3). Ohne Wahrheit ist JEDER Halbzug des Menschen, nichts fehlt. */
async function reviewOf({ moves, truth, stems, startFen }: {
  moves: ReviewMove[];
  truth: string[] | null;
  stems: FrameStem[];
  startFen?: string;
}): Promise<Review> {
  const [{ matched, invented, missed }, squares] = await Promise.all([
    truth
      ? lcsReport(truth, moves.map((m) => m.san))
      : { matched: [] as [number, number][], invented: moves.map((_, i) => i), missed: [] },
    squaresOf(moves, startFen),
  ]);
  const missedSans = new Set(missed.map((i) => truth?.[i] ?? ""));
  return {
    matched, invented, missed,
    cards: buildReviewCards({ moves, indices: invented, stems, squares, missedSans }),
    gallery: buildGalleryCards({ moves, matched, stems, squares }),
  };
}

export type ConfirmRead = Review & {
  reference: Awaited<ReturnType<typeof readReference>>;
  origin: ReferenceOrigin;
  truth: string[] | null;
  /** Der Text fuer den Editor — gelesen NACH Referenz und Herkunft, ein Lesefehler wirft. */
  referenceText: string;
  referenceMd5: string | null;
  against: ReturnType<typeof confirmedAgainst> | null;
};

/** `/confirm/<name>` fuer eine Aufnahme MIT `candidate.json`. Die Wahrheit ist die Referenz, auch
 *  die des Handys — die Seite sagt das mit dem Chip, der Strom verwirft sie (`streamGame`). */
export async function confirmReview(name: string, candidate: Candidate): Promise<ConfirmRead> {
  const [reference, origin] = await Promise.all([readReference(name), referenceOrigin(name)]);
  const referenceBytes = await readReferenceBytes(name);
  const referenceMd5 = referenceBytes === null ? null : referenceDigest(referenceBytes);
  const truth = reference?.sans ?? null;
  // Every stem on disk once, then per card the window [commit-2, next commit) — the frames that can
  // show the position AFTER this ply (`lib/label/review-cards.ts`).
  const stems = await listFrameStems(name);
  return {
    ...(await reviewOf({ moves: candidate.moves, truth, stems, startFen: candidate.start_fen })),
    reference,
    origin,
    truth,
    referenceText: referenceBytes?.toString("utf8") ?? "",
    referenceMd5,
    against: candidate.confirmed ? confirmedAgainst(candidate, referenceMd5) : null,
  };
}

/** One pending game, read exactly as `/confirm/<name>` reads it: same LCS, same windows, same wire
 *  (CONCEPT.md §10.3). The phone's own PGN is the candidate's own record, so it proves nothing. */
export async function streamGame(row: { name: string; title: string | null }): Promise<StreamGame> {
  const candidate = await loadCandidate(row.name);
  const [reference, origin] = await Promise.all([readReference(row.name), referenceOrigin(row.name)]);
  const truth = origin === "phone" ? null : (reference?.sans ?? null);
  const stems = await listFrameStems(row.name);
  const { cards, gallery } = await reviewOf({ moves: candidate.moves, truth, stems, startFen: candidate.start_fen });
  return {
    name: row.name,
    title: row.title,
    sessionId: sessionId(row.name),
    plies: candidate.moves.length,
    cards,
    gallery,
    noted: [...(await badIntervals(sessionId(row.name)))],
    reference: origin,
    referenceProblem: reference?.problem ?? null,
  };
}
