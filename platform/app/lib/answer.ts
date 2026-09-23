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

/** Ein POST mit JSON-Rumpf, gelesen wie `readAnswer` — die eine Tuer der Client-Seiten. */
export async function postJson<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return readAnswer<T>(res);
}
