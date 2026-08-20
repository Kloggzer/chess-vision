/**
 * `/corpus` §7.1, POOL and DIFF: what a slice run RIGHT NOW would yield, against the snapshot.
 *
 * POOL is the ledgers over the exported sessions — every log frame's FEN expanded to its 64 cells,
 * with `corrections.jsonl` winning last per `(session_id, str(frame), square)`, the same tuple
 * `labeling.load_corrections` dedups on. DIFF exists because datasets are snapshots and nothing is
 * incremental (docs/data-pipeline.md §5.9): without it nobody can see which labels made it in.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { correctionsPath } from "@/lib/corrections";
import { dataDir } from "@/lib/data";
import { sameSession, type CorpusIndex, type Split } from "@/lib/corpus";
import { sessionId } from "@/lib/session";

const cellKey = (sessionId: string, frame: string | number, square: string) =>
  `${sessionId}|${String(frame)}|${square}`;

/** Last line wins — an undo is a superseding row, never a deletion (`lib/corrections.ts`). */
export function dedupCorrections(lines: Iterable<string>): Map<string, string> {
  const last = new Map<string, string>();
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as { session_id: string; frame: string | number; square: string; label: string };
      last.set(cellKey(row.session_id, row.frame, row.square), row.label);
    } catch {
      /* a half-written line is not a verdict */
    }
  }
  return last;
}

const FILES = "abcdefgh";

/** The 64 labels a FEN asserts, in `config.CLASSES` spelling — a FEN never says `occluded`. */
export function fenLabels(fen: string): Record<string, string> {
  const out: Record<string, string> = {};
  const ranks = fen.split(" ")[0].split("/");
  for (let i = 0; i < ranks.length && i < 8; i++) {
    let file = 0;
    for (const ch of ranks[i]) {
      if (file > 7) break;
      if (ch >= "1" && ch <= "8") {
        for (let n = Number(ch); n > 0 && file < 8; n--) out[`${FILES[file++]}${8 - i}`] = "empty";
      } else {
        out[`${FILES[file++]}${8 - i}`] = (ch === ch.toUpperCase() ? "w" : "b") + ch.toUpperCase();
      }
    }
  }
  return out;
}

type LogFrame = { stem: string; fen: string; dirty: boolean };
export type SessionLog = { sessionId: string; frames: LogFrame[] };

export type Pool = {
  classes: Record<string, number>;
  /** Occluded cells per exported session — §7.1's "drin / NICHT drin" list is built from this. */
  occludedBySession: Record<string, number>;
  frames: number;
  cells: number;
  /** Corrections for a cell no exported log carries: pool that has no snapshot to land in (§9.3). */
  orphans: number;
};

/** Cells, not crops and not boards: one entry per square of every exported log frame. */
export function foldPool(sessions: SessionLog[], corrections: Map<string, string>): Pool {
  const pool: Pool = { classes: {}, occludedBySession: {}, frames: 0, cells: 0, orphans: 0 };
  let hits = 0;
  for (const session of sessions) {
    pool.occludedBySession[session.sessionId] ??= 0;
    for (const frame of session.frames) {
      pool.frames += 1;
      for (const [square, fenLabel] of Object.entries(fenLabels(frame.fen))) {
        const corrected = corrections.get(cellKey(session.sessionId, frame.stem, square));
        if (corrected !== undefined) hits += 1;
        const label = corrected ?? fenLabel;
        pool.classes[label] = (pool.classes[label] ?? 0) + 1;
        if (label === "occluded") pool.occludedBySession[session.sessionId] += 1;
        pool.cells += 1;
      }
    }
  }
  pool.orphans = corrections.size - hits;
  return pool;
}

/** Positive = the pool is ahead of the snapshot, which is what a rebuild would add. */
export const occludedDiff = (pool: number, snapshot: number) => pool - snapshot;

export type SnapshotOccluded = { total: number; bySession: Record<string, number> };

