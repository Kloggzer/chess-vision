/** Eine Seite, EINE Behauptung: der Schnitt faellt an der Klassengrenze, nicht alle 50 Karten. */
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
