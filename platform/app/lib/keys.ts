const FIELDS = ["INPUT", "TEXTAREA", "SELECT"];

/** Ein Tastendruck in einem Eingabefeld gehoert dem Feld, nicht der Tastatur der Seite. */
export function inField(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  return Boolean(target && FIELDS.includes(target.tagName));
}

/** Einer mit Cmd/Ctrl/Alt gehoert dem Browser; Umschalt bleibt ein Teil der Taste. */
export const pageKey = (event: KeyboardEvent) =>
  !(event.metaKey || event.ctrlKey || event.altKey) && !inField(event);
