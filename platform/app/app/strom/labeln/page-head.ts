import type { LaneCell } from "@/lib/label/lanes";

/** Was die SEITE behauptet, nicht ihre erste Karte: eine Seite laeuft ueber die Bloecke der
 *  Strittig-Lane hinweg, und `slice[0]` sprach sonst fuer alle. */
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

/** Eine Stellungs- oder Hand-Karte traegt kein Modellwort (`exception: null`), `accept` schreibt
 *  dafuer nichts — als Antwort gezaehlt nahm die Marke der Zelle ihre Vorbelegung. */
export const modelPickable = (cell: Pick<LaneCell, "exception">): boolean => cell.exception !== null;

/** Eine Karte der Seite, so wie der Kopf sie zaehlen muss. `pick: undefined` = nie angefasst. */
export type PageCell = {
  pick: "class" | "model" | "unsure" | undefined;
  judged: boolean;
  useless: boolean;
  hasModel: boolean;
};

export type PageCounts = { painted: number; model: number; unsure: number; taken: number; useless: number };

/** Was ⏎ wirklich schreibt: eine unbrauchbare Zelle bekommt weder Vorbelegung noch Klassenzeile und
 *  darf im Kopf nicht mitzaehlen. */
export function pageCounts(cells: readonly PageCell[]): PageCounts {
  const live = cells.filter((c) => !c.useless);
  return {
    painted: live.filter((c) => c.pick === "class").length,
    model: live.filter((c) => c.pick === "model" && c.hasModel).length,
    unsure: live.filter((c) => c.pick === "unsure").length,
    taken: live.filter((c) => c.pick === undefined && !c.judged).length,
    useless: cells.filter((c) => c.useless).length,
  };
}
