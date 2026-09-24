/**
 * The class scheme, pure so the palette (a client component) may import it: 13 identities plus
 * `coverage`, a measured fraction — never a 14th class (`lib/client-boundary.test.ts`).
 */

/** `config.IDENTITY_CLASSES` — the only labels a human still writes. */
export const IDENTITY_CLASSES = [
  "empty",
  "wP", "wN", "wB", "wR", "wQ", "wK",
  "bP", "bN", "bB", "bR", "bQ", "bK",
] as const;

/** Hand-painted until 2026-08-18: still readable and rendered as history, but nothing writes another
 *  one — occlusion is measured (`matte.jsonl` -> `coverage`), not asked. */
export const LEGACY_LABEL = "occluded";

export const isIdentity = (label: string): boolean =>
  (IDENTITY_CLASSES as readonly string[]).includes(label);

/**
 * `chesslab.cell_rule.PIECE_VISIBLE_MAX` — the same 0.15. Above it a
 * crop is no piece example any more and `OcclusionLoss` masks it out of the classification term.
 */
export const PIECE_VISIBLE_MAX = 0.15;

export const coveredSquares = (coverage: Record<string, number>): string[] =>
  Object.keys(coverage).filter((sq) => coverage[sq] > PIECE_VISIBLE_MAX).sort();

/** SAM's fraction as the human reads it. Below half a percent there is nothing to print. */
export const coveragePct = (v: number): string | null =>
  v >= 0.005 ? `${Math.round(v * 100)} %` : null;
