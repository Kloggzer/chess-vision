/**
 * The matte review's read model: every frame that HAS an alpha, with the one thing a human still
 * answers about it — is the interval's FEN what the board shows. The alpha itself stopped being a
 * question on 2026-08-22; the pen on that page is what remains for the rare bad cut.
 */
import { judgedKeys } from "@/lib/corrections";
import { liveGames } from "@/lib/label-stream";
import { coveredSquares } from "@/lib/classes";
import { type AlphaState, alphaState, fixedAlphas, loadMatte, matteStamp } from "@/lib/matte";
import { badIntervals, frameReviews, unusableBoards, type FrameReview } from "@/lib/review-notes";
import { loadSession, sessionId } from "@/lib/session";

/** Behauptet die Maske ein FELD? Dieselbe Schwelle, die die Karte als "n Felder > 0.15" zeigt —
 *  ein Frame mit 0 Feldern hat nichts, worueber ein Mensch urteilen koennte. */
export const claimsAnything = (coverage: Record<string, number>): boolean =>
  coveredSquares(coverage).length > 0;

/** One page of work. The alpha is a full board raster per frame, so the list stays bounded. */
const VERIFY_PAGE = 200;

type VerifySession = { name: string; sessionId: string };

type VerifyFrame = {
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

const move = (moves: Map<number, { san: string; fen: string }>, ply: number) => {
  const m = moves.get(ply);
  return m ? { ply, ...m } : undefined;
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
      // Ein Alpha, das nirgends etwas behauptet, hat nichts zu pruefen: die Frage der Review ist
      // "stimmt SAMs Maske", und eine leere Maske behauptet keine. Die MESSUNG bleibt in
      // `matte.jsonl` — sie unterscheidet "gemessen, frei" von "nie angesehen" (`hand_flags.py`).
      if (!claimsAnything(alpha.coverage)) continue;
      total += 1;
      const review = reviews.get(row.stem) ?? {};
      if (review.position !== undefined) {
        done += 1;
        continue;
      }
      mine.push({
        session: index,
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
        intervalFlagged: bad.has(row.ply),
        alpha: alphaState(alpha, fixed.get(row.stem), recutAt),
      });
    }
    // Zuerst die Frames, die als SAUBER gelten: dort behauptet SAM eine Verdeckung, wo keine
    // erwartet war — das ist der Fund. Auf dem dirty-Stapel ist die Hand ohnehin bekannt und nur
    // die Maske fraglich. Stabil, also bleibt innerhalb beider Gruppen die Frame-Reihenfolge.
    mine.sort((a, b) => Number(a.reason !== undefined) - Number(b.reason !== undefined));
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
