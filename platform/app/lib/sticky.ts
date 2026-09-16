/**
 * Was in `localStorage` liegt, ist keine Zusage. Roh geparst im Render von
 * `app/confirm/compare.tsx` warf ein fremder Rest dort, und React riss die Seite mit — bei jedem
 * Laden neu. Ein unlesbarer Wert ist keine Einstellung, also die Vorgabe.
 */
export function readSticky<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw) as unknown;
    return value !== null && typeof value === "object" ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}
