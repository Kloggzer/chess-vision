/**
 * A stored UTC instant in the clock the user reads off their phone: slicing `toISOString()` showed
 * CEST recordings two hours in the past, on the one number the page is checked against.
 */
export function when(iso?: string | null): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso.slice(0, 16).replace("T", " ");
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`;
}
