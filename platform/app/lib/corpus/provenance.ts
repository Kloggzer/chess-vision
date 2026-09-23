/** Which sessions a model has read, and which run. A session with no `model-reads.jsonl` is NOT
 *  MEASURED — listed with `—`, never folded into a zero. */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { dataDir, RECORDING_FILES } from "@/lib/session-store/recordings";
import { stripBom } from "@/lib/jsonl";
import { absentOnly } from "@/lib/measurement";

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
/** Pinned on `globalThis` — the parse costs tens of MB and must survive a hot reload. */
const store: Store = ((globalThis as { __chesslabProvenance?: Store }).__chesslabProvenance ??= new Map());

async function parseFile(name: string, file: string): Promise<Provenance> {
  const text = await readFile(file, "utf8");
  const lines = stripBom(text).split("\n").filter((line) => line.trim());
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
  const root = path.join(dataDir(), "recordings");
  const games = (await readdir(root, { withFileTypes: true }).catch(absentOnly)) ?? [];
  const out: Provenance[] = [];
  for (const game of games.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(root, game.name, RECORDING_FILES.modelReads);
    const stats = await stat(file).catch(absentOnly);
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
