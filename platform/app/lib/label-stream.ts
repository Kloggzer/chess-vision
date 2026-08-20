/**
 * The LABELN stream (CONCEPT.md 4.2): every board of every session, ONE ordered list.
 *
 * Sessions run sequentially, newest recording first, chronological inside — a hand moves
 * gradually, so painting in time order is one continuous gesture instead of a shuffle, and
 * `lib/crops.ts` keeps 24 decoded rasters that interleaving would thrash on every board.
 *
 * Every item carries the same ordinal `pos`, which is what makes a lane a FILTER: switching one
 * searches this order instead of resetting it (`lib/lanes.ts` `keepPosition`).
 */
import { judgedKeys } from "@/lib/corrections";
import { FILES, fenLabels } from "@/lib/fen";
import { listGames } from "@/lib/data";
import { type AuditFlag, loadAuditFlags } from "@/lib/audit-flags";
import { type CorrectionViolation, loadCorrectionViolations } from "@/lib/correction-violations";
import { loadMeta } from "@/lib/meta";
import { loadModelReads, topRead, type ModelRead } from "@/lib/model-reads";
import { unusableBoards } from "@/lib/review-notes";
import { recordedAt } from "@/lib/queues";
import { loadSession, sessionId, type FramePhase, type SessionRow } from "@/lib/session";
import { loadMatte } from "@/lib/matte";
import { uselessFlag } from "@/lib/useless";

export type StreamSession = {
  name: string;
  sessionId: string;
  /** No `model-reads.jsonl`: the session is in the stream for its `unknown_squares` alone (REVIEW S9). */
  reads: boolean;
  /** Rows carrying `probs` — what the two identity lanes need, and what only one session has. */
  probs: boolean;
};

export type StreamBoard = {
  /** Index into [LabelStream.sessions] — the caption, never a link (CONCEPT.md 0.2). */
  session: number;
  pos: number;
  stem: string;
  ply: number;
  fen: string;
  phase?: FramePhase;
  sinceS?: number;
  toS?: number;
  /** Squares the exporter refuses to vouch for — the `FEN unklar` lane's whole predicate. */
  unknown: string[];
  /** python-chess status names this frame's CORRECTED board trips — the `Regelbruch` predicate. */
  violations: string[];
  /** `{square: label}` of the corrections that produced them; on file already, never a model read. */
  violating: Record<string, string>;
  /** `{square: <the model's word>}` where its argmax contradicts the FEN — empty without `probs`. */
  disagree: Record<string, string>;
  disagreeReads: Record<string, string>;
  /** A model read this board — the denominator the two identity lanes are measured against. */
  read: boolean;
};

/**
 * One cell of the control sample. It carries no model read on purpose: a control that is primed
 * with a guess measures the guess, not the FEN.
 */
export type StreamCell = {
  session: number;
  /** Its BOARD's ordinal, so a cell lane keeps position with the board lanes. */
  pos: number;
  stem: string;
  square: string;
  fen_label: string;
};

export type StreamAuditCell = {
  session: number;
  pos: number;
  stem: string;
  square: string;
  fen_label: string;
  predicted: string;
  prob: number;
  margin: number;
};

export type LabelStream = {
  sessions: StreamSession[];
  boards: StreamBoard[];
  cells: StreamCell[];
  /** `null` = `audit-flags.jsonl` does not exist; the chip renders `—`, never `0`. */
  audit: StreamAuditCell[] | null;
  /** `false` = `correction-violations.jsonl` does not exist; same `—`, for the same reason. */
  rules: boolean;
  /** Per session, `stem|square -> label` from BOTH ledgers — what must not be asked again. */
  decided: Record<string, string>[];
  /**
   * How far `model-read` reaches: boards a model has read, and sessions no model has read at all.
   * One session of 43 on 2026-08-19 — a corpus-wide run waits on a retrained model.
   */
  reads: { boards: number; without: number };
  /** Boards in the stream corpus-wide, and how many carry a verdict (CONCEPT.md 6.2). */
  progress: { boards: number; done: number };
  /**
   * Per session, `stem -> {square: coverage}` — SAM's measurement, carried per square so a board
   * and a crop can both print it. A stem missing from the map has no alpha at all, which is a
   * different statement from "nothing is covered" and reads as `—`. Squares at 0 are dropped.
   */
  coverage: Record<string, Record<string, number>>[];
};

/** Newest recording first, the same reading of the two naming schemes the queues use. */
const newestFirst = (names: string[]) =>
  [...names].sort((a, b) => recordedAt(b).localeCompare(recordedAt(a)) || b.localeCompare(a));

/** The wall query's own floor (`lib/query.ts` STEPS) — the identity lanes ask the same question,
 *  so they must not answer it with a different threshold. */
