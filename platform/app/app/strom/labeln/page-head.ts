import type { LaneCell } from "@/lib/lanes";

/**
 * Was die SEITE behauptet, nicht ihre erste Karte. Eine Seite von 60 laeuft ueber die Bloecke der
 * Strittig-Lane hinweg (Audit, Wand, Stellung, Hand), und `slice[0]` sprach fuer alle: ohne
 * Modellwort auf Karte 1 blieb das Modellwort der ganzen Seite unsichtbar.
 */
export function pageClaim(slice: readonly LaneCell[]): {
  fen: string[];
  models: string[];
  preselect: string;
} {
  return {
    fen: [...new Set(slice.map((c) => c.fen_label))],
    models: [...new Set(slice.flatMap((c) => (c.exception === null ? [] : [c.exception])))],
    preselect:
      [...new Set(slice.map((c) => (c.ledger === "reviewed" ? "FEN stimmt" : c.label)))].join(" · ") || "—",
  };
}

/**
 * `⇧⎵` und der Rechtsklick sagen „Modell hat recht". Eine Stellungs- oder Hand-Karte traegt per
 * Bauart kein Modellwort (`exception: null`), `accept` schreibt dafuer also nichts — die Marke
 * zaehlte im Kopf trotzdem als Antwort und nahm der Zelle ihre Vorbelegung.
 */
export const modelPickable = (cell: Pick<LaneCell, "exception">): boolean => cell.exception !== null;

/** Eine Karte der Seite, so wie der Kopf sie zaehlen muss. `pick: undefined` = nie angefasst. */
export type PageCell = {
  pick: "class" | "model" | "unsure" | undefined;
  judged: boolean;
  /** Das FELD dieser Aufnahme steht auf einem anderen Wort (`lib/setup-swap.ts`). */
  contested?: boolean;
  useless: boolean;
  hasModel: boolean;
};

export type PageCounts =
  { painted: number; model: number; unsure: number; taken: number; useless: number; contested: number };

/**
 * Was ⏎ wirklich schreibt. Eine als unbrauchbar markierte Zelle bekommt weder Vorbelegung noch
 * Klassenzeile (`accept` filtert sie heraus), zaehlte im Kopf aber weiter mit — der Knopf
 * versprach dann mehr Zeilen, als er schrieb.
 */
export function pageCounts(cells: readonly PageCell[]): PageCounts {
  const live = cells.filter((c) => !c.useless);
  return {
    painted: live.filter((c) => c.pick === "class").length,
    model: live.filter((c) => c.pick === "model" && c.hasModel).length,
    unsure: live.filter((c) => c.pick === "unsure").length,
    taken: live.filter((c) => c.pick === undefined && !c.judged && !c.contested).length,
    contested: live.filter((c) => c.pick === undefined && !c.judged && c.contested === true).length,
    useless: cells.filter((c) => c.useless).length,
  };
}
