/** Welche Karten ein Mensch schon behalten hat — aus `candidate.reviewed_plies`, rein, damit die
 *  Ansicht sie importieren darf. `writeConfirmation` rechnet den Schluessel jedes Mal neu und
 *  ersetzt ihn (sonst waere ENTFERNEN nicht ausdrueckbar): die Seite muss vorladen. */
import { messageOf } from "@/lib/answer";
import type { ReviewCard } from "@/lib/label/review-cards";

/** Eine Karte gilt als behalten, wenn JEDE ihrer `keep`-Plies gespeichert ist — bei einem
 *  Mehrfach-Commit sagt eine einzelne noch nichts ueber das Urteil ueber den Frame. */
export function keptCards(cards: ReviewCard[], reviewedPlies: readonly number[]): Record<number, boolean> {
  const reviewed = new Set(reviewedPlies);
  const out: Record<number, boolean> = {};
  for (const card of cards) {
    const plies = card.plies.filter((p) => card.keep.includes(p.index)).map((p) => p.ply);
    if (plies.length > 0 && plies.every((ply) => reviewed.has(ply))) out[card.id] = true;
  }
  return out;
}

/** Dieselbe Frage fuer die Galerie: `struck_plies` traegt PLIES, und eine gestrichene Karte
 *  muss sich wiederfinden, sonst wirkt der Haken beim naechsten Oeffnen zurueckgenommen. */
export function struckCards(cards: ReviewCard[], struckPlies: readonly number[]): Record<number, boolean> {
  const struck = new Set(struckPlies);
  const out: Record<number, boolean> = {};
  for (const card of cards) {
    const plies = card.plies.map((p) => p.ply);
    if (plies.length > 0 && plies.every((ply) => struck.has(ply))) out[card.id] = true;
  }
  return out;
}

/** Jeder Ausgang endet in einer Zeile — sonst bleibt der Knopf auf "writing" gesperrt. */
export const confirmState = (answer: Promise<{ reviewed_plies: number[] }>): Promise<string> =>
  answer.then(
    (body) => `confirmed — ${body.reviewed_plies.length} reviewed plies`,
    (error: unknown) => `error: ${messageOf(error)}`,
  );
