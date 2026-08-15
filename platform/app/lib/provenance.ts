/**
 * D2 on `/corpus`: does the proposal corpus carry the model's own reading, or only pixel scores?
 *
 * `occluded.py:384-385` writes `probs` only when a model was passed, and without `probs` the whole
 * `Modell ≠ FEN` filter is empty (`query.ts:42`). The answer comes from the fresh sidecar where one
 * exists and from a one-time parse of the file where none does — and the view says which it was.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "@/lib/data";

export type Provenance = {
  name: string;
  /** Proposal rows in the file (header excluded), or the sidecar's `cells`. */
  rows: number | null;
  /** Rows carrying `probs`; null when a sidecar answered — the sidecar does not count them. */
  probs: number | null;
  /** `model` on the `_thresholds` header, absent on every file written before phase 4. */
  model: string | null;
  source: "sidecar" | "parsed";
};

/** The header's inner shape is explicitly unpinned, so `model` is looked for on both levels. */
export function headerModel(raw: unknown): string | null {
  const row = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const inner = (typeof row._thresholds === "object" && row._thresholds !== null ? row._thresholds : {}) as Record<string, unknown>;
  const model = inner.model ?? row.model;
  return typeof model === "string" && model ? model : null;
}

/** String scan, not `JSON.parse` per line: 251 413 rows are 33 MB and one boolean is wanted. */
export function countProbs(text: string): number {
  let count = 0;
  for (let at = text.indexOf('"probs"'); at >= 0; at = text.indexOf('"probs"', at + 7)) count += 1;
  return count;
}

export type ProvenanceSummary = {
  files: number;
  withModel: number;
  rows: number;
  sidecars: number;
  /** Files whose rows were actually scanned — the denominator the two `probs` figures belong to. */
  counted: number;
  countedRows: number;
  withProbs: number;
  probRows: number;
  /** Files read through their sidecar alone: nothing at all is known about their `probs`. */
  unknown: number;
};

/**
 * `probs` is counted only where a file was READ.
 *
 * A sidecar states no `probs`, and folding its `null` into a zero made the banner announce "0 of N
 * rows carry probs" the moment the producer started writing sidecars — the one number on `/corpus`
 * that decides what every other number is worth. Unknown is reported as unknown.
 */
export function summarize(entries: Provenance[]): ProvenanceSummary {
  const counted = entries.filter((e) => e.probs !== null);
  return {
    files: entries.length,
    withModel: entries.filter((e) => e.model !== null).length,
    rows: entries.reduce((n, e) => n + (e.rows ?? 0), 0),
    sidecars: entries.filter((e) => e.source === "sidecar").length,
    counted: counted.length,
    countedRows: counted.reduce((n, e) => n + (e.rows ?? 0), 0),
    withProbs: counted.filter((e) => (e.probs ?? 0) > 0).length,
    probRows: counted.reduce((n, e) => n + (e.probs ?? 0), 0),
    unknown: entries.length - counted.length,
  };
}

type Store = Map<string, { key: string; value: Provenance }>;
/** Pinned like `jobs.ts:56` — the fallback parse costs 50 MB and must survive a hot reload. */
const store: Store = ((globalThis as { __chesslabProvenance?: Store }).__chesslabProvenance ??= new Map());

async function parseFile(name: string, file: string): Promise<Provenance> {
  const text = await readFile(file, "utf8");
  const lines = text.split("\n").filter((line) => line.trim());
  let model: string | null = null;
  let rows = lines.length;
  if (lines[0]?.includes("_thresholds")) {
    try {
      model = headerModel(JSON.parse(lines[0]));
    } catch {
      /* an unreadable header carries no model */
    }
    rows -= 1;
  }
  return { name, rows, probs: countProbs(text), model, source: "parsed" };
}

async function sidecar(name: string, file: string): Promise<Provenance | null> {
  try {
    const row = JSON.parse(await readFile(file, "utf8")) as { cells?: unknown; model?: unknown };
    return {
      name,
      rows: typeof row.cells === "number" ? row.cells : null,
      probs: null,
      model: typeof row.model === "string" ? row.model : null,
      source: "sidecar",
    };
  } catch {
    return null;
  }
}

/** One entry per proposal file on disk, sidecar first, mtime-keyed on the file it describes. */
export async function proposalProvenance(): Promise<Provenance[]> {
  const root = path.join(dataDir(), "realgames");
  let games;
  try {
    games = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: Provenance[] = [];
  for (const game of games.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(root, game.name, "occluded-proposals.jsonl");
    const stats = await stat(file).catch(() => null);
    if (!stats) continue;
    const side = path.join(root, game.name, "occluded-proposals.summary.json");
    const sideStats = await stat(side).catch(() => null);
    const key = `${stats.mtimeMs}:${stats.size}|${sideStats ? `${sideStats.mtimeMs}:${sideStats.size}` : "none"}`;
    const hit = store.get(file);
    if (hit?.key === key) {
      out.push(hit.value);
      continue;
    }
    const value = (sideStats && (await sidecar(game.name, side))) || (await parseFile(game.name, file));
    store.set(file, { key, value });
    out.push(value);
  }
  return out;
}
