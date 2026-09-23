/**
 * Die Seiten-Auswahl der Matte-Lane. `marked` und `clean` gelten SEITENUEBERGREIFEND — `commitPage`
 * raeumt bewusst nur die eigene Seite ab —, also darf „alle" nie die ganze Menge ersetzen.
 */

/** Die Schluessel der Seite, die „alle" ueberhaupt markieren darf: vorgemerkt Leeres bleibt leer. */
function pageMarks(page: readonly string[], clean: ReadonlySet<string>): string[] {
  return page.filter((key) => !clean.has(key));
}

export function pageAllMarked(
  page: readonly string[],
  marked: ReadonlySet<string>,
  clean: ReadonlySet<string>,
): boolean {
  const own = pageMarks(page, clean);
  return own.length > 0 && own.every((key) => marked.has(key));
}

/** Ein Druck auf `a`: die Seite markieren, oder — wenn sie schon ganz markiert ist — abraeumen. */
export function toggleAllOnPage(
  page: readonly string[],
  marked: ReadonlySet<string>,
  clean: ReadonlySet<string>,
): ReadonlySet<string> {
  const own = pageMarks(page, clean);
  const next = new Set(marked);
  const off = pageAllMarked(page, marked, clean);
  for (const key of own) {
    if (off) next.delete(key);
    else next.add(key);
  }
  return next;
}
