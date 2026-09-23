/** POOL and DIFF: what the ledgers and sessions would yield if sliced now, against the snapshot.
 *  The pool itself is Python's (`corpus_pool`, the slice's own ledger rule); here only the diff.
 *  Datasets are snapshots, so without DIFF nobody sees which labels made it in. */
import { type CorpusIndex, sameSession, type Split } from "@/lib/corpus/corpus";
import { pyCall } from "@/lib/py/worker";
import { dataDir, listGames } from "@/lib/session-store/recordings";

export type Pool = {
  classes: Record<string, number>;
  /** Occluded cells per exported session — §7.1's "drin / NICHT drin" list is built from this. */
  occludedBySession: Record<string, number>;
  frames: number;
  cells: number;
  /** Corrections for a cell no exported log carries: pool that has no snapshot to land in (§9.3). */
  orphans: number;
};

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

/** Membership is decided on the occluded count, never on the session list: a session can sit in the
 *  dataset under `rg-…` while only its `occ-…` slices carry occluded crops. */
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

/** `corpus_pool.corpus_pool` (Python): jede Zelle jedes exportierten Log-Frames, FEN-Label mit
 *  `corrections.jsonl` darueber — gelesen wie der Slice (`labeling.load_corrections`). */
export async function loadPool(): Promise<Pool> {
  return pyCall<Pool>("pool", { root: dataDir(), names: await listGames() });
}
