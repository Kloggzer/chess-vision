/**
 * Was der Kopf des Labeln-Stroms aus dem Zeiger und aus der URL liest — rein, weil
 * `vitest.config.mts` nur `lib/**` einsammelt und `app/**` daher keinen Test tragen kann.
 */
import type { Filter } from "@/lib/query";

/** Ohne Zeiger gibt es keine aktuelle Aufnahme: `sessions[0]` waere eine erfundene Antwort. */
export function cursorSession<S>(
  sessions: readonly S[],
  here: { session: number } | undefined,
): S | undefined {
  return here === undefined ? undefined : sessions[here.session];
}

export type WallLink = { filter: Filter; phase: string };

/**
 * Die Frage, die ein geteilter Link stellt — oder `null`, wenn er keine stellt. Ein fehlendes
 * `min` ist nicht 0: `Number(null)` und `Number("")` sind 0, und 0 laesst JEDE Zelle mit `probs`
 * durch. `app/api/query/route.ts` haelt dieselbe Stelle seit laengerem, der Client nicht.
 */
export function linkFilter(search: string): WallLink | null {
  const url = new URLSearchParams(search);
  const klass = url.get("class")?.trim();
  const raw = url.get("min")?.trim();
  if (!klass || !raw) return null;
  const min = Number(raw);
  if (!Number.isFinite(min)) return null;
  return { filter: { klass, min }, phase: url.get("phase") ?? "any" };
}
