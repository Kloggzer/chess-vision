export async function api<T = any>(url: string, opt?: RequestInit): Promise<T> {
  const r = await fetch(url, opt);
  if (!r.ok) {
    // FastAPI liefert die Klartext-Ursache in {detail: ...} — die zeigen wir an,
    // statt eines nichtssagenden "HTTP 400".
    let detail = "";
    try { detail = (await r.json())?.detail ?? ""; } catch { /* non-JSON body */ }
    throw new Error(detail || `HTTP ${r.status} (${url})`);
  }
  return r.json();
}

export const post = <T = any>(url: string, body?: any): Promise<T> =>
  api<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

export const del = <T = any>(url: string): Promise<T> => api<T>(url, { method: "DELETE" });

export const CLASSES = [
  "empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK", "occluded",
];

const GLYPH: Record<string, string> = {
  empty: "·",
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
  occluded: "▦",
};
export const glyph = (label: string) => GLYPH[label] ?? label;
