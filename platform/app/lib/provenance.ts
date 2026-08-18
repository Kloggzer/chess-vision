/**
 * D2 on `/corpus`: which sessions a model has read, and which run read them.
 *
 * A session with no `model-reads.jsonl` is NOT MEASURED — 42 of 43 on 2026-08-19, because a
 * corpus-wide run waits on a retrained model — so it is listed with `—` and never folded into a
 * zero. Without reads the `Modell ≠ FEN` lanes are empty, which is a question nobody asked.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "@/lib/data";

export type Provenance = {
  name: string;
  /** Cells in the file (header excluded); `null` = no file, so nothing was measured here. */
  rows: number | null;
  /** Rows carrying `probs` — the reads the identity lanes query. */
  probs: number | null;
  /** The run dir from the `_model` header. */
  model: string | null;
  writtenAt: string | null;
};

export function headerModel(raw: unknown): string | null {
  const row = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return typeof row._model === "string" && row._model ? row._model : null;
}

function headerWritten(raw: unknown): string | null {
  const row = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return typeof row._written_at === "string" && row._written_at ? row._written_at : null;
}

/** String scan, not `JSON.parse` per line: a session is tens of MB and one count is wanted. */
export function countProbs(text: string): number {
  let count = 0;
  for (let at = text.indexOf('"probs"'); at >= 0; at = text.indexOf('"probs"', at + 7)) count += 1;
  return count;
}

export type ProvenanceSummary = {
  /** Sessions on disk — the denominator, so "1 of 43" can never read as "1". */
  sessions: number;
  read: number;
  /** Sessions whose reads name no run dir: the file exists but cannot be attributed. */
  withoutModel: number;
  rows: number;
  probRows: number;
  models: string[];
};

export function summarize(entries: Provenance[]): ProvenanceSummary {
  const read = entries.filter((e) => e.rows !== null);
  return {
    sessions: entries.length,
    read: read.length,
    withoutModel: read.filter((e) => e.model === null).length,
    rows: read.reduce((n, e) => n + (e.rows ?? 0), 0),
    probRows: read.reduce((n, e) => n + (e.probs ?? 0), 0),
    models: [...new Set(read.map((e) => e.model).filter((m): m is string => m !== null))].sort(),
  };
}

type Store = Map<string, { key: string; value: Provenance }>;
/** Pinned like `jobs.ts:56` — the parse costs tens of MB and must survive a hot reload. */
const store: Store = ((globalThis as { __chesslabProvenance?: Store }).__chesslabProvenance ??= new Map());

async function parseFile(name: string, file: string): Promise<Provenance> {
  const text = await readFile(file, "utf8");
  const lines = text.split("\n").filter((line) => line.trim());
  let model: string | null = null;
  let writtenAt: string | null = null;
  let rows = lines.length;
  if (lines[0]?.includes('"_model"') || lines[0]?.includes('"_classes"')) {
    try {
      const header = JSON.parse(lines[0]) as unknown;
      model = headerModel(header);
      writtenAt = headerWritten(header);
    } catch {
      /* an unreadable header carries no model */
    }
    rows -= 1;
  }
  return { name, rows, probs: countProbs(text), model, writtenAt };
}

/** One entry per session directory, read or not, mtime-keyed on the file it describes. */
export async function modelReadProvenance(): Promise<Provenance[]> {
  const root = path.join(dataDir(), "realgames");
  let games;
  try {
    games = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: Provenance[] = [];
  for (const game of games.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(root, game.name, "model-reads.jsonl");
    const stats = await stat(file).catch(() => null);
    if (!stats) {
      out.push({ name: game.name, rows: null, probs: null, model: null, writtenAt: null });
      continue;
    }
    const key = `${stats.mtimeMs}:${stats.size}`;
    const hit = store.get(file);
    if (hit?.key === key) {
      out.push(hit.value);
      continue;
    }
    const value = await parseFile(game.name, file);
    store.set(file, { key, value });
    out.push(value);
  }
  return out;
}