const DISAGREE_MIN = 0.1;

/** The model's argmax against the FEN's word. `occluded` is the hand lane's job, not an identity. */
function disagreement(row: ModelRead): { label: string; p: number } | null {
  const top = topRead(row);
  if (!top || top.p < DISAGREE_MIN) return null;
  return top.label !== row.fen_label && top.label !== "occluded" ? top : null;
}

/** Games a stream may show: a recording flagged `nutzlos` or archived asks for no work. */
export async function liveGames(): Promise<string[]> {
  const names = await listGames();
  const live = await Promise.all(
    names.map(async (name) => {
      const [flag, meta] = await Promise.all([uselessFlag(name), loadMeta(name)]);
      return flag === null && !meta.archived ? name : null;
    }),
  );
  return newestFirst(live.filter((n): n is string => n !== null));
}

/**
 * One pass over the corpus. Costly by construction, but every read path it uses is mtime-keyed and
 * `globalThis`-pinned, so it is paid once per changed file and not once per request.
 */
export async function loadLabelStream(): Promise<LabelStream> {
  const sessions: StreamSession[] = [];
  const boards: StreamBoard[] = [];
  const cells: StreamCell[] = [];
  const decided: Record<string, string>[] = [];
  const coverage: Record<string, Record<string, number>>[] = [];
  const auditRows = await loadAuditFlags();
  const ruleRows = await loadCorrectionViolations();
  const violated = new Map<string, Map<string, CorrectionViolation>>();
  for (const row of ruleRows.rows) {
    const byStem = violated.get(row.session_id) ?? new Map<string, CorrectionViolation>();
    byStem.set(row.frame, row);
    violated.set(row.session_id, byStem);
  }
  const bySession = new Map<string, { index: number; byStem: Map<string, StreamBoard> }>();

  let pos = 0;
  let readBoards = 0;
  let without = 0;

  for (const name of await liveGames()) {
    let session;
    try {
      session = await loadSession(name);
    } catch {
      continue; // not exported yet — the chain owes this one an `export-session`
    }
    const id = sessionId(name);
    const [{ rows }, judged, unusable, matte] = await Promise.all([
      loadModelReads(name).catch(() => ({ rows: [] as ModelRead[] })),
      judgedKeys(name),
      unusableBoards(id),
      loadMatte(name),
    ]);

    const broke = violated.get(id) ?? new Map<string, CorrectionViolation>();
    const walls = new Map<string, { label: string; p: number }>();
    const wallsByFrame = new Map<string, ModelRead[]>();
    for (const row of rows) {
      const hit = disagreement(row);
      if (!hit) continue;
      walls.set(`${row.frame}|${row.square}`, hit);
      const list = wallsByFrame.get(row.frame);
      if (list) list.push(row);
      else wallsByFrame.set(row.frame, [row]);
    }

    // Every exported frame, as CONCEPT.md 4.2 says: the reads are a model pass over one session at
    // a time, and gating the stream on them would hide 42 of 43 recordings from the free-hand lane.
    const readStems = new Set(rows.map((r) => r.frame));
    const stems = session.rows
      .filter((r) => !unusable.has(r.stem))
      .sort((a, b) => a.stem.localeCompare(b.stem));
    if (stems.length === 0) continue;
    if (rows.length === 0) without += 1;

    const index = sessions.length;
    sessions.push({
      name,
      sessionId: id,
      reads: rows.length > 0,
      probs: rows.some((r) => r.probs !== undefined),
    });

    const byStem = new Map<string, StreamBoard>();
    const seen: Record<string, string> = {};
    for (const row of stems) {
      const wall = wallsByFrame.get(row.stem) ?? [];
      const board: StreamBoard = {
        session: index,
        pos: pos++,
        stem: row.stem,
        ply: row.ply,
        fen: row.fen,
        phase: row.phase,
        sinceS: row.sinceS,
        toS: Number.isFinite(row.toS) ? row.toS : undefined,
        unknown: row.unknown,
        violations: broke.get(row.stem)?.violations ?? [],
        violating: broke.get(row.stem)?.corrections ?? {},
        disagree: Object.fromEntries(wall.map((c) => [c.square, walls.get(`${c.frame}|${c.square}`)!.label])),
        disagreeReads: Object.fromEntries(
          wall.map((c) => {
            const hit = walls.get(`${c.frame}|${c.square}`)!;
            return [c.square, `${hit.label} ${hit.p.toFixed(2)}`];
          }),
        ),
        read: readStems.has(row.stem),
      };
      boards.push(board);
      byStem.set(row.stem, board);
      if (board.read) readBoards++;
    }
    // Only the stream's own frames: the ledgers hold verdicts for boards no lane shows.
    for (const [key, label] of judged) {
      if (byStem.has(key.slice(0, key.indexOf("|")))) seen[key] = label;
    }
    decided.push(seen);
    coverage.push(Object.fromEntries([...matte].map(([stem, frame]) => [
      stem,
      Object.fromEntries(Object.entries(frame.coverage).filter(([, v]) => v > 0)),
    ])));
    cells.push(...controlCells(index, stems, byStem, judged));
    bySession.set(id, { index, byStem });
  }

  const touched = decided.map((seen) => new Set(Object.keys(seen).map((k) => k.slice(0, k.indexOf("|")))));
  return {
    sessions,
    boards,
    cells,
    audit: auditRows.present ? auditCells(auditRows.rows, bySession) : null,
    rules: ruleRows.present,
    decided,
    reads: { boards: readBoards, without },
    progress: { boards: boards.length, done: boards.filter((b) => touched[b.session]?.has(b.stem)).length },
    coverage,
  };
}

