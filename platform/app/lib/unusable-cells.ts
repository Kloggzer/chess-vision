/**
 * `unusable-cells.jsonl` — "aus diesem Crop ist kein Label zu holen". Eigenes Ledger neben
 * `corrections.jsonl`, weil dort jede Zeile eine der 13 Identitaeten ist. Schluessel und Regel
 * sind dieselben: letzte Zeile gewinnt, `unusable: false` nimmt zurueck.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { appendRows } from "@/lib/atomic";
import { checkName, gameDir, requireRecording } from "@/lib/data";
import { recordingName, sessionId } from "@/lib/session";
import { jsonlRows } from "@/lib/jsonl";

export type UnusableCell = { session_id: string; frame: string; square: string; unusable: boolean };
type Row = UnusableCell & { ts: string };

const SQUARE = /^[a-h][1-8]$/;
const UNUSABLE_CELLS = "unusable-cells.jsonl";

export function unusableCellsPath(name: string): string {
  return path.join(gameDir(name), UNUSABLE_CELLS);
}

export function validateCell(row: unknown): UnusableCell {
  const r = row as Partial<UnusableCell>;
  if (!r || typeof r !== "object") throw new Error("row is not an object");
  checkName(String(r.session_id), "session_id");
  checkName(String(r.frame), "frame");
  if (!SQUARE.test(String(r.square))) throw new Error(`bad square: ${r.square}`);
  return {
    session_id: r.session_id as string,
    frame: r.frame as string,
    square: r.square as string,
    // Nur das ausdrueckliche `false` nimmt zurueck; alles andere ist das Urteil selbst.
    unusable: r.unusable !== false,
  };
}

export async function appendUnusableCells(rows: UnusableCell[]): Promise<number> {
  if (rows.length === 0) return 0;
  const ts = new Date().toISOString().replace(/\.\d+Z$/, "+00:00");
  const bySession = new Map<string, UnusableCell[]>();
  for (const row of rows) bySession.set(row.session_id, [...(bySession.get(row.session_id) ?? []), row]);
  for (const [session_id, mine] of bySession) {
    const file = unusableCellsPath(recordingName(session_id));
    await requireRecording(path.dirname(file), session_id);
    await appendRows(file, mine.map((r) => ({ ...r, ts })));
    cache.delete(file);
  }
  return rows.length;
}

type Cache = Map<string, { key: string; value: Set<string> }>;
const cache: Cache = ((globalThis as { __chesslabUnusableCells?: Cache }).__chesslabUnusableCells ??= new Map());

/** `frame|square` dieser Aufnahme, die kein Label mehr hergeben — mtime-gekeyt wie jedes Ledger. */
export async function unusableCells(name: string): Promise<Set<string>> {
  const file = unusableCellsPath(name);
  const key = await stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");
  const hit = cache.get(file);
  if (hit?.key === key) return hit.value;

  const id = sessionId(name);
  const value = new Set<string>();
  const text = key === "none" ? "" : await readFile(file, "utf8").catch(() => "");
  for (const line of jsonlRows(text)) {
    const row = line as unknown as Row;
    if (row.session_id !== id) continue;
    const cell = `${row.frame}|${row.square}`;
    if (row.unusable === false) value.delete(cell);
    else value.add(cell);
  }
  cache.set(file, { key, value });
  return value;
}
