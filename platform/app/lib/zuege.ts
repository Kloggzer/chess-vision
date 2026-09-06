/**
 * The ZÜGE stream's model (`docs/labeling-ux/CONCEPT.md` §4.1): every pending game's cards,
 * concatenated, newest recording first. The game boundary is a caption and a COMMIT, never a page.
 *
 * Pure on purpose — the client component owns the loop and imports this, the page owns the disk.
 */
import type { ReferenceOrigin } from "@/lib/chain";
import type { ReviewCard } from "@/lib/review-cards";

/**
 * The undo window §4.1.1 buys. The boundary commit enqueues its own export with
 * `notBefore = now + this`, and for exactly this long `z` costs nothing: no session directory has
 * been written yet. It is also the age under which a `confirmed_at` holds off the picker, so a
 * commit from another client gets the same grace.
 */
export const EXPORT_HOLD_MS = 90_000;

export type StreamGame = {
  name: string;
  title: string | null;
  /** `rg-<name>` — what a review note is keyed on. */
  sessionId: string;
  /** Halbzüge the tracker committed. 0 = the replay read nothing (§4.1's empty-candidate case). */
  plies: number;
  /** The plies that disagree with the reference — one card per commit frame, with a verdict. */
  cards: ReviewCard[];
  /** The matched plies, same windows, no verdict — the `g` gallery (§8c). */
  gallery: ReviewCard[];
  /** Plies already called `bad-interval` in `review-notes.jsonl` — the verdict is reload-proof. */
  noted: number[];
  /** `reference.pgn` exists but cannot be read — every ply is then the human's, and the header says why. */
  referenceProblem: string | null;
  /** Where `reference.pgn` came from: `phone` makes every match below a self-check, not a check. */
  reference: ReferenceOrigin;
};

/** One entry per card, and ONE for a game whose candidate is empty: it still needs a verdict. */
export type StreamItem = { game: number; card: ReviewCard | null; last: boolean };

/** The whole stream in reading order. `card === null` is the "0 Halbzüge gelesen" card. */
export function streamItems(games: StreamGame[]): StreamItem[] {
  return games.flatMap<StreamItem>((game, index) =>
    game.cards.length === 0
      ? [{ game: index, card: null, last: true }]
      : game.cards.map((card, i) => ({ game: index, card, last: i === game.cards.length - 1 })),
  );
}

/**
 * The next card a human should see — `items.length` when the stream is through.
 *
 * `x` throws a whole recording out, so every remaining card of it is skipped rather than asked:
 * the human already answered for all of them at once.
 */
export function nextItem(items: StreamItem[], from: number, dropped: ReadonlySet<number>): number {
  for (let i = from + 1; i < items.length; i++) if (!dropped.has(items[i].game)) return i;
  return items.length;
}

/** One card back, across the game boundary (§4.1.1) — `-1` at the head of the stream. */
export function prevItem(items: StreamItem[], from: number, dropped: ReadonlySet<number>): number {
  for (let i = Math.min(from, items.length) - 1; i >= 0; i--) if (!dropped.has(items[i].game)) return i;
  return -1;
}

/** Median of the gaps between decisions — the header's s/Zug, in memory and reset by a reload. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
