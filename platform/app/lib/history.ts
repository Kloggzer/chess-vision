/**
 * Was die Historie über EINE geschriebene Zeile weiß — rein, damit die Ansicht sie importieren
 * darf. Der Leser dazu ist `lib/history-load.ts`; hier steht nichts, was die Platte anfasst.
 */
import type { Ledger } from "@/lib/corrections";

export type Change = {
  /** Verzeichnisname der Aufnahme — der Crop-Pfad hängt daran, nicht an der `rg-`-Id. */
  name: string;
  sessionId: string;
  frame: string;
  square: string;
  /** Was diese Zeile geschrieben hat. */
  label: string;
  /** Was vorher stand; `null` heißt: diese Zelle trug noch kein Urteil. */
  before: string | null;
  /** Das Wort des FEN — worauf ein Rücknehmen ohne Vorgänger zurückfällt. */
  fen_label: string;
  ledger: Ledger;
  retract: boolean;
  ts: string;
};

/** Was ein Rücknehmen schreibt: der Vorgänger, sonst das Wort des FEN (CONCEPT.md 4.2.2). */
export const revertsTo = (change: Change): string => change.before ?? change.fen_label;

/** Wie die Karte die Änderung ausspricht. `—` statt eines erfundenen Vorgängers: die Zelle war offen. */
export const changeText = (change: Change): string =>
  `${change.before ?? "—"} → ${change.retract ? `${change.label} (zurückgenommen)` : change.label}`;
