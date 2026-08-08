/**
 * `data/manifests/corrections.jsonl` — the shared schema of specs/53 entry.md and the ONLY
 * bridge to the Python side. Append-only is correct: `labeling.load_corrections` dedups on
 * `(session_id, frame, square)` with LAST LINE WINNING, so an undo is a superseding row.
 *
 * The file is a GLOBAL training input (CLAUDE.md) — every row written here changes every later
 * slice, which is why the writer validates instead of trusting the client.
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { checkName, dataDir } from "@/lib/data";

/** `config.CLASSES`, all 14. Free-form on write per the schema, checked here anyway. */
export const CLASSES = [
  "empty",
  "wP", "wN", "wB", "wR", "wQ", "wK",
  "bP", "bN", "bB", "bR", "bQ", "bK",
  "occluded",
] as const;

export type Correction = { session_id: string; frame: string; square: string; label: string };
export type CorrectionRow = Correction & { ts: string };

const SQUARE = /^[a-h][1-8]$/;

export function correctionsPath(): string {
  return path.join(dataDir(), "manifests", "corrections.jsonl");
}

export function validate(row: unknown): Correction {
  const r = row as Partial<Correction>;
  if (!r || typeof r !== "object") throw new Error("row is not an object");
  checkName(String(r.session_id), "session_id");
  checkName(String(r.frame), "frame");
  if (!SQUARE.test(String(r.square))) throw new Error(`bad square: ${r.square}`);
  if (!CLASSES.includes(String(r.label) as (typeof CLASSES)[number]))
    throw new Error(`bad label: ${r.label}`);
  return {
    session_id: r.session_id as string,
    frame: r.frame as string,
    square: r.square as string,
    label: r.label as string,
  };
}

/** Append and flush — no buffering across requests (spec 03, "Writes"). */
export async function appendCorrections(rows: Correction[]): Promise<number> {
  if (rows.length === 0) return 0;
  const ts = new Date().toISOString().replace(/\.\d+Z$/, "+00:00");
  const file = correctionsPath();
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, rows.map((r) => JSON.stringify({ ...r, ts })).join("\n") + "\n", "utf8");
  return rows.length;
}

/** `frame|square` of every square this session already has a verdict for — the progress bar. */
export async function decidedKeys(session_id: string): Promise<Map<string, string>> {
  const decided = new Map<string, string>();
  let text = "";
  try {
    text = await readFile(correctionsPath(), "utf8");
  } catch {
    return decided;
  }
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as CorrectionRow;
      if (row.session_id === session_id) decided.set(`${row.frame}|${row.square}`, row.label);
    } catch {
      /* a half-written line is not a verdict */
    }
  }
  return decided;
}
