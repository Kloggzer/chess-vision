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

/**
 * Painted by hand until 2026-08-18 and carried by 31 271 rows of `corrections.jsonl`. They stay
 * readable and are rendered as history; nothing writes another one, because occlusion is measured
 * (`matte.jsonl` -> `coverage`) instead of asked.
 */
export const LEGACY_LABEL = "occluded";

/** Everything a stored row may say — identities plus the legacy label. Readers, not writers. */
export const CLASSES: readonly string[] = [...IDENTITY_CLASSES, LEGACY_LABEL];

export const isIdentity = (label: string): boolean =>
  (IDENTITY_CLASSES as readonly string[]).includes(label);

/**
 * `training/occlusion.PIECE_VISIBLE_MAX`, and `labeling.MATTE_DIRTY` — the same 0.15. Above it a
 * crop is no piece example any more and `OcclusionLoss` masks it out of the classification term.
 */
export const PIECE_VISIBLE_MAX = 0.15;

export const coveredSquares = (coverage: Record<string, number>): string[] =>
  Object.keys(coverage).filter((sq) => coverage[sq] > PIECE_VISIBLE_MAX).sort();
