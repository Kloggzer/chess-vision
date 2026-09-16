/**
 * Der eine Leser fuer `.jsonl`. Drei Fragen, die jede Stelle bisher selbst beantwortete:
 * eine Leerzeile ist keine Zeile, eine halb geschriebene letzte Zeile ist keine Zeile (ein
 * Schreiber laeuft gerade), und der Aufrufer bekommt Objekte, keine Strings.
 */
export function jsonlRows(text: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line) as unknown;
      if (obj && typeof obj === "object" && !Array.isArray(obj)) rows.push(obj as Record<string, unknown>);
    } catch {
      /* eine halb geschriebene Zeile ist keine Zeile */
    }
  }
  return rows;
}
