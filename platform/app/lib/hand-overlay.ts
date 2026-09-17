/** Welche Felder die Brett-Vorschau als Hand faerbt — und aus welcher Messung.
 *
 *  Der Rillen-Sensor NENNT nur Felder (Precision 99,6 %, Recall 71 %); die Matte MISST sie. Auf
 *  `2026-08-08-11-59-12` war die Haelfte der Hand nicht gelb (`docs/offene-entscheidungen.md`). */
import { PIECE_VISIBLE_MAX } from "@/lib/classes";

export type HandOverlay = { squares: string[]; source: "matte" | "grid" | "none" };

export function handOverlay(
  coverage: Record<string, number> | undefined,
  grid: readonly string[],
): HandOverlay {
  // Eine gemessene Matte ohne Hand ist eine Aussage: dann bleibt das Brett leer, statt dass der
  // grobe Vorfilter sie ueberstimmt.
  if (coverage) {
    return {
      squares: Object.entries(coverage)
        .filter(([, v]) => v > PIECE_VISIBLE_MAX)
        .map(([sq]) => sq)
        .sort(),
      source: "matte",
    };
  }
  return grid.length > 0
    ? { squares: [...grid].sort(), source: "grid" }
    : { squares: [], source: "none" };
}
