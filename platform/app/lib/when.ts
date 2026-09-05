/**
 * A stored UTC instant in the phone's clock (`toISOString()` slices showed CEST two hours early).
 * The server renders in ITS zone (UTC on `next dev`), so every element showing this carries
 * `suppressHydrationWarning` — the browser's value is the one that counts.
 */
export function when(iso?: string | null): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso.slice(0, 16).replace("T", " ");
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`;
}
