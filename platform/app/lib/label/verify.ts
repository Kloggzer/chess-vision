/** The matte review's read model: every frame that HAS an alpha, and the ONE question — does SAM's
 *  mask cut the hand right. Whether the position still holds is a cell question of the Strittig lane. */
import { liveGames } from "@/lib/label/label-stream";
import { coveredSquares } from "@/lib/classes";
import { type AlphaState, alphaState, fixedAlphas, loadMatte, matteStamp } from "@/lib/session-store/matte";
import { frameReviews, unusableBoards, type FrameReview } from "@/lib/session-store/review-notes";
import { exportedSession, sessionId } from "@/lib/session-store/session";

/** Behauptet die Maske ein FELD? Dieselbe Schwelle, die die Karte als "n Felder > 0.15" zeigt —
 *  ein Frame mit 0 Feldern hat nichts, worueber ein Mensch urteilen koennte. */
export const claimsAnything = (coverage: Record<string, number>): boolean =>
  coveredSquares(coverage).length > 0;

/** One page of work. The alpha is a full board raster per frame, so the list stays bounded. */
const VERIFY_PAGE = 200;

export type VerifySession = { name: string; sessionId: string };

export type VerifyFrame = {
  session: number;
  stem: string;
  ply: number;
  fen: string;
  /** The halfmove that produced the position shown, and the one about to be played. Absent at
   *  the ends: ply 0 has no predecessor, the last ply no successor. The hand in the alpha is
   *  usually mid-`next`, so this is what says whether the board should still show `last`. */
  last?: { ply: number; san: string; fen: string };
  next?: { ply: number; san: string; fen: string };
  /** `dirty_reason` of the log row the alpha was cut for. */
  reason?: string;
  coverage: Record<string, number>;
  /** Squares past `PIECE_VISIBLE_MAX` — the ones the piece loss drops on its own. */
  covered: string[];
  concepts: Record<string, number>;
  review: FrameReview;
  /** Whose alpha `coverage` came from — `pending` means a correction the recut has not read. */
  alpha: AlphaState;
};

/** Before the page knows which session index it lands under — `session` is set on the push. */
type OpenFrame = Omit<VerifyFrame, "session">;

export type VerifyStream = {
  sessions: VerifySession[];
  frames: VerifyFrame[];
  /** Corpus-wide, never page-bounded: alphas, those already judged, and those still open. */
  progress: { frames: number; done: number; open: number };
};

const move = (moves: Map<number, { san: string; fen: string }>, ply: number) => {
  const m = moves.get(ply);
  return m ? { ply, ...m } : undefined;
};

/** A verdict on the mask is void once `temporal-merge` rewrote the mask after it. */
export function reopened(review: FrameReview, mergedAt: string | undefined): boolean {
  return mergedAt !== undefined && (review.matteAt === undefined || review.matteAt < mergedAt);
}

/** `skip` zaehlt OFFENE Frames, nicht Seiten: Beurteiltes faellt hier ohnehin raus, also schiebt der
 *  Client nur den Rest weiter, den er schon haelt. */
export async function loadVerifyStream(skip = 0): Promise<VerifyStream> {
  const sessions: VerifySession[] = [];
  const frames: VerifyFrame[] = [];
  let total = 0;
  let done = 0;
  let open = 0;

  for (const name of await liveGames()) {
    const matte = await loadMatte(name);
    if (matte.size === 0) continue;
    const session = await exportedSession(name);
    if (session === null) continue;
    const id = sessionId(name);
    const [unusable, reviews, fixed, recutAt] = await Promise.all([
      unusableBoards(id),
      frameReviews(id),
      fixedAlphas(name),
      matteStamp(name),
    ]);

    const mine: OpenFrame[] = [];
    for (const row of session.rows) {
      const alpha = matte.get(row.stem);
      if (!alpha?.coverage || alpha.skipped || unusable.has(row.stem)) continue;
      // Ein Alpha, das nirgends etwas behauptet, hat nichts zu pruefen: die Frage der Review ist
      // "stimmt SAMs Maske", und eine leere Maske behauptet keine. Die MESSUNG bleibt in
      // `matte.jsonl` — sie unterscheidet "gemessen, frei" von "nie angesehen" (`hand_flags.py`).
      if (!claimsAnything(alpha.coverage)) continue;
      total += 1;
      const review = reviews.get(row.stem) ?? {};
      // Nur ein Urteil ueber die MASKE schliesst einen Frame ab; die Stellung fragt die Strittig-Lane.
      if (review.matte !== undefined && !reopened(review, alpha.mergedAt)) {
        done += 1;
        continue;
      }
      mine.push({
        stem: row.stem,
        ply: row.ply,
        fen: row.fen,
        last: move(session.moves, row.ply),
        next: move(session.moves, row.ply + 1),
        reason: alpha.reason ?? row.dirtyReason,
        coverage: alpha.coverage,
        covered: coveredSquares(alpha.coverage),
        concepts: alpha.concepts,
        review,
        alpha: alphaState(alpha, fixed.get(row.stem), recutAt),
      });
    }
    // Zuerst die Frames, die als SAUBER gelten: dort behauptet SAM eine Verdeckung, wo keine
    // erwartet war — das ist der Fund. Auf dem dirty-Stapel ist die Hand ohnehin bekannt und nur
    // die Maske fraglich. Stabil, also bleibt innerhalb beider Gruppen die Frame-Reihenfolge.
    mine.sort((a, b) => Number(a.reason !== undefined) - Number(b.reason !== undefined));
    const from = Math.max(0, skip - open);
    open += mine.length;
    // Counting runs over EVERY session, only the page stops at VERIFY_PAGE — a break in this loop
    // made the headline the progress of page one.
    if (from >= mine.length || frames.length >= VERIFY_PAGE) continue;
    const index = sessions.length;
    sessions.push({ name, sessionId: id });
    for (const frame of mine.slice(from, from + VERIFY_PAGE - frames.length)) {
      frames.push({ ...frame, session: index });
    }
  }

  return { sessions, frames, progress: { frames: total, done, open } };
}
