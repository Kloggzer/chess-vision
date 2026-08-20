/**
 * `data/recordings/<name>/model-reads.jsonl` — every square of a session as ONE model read it
 * (`chesslab realgames model-read <name> --model <run dir>`). It carries no verdict of its own:
 * the rows are `probs` beside the FEN's word, and `lib/query.ts` asks the questions.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { checkName, gameDir } from "@/lib/data";
import {
  type Filter,
  type ModelRead,
  classesSeen,
  matches,
  acceptLabel,
  readKey,
  topRead,
  DISAGREE,
} from "@/lib/query";

export { acceptLabel, classesSeen, DISAGREE, matches, readKey, topRead };
export type { Filter, ModelRead };

/** The header line. `model` is `null` only on a file whose first line was never written. */
export type ReadHeader = { model: string | null; classes: string[]; writtenAt: string | null };

export type ModelReads = {
  rows: ModelRead[];
  header: ReadHeader;
  /** `false` = no model has read this session — not measured, which is not the same as nothing. */
  present: boolean;
};

const NO_HEADER: ReadHeader = { model: null, classes: [], writtenAt: null };

const str = (o: Record<string, unknown>, key: string): string | null =>
  typeof o[key] === "string" && o[key] ? (o[key] as string) : null;

function parseHeader(obj: Record<string, unknown>): ReadHeader {
  const classes = Array.isArray(obj._classes) ? obj._classes.filter((c): c is string => typeof c === "string") : [];
  return { model: str(obj, "_model"), classes, writtenAt: str(obj, "_written_at") };
}

/** Mtime-keyed to avoid re-parsing the corpus per hot reload (REVIEW.md S12). */
type Cache = Map<string, { key: string; value: ModelReads }>;
const cache: Cache = ((globalThis as { __chesslabModelReads?: Cache }).__chesslabModelReads ??= new Map());

export function readsPath(name: string): string {
  return path.join(gameDir(checkName(name, "game name")), "model-reads.jsonl");
}

export async function loadModelReads(name: string): Promise<ModelReads> {
  const file = readsPath(name);
  const key = await stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");
  const hit = cache.get(file);
  if (hit?.key === key) return hit.value;

  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    const missing: ModelReads = { rows: [], header: NO_HEADER, present: false };
    cache.set(file, { key, value: missing });
    return missing;
  }

  const rows: ModelRead[] = [];
  let header = NO_HEADER;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue; // a half-written line is not a read (`lib/pool.ts:24-28`)
    }
    if ("_model" in obj || "_classes" in obj) header = parseHeader(obj);
    else rows.push(obj as unknown as ModelRead);
  }
  const value: ModelReads = { rows, header, present: true };
  cache.set(file, { key, value });
  return value;
}

export type ReadCensus = {
  /** Distinct frames the model read — the denominator a human clears (CONCEPT.md 6.2). */
  boards: number;
  cells: number;
  frames: string[];
  model: string | null;
  writtenAt: string | null;
  /** `false` = no file; every count above is 0 because nobody asked, so a surface prints `—`. */
  present: boolean;
};

export async function readCensus(name: string): Promise<ReadCensus> {
  const { rows, header, present } = await loadModelReads(name);
  const frames = new Set<string>();
  for (const row of rows) frames.add(row.frame);
  return {
    boards: frames.size,
    cells: rows.length,
    frames: [...frames].sort(),
    model: header.model,
    writtenAt: header.writtenAt,
    present,
  };
}

/** Cells are the wrong noun: their count changes with the query; a board is stable (CONCEPT.md 6.2). */
export function boardProgress(
  readFrames: Iterable<string>,
  judged: Iterable<string>,
): { boards: number; done: number } {
  const seen = new Set(readFrames);
  const touched = new Set<string>();
  for (const key of judged) {
    const frame = key.slice(0, key.indexOf("|"));
    if (seen.has(frame)) touched.add(frame);
  }
  return { boards: seen.size, done: touched.size };
}

export async function boardProgressOf(
  name: string,
  judged: Iterable<string>,
): Promise<{ census: ReadCensus; boards: number; done: number }> {
  const census = await readCensus(name);
  return { census, ...boardProgress(census.frames, judged) };
}
