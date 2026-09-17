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

/** Nur die Schluessel DIESER Seite fallen aus der Menge — `marked`/`clean` sind seitenuebergreifend. */
const without = (set: ReadonlySet<string>, page: readonly string[]): Set<string> => {
  const rest = new Set(set);
  for (const key of page) rest.delete(key);
  return rest;
};

export function commitPage(
  page: readonly string[],
  marked: ReadonlySet<string>,
  clean: ReadonlySet<string>,
): PageCommit {
  const verdicts: Record<string, MatteVerdict> = {};
  for (const key of page) {
    verdicts[key] = clean.has(key) ? "matte-clean" : marked.has(key) ? "matte-bad" : "matte-ok";
  }
  // Ganz zu leeren verlor die Marken jeder ANDEREN Seite lautlos — und dieselben Frames gingen
  // beim naechsten Commit als `matte-ok` durch, obwohl der Mensch "taugt nichts" gesagt hatte.
  return { verdicts, marked: without(marked, page), clean: without(clean, page) };
}

export type PageRevert = {
  /** Genau die Zeilen, die der Commit geschrieben hat — `retract: true` nimmt sie wieder weg. */
  verdicts: { key: string; verdict: MatteVerdict }[];
  /** Nur `matte-clean` hat ein Alpha GELEERT; SAMs Schnitt liegt daneben und kommt zurueck. */
  restore: string[];
  marked: ReadonlySet<string>;
  clean: ReadonlySet<string>;
};

/** Der Rueckweg zu `commitPage`: aus seinem Plan allein, damit nichts zweimal geraten wird. */
export function revertPage(plan: PageCommit): PageRevert {
  const verdicts = Object.entries(plan.verdicts).map(([key, verdict]) => ({ key, verdict }));
  return {
    verdicts,
    restore: verdicts.filter((v) => v.verdict === "matte-clean").map((v) => v.key),
    marked: new Set(verdicts.filter((v) => v.verdict === "matte-bad").map((v) => v.key)),
    clean: new Set(verdicts.filter((v) => v.verdict === "matte-clean").map((v) => v.key)),
  };
}
