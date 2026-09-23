/**
 * `data/recordings/<name>/model-reads.jsonl` — every square of a session as ONE model read it
 * (`chesslab realgames model-read <name> --model <run dir>`). It carries no verdict of its own:
 * the rows are `probs` beside the FEN's word, and `lib/query.ts` asks the questions.
 */
import path from "node:path";
import { checkName, gameDir } from "@/lib/data";
import {
  type ModelRead,
  readKey,
  topRead,
} from "@/lib/query";
import { loadMeasurement, type Measurement } from "@/lib/measurement";

export { readKey, topRead };
export type { ModelRead };

/** The header line. `model` is `null` only on a file whose first line was never written. */
type ReadHeader = { model: string | null; classes: string[]; writtenAt: string | null };

type ModelReadsValue = { rows: ModelRead[]; header: ReadHeader };
/** `measured: false` = no model has read this session — not measured, which is not nothing. */
export type ModelReads = Measurement<ModelReadsValue>;

const NO_HEADER: ReadHeader = { model: null, classes: [], writtenAt: null };

const str = (o: Record<string, unknown>, key: string): string | null =>
  typeof o[key] === "string" && o[key] ? (o[key] as string) : null;

function parseHeader(obj: Record<string, unknown>): ReadHeader {
  const classes = Array.isArray(obj._classes) ? obj._classes.filter((c): c is string => typeof c === "string") : [];
  return { model: str(obj, "_model"), classes, writtenAt: str(obj, "_written_at") };
}

function readsPath(name: string): string {
  return path.join(gameDir(checkName(name, "game name")), "model-reads.jsonl");
}

/** Mtime-keyed to avoid re-parsing the corpus per hot reload. */
export function loadModelReads(name: string): Promise<ModelReads> {
  return loadMeasurement(readsPath(name), parse);
}

function parse(lines: Record<string, unknown>[]): ModelReadsValue {
  const rows: ModelRead[] = [];
  let header = NO_HEADER;
  for (const obj of lines) {
    if ("_model" in obj || "_classes" in obj) header = parseHeader(obj);
    else rows.push(obj as unknown as ModelRead);
  }
  return { rows, header };
}

/** Die Zeilen, oder leer, wenn kein Modell gelesen hat — wer nur zaehlt, fragt nicht nach `—`. */
export async function modelReadRows(name: string): Promise<ModelRead[]> {
  const m = await loadModelReads(name);
  return m.measured ? m.value.rows : [];
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
  const reads = await loadModelReads(name);
  const { rows, header } = reads.measured ? reads.value : { rows: [], header: NO_HEADER };
  const frames = new Set<string>();
  for (const row of rows) frames.add(row.frame);
  return {
    boards: frames.size,
    cells: rows.length,
    frames: [...frames].sort(),
    model: header.model,
    writtenAt: header.writtenAt,
    present: reads.measured,
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
