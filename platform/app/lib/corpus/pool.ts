/** POOL and DIFF: what a slice run RIGHT NOW would yield, against the snapshot. Corrections win last
 *  per `(session_id, str(frame), square)`, the tuple `labeling.load_corrections` dedups on. Datasets
 *  are snapshots, so without DIFF nobody sees which labels made it in. */
import { fenLabels } from "@/lib/fen";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { correctionsPath } from "@/lib/session-store/corrections";
import { listGames, RECORDING_FILES, recordingsDir } from "@/lib/session-store/recordings";
import { sameSession, type CorpusIndex, type Split } from "@/lib/corpus/corpus";
import { sessionId } from "@/lib/session-store/session";
import { stampOrMissing } from "@/lib/measurement";
import { type JsonlRead, jsonlRowsStrict, readJsonl } from "@/lib/jsonl";

const cellKey = (sessionId: string, frame: string | number, square: string) =>
  `${sessionId}|${String(frame)}|${square}`;

/** Last line wins — an undo is a superseding row, never a deletion (`lib/session-store/corrections.ts`). */
export function dedupCorrections(read: JsonlRead): Map<string, string> {
  // Eine kaputte Zeile MITTENDRIN ist kein laufender Schreiber; sie still zu ueberspringen machte aus
  // dem Urteil eines Menschen ein "gab es nie".
  if (read.corrupt > 0) throw new Error(`${read.corrupt} kaputte Zeile(n) in corrections.jsonl`);
  const last = new Map<string, string>();
  for (const row of read.rows) {
    const r = row as { session_id: string; frame: string | number; square: string; label: string };
    last.set(cellKey(r.session_id, r.frame, r.square), r.label);
  }
  return last;
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

type Cached<T> = { key: string; value: T };
type Store = { logs?: Cached<SessionLog[]>; pool?: Cached<Pool> };
/** Pinned on `globalThis`: a dev reload must not re-expand 12 641 FENs and 18 k ledger rows. */
const store: Store = ((globalThis as { __chesslabPool?: Store }).__chesslabPool ??= {});

/** Every exported session's log, mtime-keyed, read once for the pool and the dirty ratio. */
export async function sessionLogs(): Promise<SessionLog[]> {
  return (await keyedLogs()).value;
}

async function keyedLogs(): Promise<Cached<SessionLog[]>> {
  const names = await listGames();
  const files = names.map((name) => path.join(recordingsDir(), name, RECORDING_FILES.log));
  // Ein `stat`, das jeden Fehler auf "keine Datei" abschneidet, nimmt die Aufnahme aus der
  // Rechnung — ohne Meldung, als kleinere normale Zahl. Dieselbe Tuer wie `lib/measurement.ts`.
  const stats = await Promise.all(files.map(stampOrMissing));
  const key = names.map((name, i) => `${name}@${stats[i] ?? "none"}`).join(",");
  if (store.logs?.key === key) return store.logs;

  const value: SessionLog[] = [];
  for (const [i, name] of names.entries()) {
    if (stats[i] === null) continue;
    const frames: LogFrame[] = [];
    for (const line of jsonlRowsStrict(files[i], await readFile(files[i], "utf8"))) {
      const row = line as unknown as { frame: string; fen: string; dirty?: boolean };
      frames.push({ stem: path.basename(row.frame, ".png"), fen: row.fen, dirty: row.dirty === true });
    }
    value.push({ sessionId: sessionId(name), frames });
  }
  store.logs = { key, value };
  return store.logs;
}

export async function loadPool(): Promise<Pool> {
  const logs = await keyedLogs();
  const names = await listGames();
  const files = names.map((name) => correctionsPath(name));
  const stats = await Promise.all(files.map(stampOrMissing));
  const key = `${names.map((name, i) => `${name}@${stats[i] ?? "none"}`).join(",")}|${logs.key}`;
  if (store.pool?.key === key) return store.pool.value;

  // Nur ein FEHLENDES Ledger ist "noch keine Urteile". Jeder andere Lesefehler als "" zeigte die
  // Aufnahme als unkorrigiert, unter ihrem echten Stempel gecacht.
  const reads = await Promise.all(
    files.map(async (f, i) => readJsonl(stats[i] === null ? "" : await readFile(f, "utf8"))));
  const merged: JsonlRead = {
    rows: reads.flatMap((r) => r.rows),
    tail: reads.some((r) => r.tail),
    corrupt: reads.reduce((n, r) => n + r.corrupt, 0),
  };
  const value = foldPool(logs.value, dedupCorrections(merged));
  store.pool = { key, value };
  return value;
}
