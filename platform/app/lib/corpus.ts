/**
 * `/corpus` §7.1–7.2: what a built dataset holds, from its own `split.json` and its manifest.
 *
 * The per-session group-by is 241 195 rows on `real14-all-80-v1`, far past the `wc -l` budget, so it
 * goes through `$CHESSLAB_DATA_DIR/inbox/corpus-index/<dataset>.json` (§6.3, artefact 3), keyed by
 * the manifest's mtime. Deliberately OUTSIDE `data/datasets/`: a dataset is a snapshot, and nothing
 * this app writes may land inside one (docs/data-pipeline.md §8).
 */
import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomic";
import { IDENTITY_CLASSES, isIdentity, LEGACY_LABEL, PIECE_VISIBLE_MAX } from "@/lib/classes";
import { checkName, dataDir } from "@/lib/data";
import { inboxDir } from "@/lib/ingest";

/** Read verbatim — every figure in §7.1 is one of these keys, none of them recomputed. */
export type Split = {
  classes: string[];
  class_weights: Record<string, number>;
  counts: Record<string, number>;
  train_class_counts: Record<string, number>;
  warnings: string[];
  splits: Record<string, string[]>;
};

type SessionCounts = { total: number; classes: Record<string, number> };

/** Rows that carry a `coverage` float, and how many sit past `PIECE_VISIBLE_MAX`. */
type CoverageTally = { rows: number; over: number };

/** Bumped when a pass counts something new — an index written before it must be rebuilt, not read. */
export const INDEX_VERSION = 2;

export type CorpusIndex = {
  dataset: string;
  /** `mtimeMs:size` of the manifest these counts came from — the whole invalidation rule. */
  key: string;
  version?: number;
  rows: number;
  sessions: Record<string, SessionCounts>;
  /** `null` = not one row carried `coverage`. Not measured is not the same as none over. */
  coverage: CoverageTally | null;
  written_at: string;
};

export type DatasetMeta = { classMode: string | null };

/** `class_mode` out of `dataset.yaml` — one scalar off one line, so no YAML parser is pulled in. */
export async function loadDatasetMeta(name: string): Promise<DatasetMeta> {
  try {
    const text = await readFile(path.join(datasetDir(name), "dataset.yaml"), "utf8");
    return { classMode: /^class_mode:[ \t]*(\S+)/m.exec(text)?.[1] ?? null };
  } catch {
    return { classMode: null };
  }
}

/** What a snapshot's labels mean. `other` is anything that is not the piece scheme (occupancy). */
export type ClassScheme = "pieces14" | "pieces13" | "other";

/**
 * From the snapshot itself. `dataset.yaml` decides only when it names one of the two modes: four
 * built packs say the older `class_mode: pieces` and carry 14 classes, so the LIST is the fallback
 * evidence rather than an unknown mode meaning "not the piece scheme".
 */
export function classScheme(split: Split, meta: DatasetMeta): ClassScheme {
  if (meta.classMode === "pieces14" || meta.classMode === "pieces13") return meta.classMode;
  const classes = split.classes ?? [];
  if (classes.includes(LEGACY_LABEL)) return "pieces14";
  return classes.length === IDENTITY_CLASSES.length && classes.every(isIdentity) ? "pieces13" : "other";
}

function datasetsDir(): string {
  return path.join(dataDir(), "datasets");
}

export function datasetDir(name: string): string {
  return path.join(datasetsDir(), checkName(name, "dataset"));
}

export function corpusIndexDir(): string {
  return path.join(inboxDir(), "corpus-index");
}

export type DatasetEntry = { name: string; split: Split | null };

/** Every directory under `data/datasets/`; `split` is null for the packs built without one. */
export async function listDatasets(): Promise<DatasetEntry[]> {
  let entries;
  try {
    entries = await readdir(datasetsDir(), { withFileTypes: true });
  } catch {
    return [];
  }
  const names = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  return Promise.all(names.map(async (name) => ({ name, split: await loadSplit(name) })));
}

async function loadSplit(name: string): Promise<Split | null> {
  try {
    return JSON.parse(await readFile(path.join(datasetDir(name), "split.json"), "utf8")) as Split;
  } catch {
    return null;
  }
}

type Tally = { rows: number; sessions: Record<string, SessionCounts>; coverage: CoverageTally | null };

