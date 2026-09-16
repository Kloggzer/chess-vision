/**
 * Was der Kopf des Labeln-Stroms aus dem Zeiger und aus der URL liest — rein, weil
 * `vitest.config.mts` nur `lib/**` einsammelt und `app/**` daher keinen Test tragen kann.
 */
import { DEFAULT_WALL, type Filter } from "@/lib/query";

/** Ohne Zeiger gibt es keine aktuelle Aufnahme: `sessions[0]` waere eine erfundene Antwort. */
export function cursorSession<S>(
  sessions: readonly S[],
  here: { session: number } | undefined,
): S | undefined {
  return here === undefined ? undefined : sessions[here.session];
}

export type WallLink = { filter: Filter; phase: string };

/**
 * Die Frage, die ein geteilter Link stellt. Ein fehlendes `min` ist nicht 0 — `Number(null)` und
 * `Number("")` sind 0, und 0 laesst JEDE Zelle mit `probs` durch. Es faellt auf dieselbe Vorgabe
 * wie `app/api/query/route.ts`, sonst antworten Client und Route demselben Link verschieden.
 */
export function linkFilter(search: string): WallLink | null {
  const url = new URLSearchParams(search);
  const klass = url.get("class")?.trim();
  if (!klass) return null;
  const raw = url.get("min")?.trim();
  const min = raw ? Number(raw) : DEFAULT_WALL.min;
  if (!Number.isFinite(min)) return null;
  return { filter: { klass, min }, phase: url.get("phase") ?? "any" };
}
