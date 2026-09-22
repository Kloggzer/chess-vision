/**
 * Eine Seite der Zell-Lane hat MEHRERE Schreiber: die Korrekturzeilen, den Dirty-Zettel und das
 * Unbrauchbar-Ledger. Jeder traegt ein eigenes menschliches Urteil — die Karten duerfen erst
 * zugehen, wenn JEDER bestaetigt hat, sonst schliesst die Korrektur den verlorenen Zettel mit ein.
 */
export type PageWriter = () => Promise<boolean>;

/**
 * Alle Schreiber ZUGLEICH — die Seite wartet auf den langsamsten, nicht auf die Summe. Nur ein
 * ausdrueckliches `true` bestaetigt: ein `void`-Aufruf (`undefined`) ist keine Bestaetigung.
 */
export async function pageWritten(writers: PageWriter[]): Promise<boolean> {
  const done = await Promise.allSettled(writers.map((write) => write()));
  return done.every((d) => d.status === "fulfilled" && d.value === true);
}
