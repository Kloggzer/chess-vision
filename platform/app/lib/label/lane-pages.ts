/**
 * Eine Seite, EINE Behauptung. Feste 50er-Scheiben fielen über die Klassengrenze, und
 * `cell-lane.tsx` fing das erst nachträglich mit einer Sperre ab. Hier fällt der Schnitt vorher.
 */
import type { LaneCell } from "@/lib/label/lanes";

export function pagesByClaim(cells: readonly LaneCell[], size: number): LaneCell[][] {
  const pages: LaneCell[][] = [];
  let page: LaneCell[] = [];
  for (const cell of cells) {
    if (page.length > 0 && (page.length >= size || page[0].fen_label !== cell.fen_label)) {
      pages.push(page);
      page = [];
    }
    page.push(cell);
  }
  if (page.length > 0) pages.push(page);
  return pages;
}
