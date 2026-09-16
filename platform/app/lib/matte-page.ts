/**
 * Was ein Seiten-Commit der Matte-Lane entscheidet: das Urteil je Frame der Seite, und was von den
 * Marken danach stehen bleibt. Rein, weil `app/**` nicht kollektierbar ist (`vitest.config.mts`).
 */
export type MatteVerdict = "matte-ok" | "matte-bad" | "matte-clean";

export type PageCommit = {
  verdicts: Record<string, MatteVerdict>;
  marked: ReadonlySet<string>;
  clean: ReadonlySet<string>;
};

// TODO: `marked`/`clean` werden GANZ geleert, obwohl nur [page] geschrieben wurde. Wer auf Seite 1
// markiert und mit → auf Seite 2 committet, verliert die Marken der Seite 1 lautlos — dieselben
// Frames werden beim naechsten ⏎ als `matte-ok` geschrieben, obwohl der Mensch "taugt nichts"
// gesagt hat. Richtig waere, nur die Schluessel aus [page] zu entfernen.
export function commitPage(
  page: readonly string[],
  marked: ReadonlySet<string>,
  clean: ReadonlySet<string>,
): PageCommit {
  const verdicts: Record<string, MatteVerdict> = {};
  for (const key of page) {
    verdicts[key] = clean.has(key) ? "matte-clean" : marked.has(key) ? "matte-bad" : "matte-ok";
  }
  return { verdicts, marked: new Set<string>(), clean: new Set<string>() };
}
