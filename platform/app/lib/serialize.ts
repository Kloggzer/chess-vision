/** Ein Schreiber je Datei, rein und ohne `node:`-Import. Zwei Laeufe hingen hier denselben Chunk
 *  zweimal an (2026-08-16), zwei Widerrufe holten die Zeile des anderen zurueck (2026-09-16) —
 *  beide Male lesen-aendern-schreiben ohne Riegel, und beide Seiten meldeten Erfolg. */

/** Auf `globalThis`, wie die Job-Queue: ein Hot Reload darf keinen zweiten Riegel ausgeben. */
const writers: Map<string, Promise<unknown>> =
  ((globalThis as { __chesslabWriters?: Map<string, Promise<unknown>> }).__chesslabWriters ??= new Map());

export function serialize<T>(key: string, work: () => Promise<T>): Promise<T> {
  const run = (writers.get(key) ?? Promise.resolve()).then(work, work);
  const settled = run.catch(() => {});
  writers.set(key, settled);
  void settled.then(() => {
    if (writers.get(key) === settled) writers.delete(key);
  });
  return run;
}
