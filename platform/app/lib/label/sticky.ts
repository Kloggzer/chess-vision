/** Was in `localStorage` liegt, ist keine Zusage: roh im Render geparst, riss ein fremder Rest die
 *  Seite bei jedem Laden mit. Ein unlesbarer Wert heisst Vorgabe. */
export function readSticky<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw) as unknown;
    return value !== null && typeof value === "object" ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}
