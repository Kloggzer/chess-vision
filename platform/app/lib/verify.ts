/**
 * The matte review's read model: every frame that HAS an alpha, with the two things a human
 * answers about it — is the alpha right, is the interval's FEN what the board shows. Nothing is
 * labelled occluded here: `matte.jsonl` carries the number, this asks whether to believe it.
 */
import { judgedKeys } from "@/lib/corrections";
import { liveGames } from "@/lib/label-stream";
import { coveredSquares } from "@/lib/classes";
import { type AlphaState, alphaState, fixedAlphas, loadMatte, matteStamp } from "@/lib/matte";
import { badIntervals, frameReviews, unusableBoards, type FrameReview } from "@/lib/review-notes";
import { loadSession, sessionId } from "@/lib/session";

/** One page of work. The alpha is a full board raster per frame, so the list stays bounded. */
export const VERIFY_PAGE = 200;

export type VerifySession = { name: string; sessionId: string };

export type VerifyFrame = {
  session: number;
  stem: string;
  ply: number;
  fen: string;
  /** `dirty_reason` of the log row the alpha was cut for. */
  reason?: string;
  coverage: Record<string, number>;
  /** Squares past `PIECE_VISIBLE_MAX` — the ones the piece loss drops on its own. */
  covered: string[];
  concepts: Record<string, number>;
  review: FrameReview;
  /** The human already called this interval's FEN uncertain (`bad-interval`). */
  intervalFlagged: boolean;
  /** Whose alpha `coverage` came from — `pending` means a correction the recut has not read. */
  alpha: AlphaState;
};

export type VerifyStream = {
  sessions: VerifySession[];
  frames: VerifyFrame[];
  /** Per session, `stem|square -> label` from both ledgers — what the board must not re-ask. */
  decided: Record<string, string>[];
  /** Corpus-wide, never page-bounded: alphas, those already judged, and those still open. */
  progress: { frames: number; done: number; open: number };
};

export async function loadVerifyStream(): Promise<VerifyStream> {
  const sessions: VerifySession[] = [];
  const frames: VerifyFrame[] = [];
  const decided: Record<string, string>[] = [];
  let total = 0;
  let done = 0;
  let open = 0;

  for (const name of await liveGames()) {
    const matte = await loadMatte(name);
    if (matte.size === 0) continue;
    let session;
    try {
      session = await loadSession(name);
    } catch {
      continue; // no exported log — nothing to put the alpha against
    }
    const id = sessionId(name);
    const [judged, unusable, reviews, bad, fixed, recutAt] = await Promise.all([
      judgedKeys(name),
      unusableBoards(id),
      frameReviews(id),
      badIntervals(id),
      fixedAlphas(name),
      matteStamp(name),
    ]);

    const index = sessions.length;
    const mine: VerifyFrame[] = [];
    for (const row of session.rows) {
      const alpha = matte.get(row.stem);
      if (!alpha || alpha.skipped || unusable.has(row.stem)) continue;
      total += 1;
      const review = reviews.get(row.stem) ?? {};
      if (review.matte !== undefined) done += 1;
      if (review.matte !== undefined && review.position !== undefined) continue;
      mine.push({
        session: index,
        stem: row.stem,
        ply: row.ply,
        fen: row.fen,
        reason: alpha.reason ?? row.dirtyReason,
        coverage: alpha.coverage,
        covered: coveredSquares(alpha.coverage),
        concepts: alpha.concepts,
        review,
        intervalFlagged: bad.has(row.ply),
        alpha: alphaState(alpha, fixed.get(row.stem), recutAt),
      });
    }
    open += mine.length;
    // Counting runs over EVERY session, only the page stops at VERIFY_PAGE. The break used to sit
    // in this loop, so "357/560 · 64 %" was the progress of whatever fitted on page one — measured
    // 2026-08-19 the corpus held 1292 alphas, and the headline claimed 64 % where it was 28 %.
    if (mine.length === 0 || frames.length >= VERIFY_PAGE) continue;
    sessions.push({ name, sessionId: id });
    frames.push(...mine.slice(0, Math.max(0, VERIFY_PAGE - frames.length)));
    const stems = new Set(mine.map((f) => f.stem));
    decided.push(Object.fromEntries([...judged].filter(([key]) => stems.has(key.slice(0, key.indexOf("|"))))));
  }

  return { sessions, frames, decided, progress: { frames: total, done, open } };
}
