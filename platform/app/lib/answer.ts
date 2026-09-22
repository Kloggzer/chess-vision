/**
 * Die Antwort EINER Route, gelesen wie sie gemeint ist. Ein Rumpf unter 4xx/5xx traegt `error`
 * und keines der Felder danach: als Nutzlast gesetzt wurde daraus "nichts laeuft" oder ein
 * Absturz beim ersten Zugriff, waehrend die Route ihren Grund laengst geschrieben hatte.
 */
export async function readAnswer<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(body?.error ?? res.statusText);
  return body;
}
