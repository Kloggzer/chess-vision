/** Welche Felder einer Aufnahme auf einem anderen Wort STEHEN, als das FEN sagt: ein Aufbau-Tausch
 *  haengt am FELD, der Schutz der Lane greift je ZELLE. */

/** Wie `decided` in der Lane: `stem|square` -> was der Mensch dort entschieden hat. */
export type Decided = Record<string, string>;

export type Standing = { label: string; n: number };

/** Darunter ist es eine Einzelkorrektur — ein Wackler, eine Hand, ein umgefallener Turm. */
const MIN_ROWS = 4;
/** Darunter ist das Feld strittig und nicht getauscht; dann darf die Lane weiter fragen. */
const MIN_SHARE = 0.8;

/**
 * `empty` bleibt draussen: eine Hand raeumt das Feld fuer ein paar Frames, sie tauscht es nicht.
 * Ein Feld darauf zu sperren haette jede verdeckte Ecke der Lane entzogen.
 */
export function standingSquares(decided: Decided): Map<string, Standing> {
  const perSquare = new Map<string, Map<string, number>>();
  for (const [key, label] of Object.entries(decided)) {
    if (label === "empty") continue;
    const square = key.slice(key.indexOf("|") + 1);
    const tally = perSquare.get(square) ?? new Map<string, number>();
    tally.set(label, (tally.get(label) ?? 0) + 1);
    perSquare.set(square, tally);
  }

  const out = new Map<string, Standing>();
  for (const [square, tally] of perSquare) {
    let total = 0;
    let best: Standing = { label: "", n: 0 };
    for (const [label, n] of tally) {
      total += n;
      if (n > best.n) best = { label, n };
    }
    if (best.n >= MIN_ROWS && best.n / total >= MIN_SHARE) out.set(square, best);
  }
  return out;
}
