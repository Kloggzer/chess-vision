/** Ein Rumpf unter 4xx/5xx traegt `error` und keines der Felder: als Nutzlast gelesen wird daraus
 *  "nichts laeuft" oder ein Absturz beim ersten Zugriff. */
export async function readAnswer<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(body?.error ?? res.statusText);
  return body;
}

/** Die eine Tuer der Client-Seiten: abgerissenes Netz und Absage kommen beide als Rejection. */
export async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  return readAnswer<T>(await fetch(url, init));
}

export function postJson<T = unknown>(url: string, body: unknown): Promise<T> {
  return fetchJson<T>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));
