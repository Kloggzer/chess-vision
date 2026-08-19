/**
 * Der Zettel „Hand drauf" gilt dem FRAME, nie der einen Zelle: `realgames.reported_dirty` legt
 * beim nächsten Export ALLE 64 Felder dieses Frames auf den dirty-Stapel. Rein, damit Strom und
 * Zell-Lane denselben Schlüssel benutzen.
 */
import type { ReviewNote } from "@/lib/review-notes";

/** Session-INDEX plus Stem — der Zellindex einer Seite taugt nicht, eine Seite mischt Frames. */
export type FrameRef = { session: number; stem: string };

export const frameKey = (c: FrameRef): string => `${c.session}|${c.stem}`;

/** Welche Karten der Seite zum gemeldeten Frame gehören: die Geschwister leuchten mit. */
export function dirtyOnPage(cells: readonly FrameRef[], reported: ReadonlySet<string>): Set<number> {
  return new Set(cells.flatMap((c, i) => (reported.has(frameKey(c)) ? [i] : [])));
}

/** Die eine Zeile, die der Klick schreibt — ein Urteil über das Frame, nie ein Label. */
export function dirtyRows(sessionId: string, stem: string, reason: string): ReviewNote[] {
  return [{ session_id: sessionId, frame: stem, verdict: "dirty-frame", reason }];
}
