/**
 * Ein Seitenwechsel in den Rastern. Zwei Dinge, die die Seiten selbst nicht wissen koennen:
 * der Index bleibt im Bereich, und eine nach dem SEITEN-Index gekeyte Auswahl faellt weg — sonst
 * traegt sie die Farbe der alten Seite auf die neuen Zellen, und ⏎ schreibt sie.
 */
export function clampPage(page: number, delta: number, pages: number): number {
  return Math.max(0, Math.min(Math.max(1, pages) - 1, page + delta));
}

export type PagePicks<T> = { page: number; picks: Record<number, T>; cursor: number };

export function turnPage<T>(state: PagePicks<T>, delta: number, pages: number): PagePicks<T> {
  const page = clampPage(state.page, delta, pages);
  return page === state.page ? state : { page, picks: {}, cursor: 0 };
}