/** What the built dataset actually carries as `occluded`, per train session id (aliases included). */
export function snapshotOccluded(index: CorpusIndex, split: Split): SnapshotOccluded {
  const bySession: Record<string, number> = {};
  for (const id of split.splits?.train ?? []) {
    const n = index.sessions[id]?.classes.occluded ?? 0;
    if (n > 0) bySession[id] = n;
  }
  return { total: Object.values(bySession).reduce((a, b) => a + b, 0), bySession };
}

export type OccludedFit = {
  inside: { sessionId: string; datasetSessionId: string; crops: number }[];
  outside: string[];
};

/**
 * Which exported session's occluded labels are IN the snapshot, and which are not.
 *
 * A session can sit in the dataset under `rg-…` and still be "not in": only the `occ-…` slices
 * carry occluded crops, so membership is decided on the occluded count, never on the session list.
 */
export function occludedFit(pool: Pool, snapshot: SnapshotOccluded): OccludedFit {
  const fit: OccludedFit = { inside: [], outside: [] };
  for (const [sessionId, cells] of Object.entries(pool.occludedBySession)) {
    if (cells === 0) continue;
    const hits = Object.entries(snapshot.bySession).filter(([id]) => sameSession(id, sessionId));
    if (hits.length === 0) fit.outside.push(sessionId);
    for (const [datasetSessionId, crops] of hits) fit.inside.push({ sessionId, datasetSessionId, crops });
  }
  return fit;
}

type Cached<T> = { key: string; value: T };
type Store = { logs?: Cached<SessionLog[]>; pool?: Cached<Pool> };
/** Pinned like `jobs.ts:56`: a dev reload must not re-expand 12 641 FENs and 18 k ledger rows. */
const store: Store = ((globalThis as { __chesslabPool?: Store }).__chesslabPool ??= {});

function recordingsDir(): string {
  return path.join(dataDir(), "recordings");
}

/** Directory names, not ids: the merge dropped the `rg-` prefix from the folder alone. */
async function recordingNames(): Promise<string[]> {
  try {
    const entries = await readdir(recordingsDir(), { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

/**
 * Every exported session's log, mtime-keyed.
 *
 * Read once for both readers: the pool expands the FENs, §7.3's dirty ratio counts the same rows,
 * and 12 641 rows parsed twice per request is the read-model cost §6.3 asks not to pay.
 */
export async function sessionLogs(): Promise<SessionLog[]> {
  return (await keyedLogs()).value;
}

async function keyedLogs(): Promise<Cached<SessionLog[]>> {
  const names = await recordingNames();
  const files = names.map((name) => path.join(recordingsDir(), name, "log.jsonl"));
  const stats = await Promise.all(files.map((file) => stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none")));
  const key = names.map((name, i) => `${name}@${stats[i]}`).join(",");
  if (store.logs?.key === key) return store.logs;

  const value: SessionLog[] = [];
  for (const [i, name] of names.entries()) {
    if (stats[i] === "none") continue;
    const frames: LogFrame[] = [];
    for (const line of (await readFile(files[i], "utf8")).split("\n")) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as { frame: string; fen: string; dirty?: boolean };
        frames.push({ stem: path.basename(row.frame, ".png"), fen: row.fen, dirty: row.dirty === true });
      } catch {
        /* a half-written line carries no FEN */
      }
    }
    value.push({ sessionId: sessionId(name), frames });
  }
  store.logs = { key, value };
  return store.logs;
}

export async function loadPool(): Promise<Pool> {
  const logs = await keyedLogs();
  const names = await recordingNames();
  const files = names.map((name) => correctionsPath(name));
  const stats = await Promise.all(files.map((file) => stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none")));
  const key = `${names.map((name, i) => `${name}@${stats[i]}`).join(",")}|${logs.key}`;
  if (store.pool?.key === key) return store.pool.value;

  const lines: string[] = [];
  for (const file of files) lines.push(...(await readFile(file, "utf8").catch(() => "")).split("\n"));
  const value = foldPool(logs.value, dedupCorrections(lines));
  store.pool = { key, value };
  return value;
}