/** One pass over manifest rows; a half-written line is skipped, never fatal. */
export async function tallyLines(lines: AsyncIterable<string> | Iterable<string>): Promise<Tally> {
  const tally: Tally = { rows: 0, sessions: {}, coverage: null };
  for await (const line of lines) {
    if (!line.trim()) continue;
    let row: { session_id?: unknown; label?: unknown; coverage?: unknown };
    try {
      row = JSON.parse(line) as { session_id?: unknown; label?: unknown; coverage?: unknown };
    } catch {
      continue;
    }
    const id = typeof row.session_id === "string" ? row.session_id : "?";
    const label = typeof row.label === "string" ? row.label : "?";
    const session = (tally.sessions[id] ??= { total: 0, classes: {} });
    session.total += 1;
    session.classes[label] = (session.classes[label] ?? 0) + 1;
    if (typeof row.coverage === "number") {
      const cov = (tally.coverage ??= { rows: 0, over: 0 });
      cov.rows += 1;
      if (row.coverage > PIECE_VISIBLE_MAX) cov.over += 1;
    }
    tally.rows += 1;
  }
  return tally;
}

type Memo = Map<string, CorpusIndex>;
/** Pinned like `jobs.ts:56` — a hot reload must not cost another pass over 44 MB of manifest. */
const memo: Memo = ((globalThis as { __chesslabCorpusIndex?: Memo }).__chesslabCorpusIndex ??= new Map());

async function readIndex(file: string): Promise<CorpusIndex | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as CorpusIndex;
  } catch {
    return null;
  }
}

async function writeIndex(file: string, index: CorpusIndex): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFileAtomic(file, JSON.stringify(index) + "\n");
}

/** The group-by, from the index when the manifest has not moved, rebuilt and rewritten when it has. */
export async function corpusIndex(dataset: string): Promise<CorpusIndex> {
  const manifest = path.join(datasetDir(dataset), "manifest.jsonl");
  const stats = await stat(manifest);
  const key = `${stats.mtimeMs}:${stats.size}`;
  const hit = memo.get(dataset);
  if (hit?.key === key) return hit;

  const file = path.join(corpusIndexDir(), `${dataset}.json`);
  const cached = await readIndex(file);
  if (cached?.key === key && cached.version === INDEX_VERSION) {
    memo.set(dataset, cached);
    return cached;
  }

  // Streamed, not read whole: the biggest manifest is 57 MB and the counts are all that survives.
  const lines = createInterface({ input: createReadStream(manifest, "utf8"), crlfDelay: Infinity });
  const { rows, sessions, coverage } = await tallyLines(lines);
  const index: CorpusIndex = {
    dataset, key, version: INDEX_VERSION, rows, sessions, coverage,
    written_at: new Date().toISOString(),
  };
  await writeIndex(file, index);
  memo.set(dataset, index);
  return index;
}

/** `rg-…` and its variants (`occ-rg-…`) are the recorded games; turntable, synth and phone are not. */
export const isRealGame = (sessionId: string) => sessionId.includes("rg-");

/**
 * A dataset session id may carry a variant prefix — `occ-rg-…` is the same recording as `rg-…`.
 *
 * `check_not_circular` matched literally and walked straight past that prefix (D2); the corpus view
 * must not repeat it, or it reports a session as missing that is sitting in the snapshot.
 */
export function sameSession(datasetSessionId: string, sessionId: string): boolean {
  return datasetSessionId === sessionId || datasetSessionId.endsWith(`-${sessionId}`);
}

type Share = { sessionId: string; crops: number; share: number; real: boolean };
export type Shares = { rows: Share[]; total: number; real: number; realShare: number };

/** Sessions of the TRAIN split only — the supplement question is about what the model trains on. */
export function trainShares(index: CorpusIndex, split: Split): Shares {
  const rows: Share[] = (split.splits?.train ?? [])
    .map((sessionId) => ({
      sessionId,
      crops: index.sessions[sessionId]?.total ?? 0,
      share: 0,
      real: isRealGame(sessionId),
    }))
    .sort((a, b) => b.crops - a.crops || a.sessionId.localeCompare(b.sessionId));
  const total = rows.reduce((n, r) => n + r.crops, 0);
  for (const row of rows) row.share = total ? row.crops / total : 0;
  const real = rows.filter((r) => r.real).reduce((n, r) => n + r.crops, 0);
  return { rows, total, real, realShare: total ? real / total : 0 };
}