/** Cells the control takes per recording — enough to estimate a rate, few enough for one sitting. */
const CONTROL_MAX = 180;
const SQUARES = 64;

/**
 * FNV-1a over a frame stem. The draw has to come out the same on every load of the same ledger, or
 * the list would resize under the cursor while the user commits (`lib/lanes.ts` `openCells`) — so
 * the spread comes from a hash of the data, never from `Math.random`.
 */
function hash(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** The frame's first square without a verdict, in steps of 7 — coprime with 64, so the walk sees
 *  every square, and the hashed start keeps the sample off one file. */
function freeSquare(stem: string, judged: Map<string, string>): string | null {
  const start = hash(stem) % SQUARES;
  for (let j = 0; j < SQUARES; j++) {
    const at = (start + j * 7) % SQUARES;
    const square = `${FILES[at % 8]}${1 + Math.floor(at / 8)}`;
    if (!judged.has(`${stem}|${square}`)) return square;
  }
  return null;
}

/**
 * The control sample: settled frames (the exporter saw no hand), one square each, one per equal
 * slice of the recording. It is drawn from the UNJUDGED cells, and that is the point — the k-fold
 * audit owes an estimate of the error rate where nobody has ruled yet (CONCEPT.md 4.2), and a cell
 * with a verdict is measured, not estimated. Excluding them keeps the sample unbiased for that
 * population AND lets it renew: the old blind stride redrew the same 2 336 cells until they retired.
 */
function controlCells(
  index: number,
  stems: readonly SessionRow[],
  byStem: Map<string, StreamBoard>,
  judged: Map<string, string>,
): StreamCell[] {
  const settled = stems.filter((r) => r.phase === "settled" && byStem.has(r.stem));
  const verdicts = new Map<string, number>();
  for (const key of judged.keys()) {
    const stem = key.slice(0, key.indexOf("|"));
    verdicts.set(stem, (verdicts.get(stem) ?? 0) + 1);
  }
  const strata = Math.min(CONTROL_MAX, settled.length);
  const out: StreamCell[] = [];
  for (let s = 0; s < strata; s++) {
    const to = Math.floor(((s + 1) * settled.length) / strata);
    let pick: SessionRow | undefined;
    let rank = Number.POSITIVE_INFINITY;
    // Fewest verdicts wins the slice: that is what makes the next sitting move to another frame
    // instead of walking this one square by square.
    for (let i = Math.floor((s * settled.length) / strata); i < to; i++) {
      const row = settled[i];
      const n = verdicts.get(row.stem) ?? 0;
      const score = n * 2 ** 32 + hash(row.stem);
      if (n < SQUARES && score < rank) [rank, pick] = [score, row];
    }
    const square = pick ? freeSquare(pick.stem, judged) : null;
    if (!pick || !square) continue;
    out.push({
      session: index,
      pos: byStem.get(pick.stem)!.pos,
      stem: pick.stem,
      square,
      fen_label: fenLabels(pick.fen)[square] ?? "empty",
    });
  }
  return out;
}

/** Audit flags positioned in the stream; a flag on a board no lane shows cannot be rendered. */
function auditCells(
  rows: AuditFlag[],
  bySession: Map<string, { index: number; byStem: Map<string, StreamBoard> }>,
): StreamAuditCell[] {
  const out: StreamAuditCell[] = [];
  for (const row of rows) {
    const session = bySession.get(row.session_id);
    const board = session?.byStem.get(row.frame);
    if (!session || !board) continue;
    out.push({
      session: session.index,
      pos: board.pos,
      stem: row.frame,
      square: row.square,
      fen_label: row.fen_label,
      predicted: row.predicted,
      prob: row.prob,
      margin: row.margin,
    });
  }
  return out;
}
