import { reviewOf, type Review } from "@/lib/label/review-cards";
import type { StreamGame } from "@/lib/label/zuege";
import {
  confirmedAgainst, listFrameStems, loadCandidate, readReference, readReferenceBytes, referenceDigest,
  type Candidate,
} from "@/lib/session-store/recordings";
import { referenceOrigin, type ReferenceOrigin } from "@/lib/session-store/reference";
import { badIntervals } from "@/lib/session-store/review-notes";
import { sessionId } from "@/lib/session-store/session";

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
    ...reviewOf({ moves: candidate.moves, truth, stems, startFen: candidate.start_fen }),
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
  const { cards, gallery } = reviewOf({ moves: candidate.moves, truth, stems, startFen: candidate.start_fen });
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
