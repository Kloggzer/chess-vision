/**
 * The LABELN stream (CONCEPT.md 4.2): every board of every session, ONE ordered list.
 *
 * Sessions run sequentially, newest recording first, chronological inside — a hand moves
 * gradually, so painting in time order is one continuous gesture instead of a shuffle, and
 * `lib/session-store/crops.ts` keeps 24 decoded rasters that interleaving would thrash on every board.
 *
 * Every item carries the same ordinal `pos`, which is what makes a lane a FILTER: switching one
 * searches this order instead of resetting it (`lib/label/lanes.ts` `keepPosition`).
 */
import { judgedKeys, recentVerdicts, type Ledger } from "@/lib/session-store/corrections";
import { FILES, fenLabels } from "@/lib/fen";
import { listGames } from "@/lib/session-store/recordings";
import { type AuditFlag, loadAuditFlags } from "@/lib/reports/audit-flags";
import { type PositionFlag, loadPositionFlags } from "@/lib/reports/position-flags";
import { type CorrectionViolation, loadCorrectionViolations } from "@/lib/reports/correction-violations";
import { type HandFlag, loadHandFlags } from "@/lib/reports/hand-flags";
import { type FrameHand, handKey, loadFrameHands } from "@/lib/reports/frame-hands";
import { isArchived } from "@/lib/session-store/meta";
import { modelReadRows, topRead, type ModelRead } from "@/lib/session-store/model-reads";
import { frameReviews, matteWanted, unusableBoards } from "@/lib/session-store/review-notes";
import { recordedAt } from "@/lib/chain/queues";
import { loadSession, sessionId, type FramePhase, type SessionRow } from "@/lib/session-store/session";
import { loadMatte } from "@/lib/session-store/matte";
import { unusableCells } from "@/lib/session-store/unusable-cells";
import { uselessFlag } from "@/lib/session-store/useless";

export type StreamSession = {
  name: string;
  sessionId: string;
  /** Rows carrying `probs` — what the two identity lanes need, and what only one session has. */
  probs: boolean;
  /** Stems already reported dirty. The note is on disk, so the mark must survive a reload. */
  reportedDirty: string[];
  /** Stems, die aus der Frame-Lane zur Matte geschickt wurden — sie warten, sie fragen nicht mehr. */
  matteWanted: string[];
};

export type StreamBoard = {
  /** Index into [LabelStream.sessions] — the caption, never a link (CONCEPT.md 0.2). */
  session: number;
  pos: number;
  stem: string;
  ply: number;
  fen: string;
  phase?: FramePhase;
  /** Why the exporter called it dirty. Only `occluded` can be rescued by a matte alone. */
  dirtyReason?: string;
  /** `settle_dev` liegt an: dann entscheidet die Zelle über ihr Label, nicht die Frame-Klasse. */
  settleMeasured?: boolean;
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

/** Eine Zelle der `Hand?`-Lane: was das Modell fuer verdeckt haelt, was die Matte dazu misst. */
type StreamHandCell = {
  session: number;
  pos: number;
  stem: string;
  square: string;
  fen_label: string;
  /** Der Sigmoid des MODELLS. Die Matte steht daneben — die zwei Zahlen hiessen frueher beide `cov`. */
  model_cov: number;
  matte_cov: number | null;
};

export type StreamPositionCell = {
  session: number;
  pos: number;
  stem: string;
  square: string;
  fen_label: string;
  dev: number;
  reason: string;
  temporal_score?: number;
};

type StreamAuditCell = {
  session: number;
  pos: number;
  stem: string;
  square: string;
  fen_label: string;
  predicted: string;
};

/** Eine schon beurteilte Zelle, wie „Fertige zeigen" sie zurueckholt. */
type StreamRecent = {
  session: number;
  pos: number;
  stem: string;
  square: string;
  fen_label: string;
  label: string;
  ledger: Ledger;
  ts: string;
};

export type LabelStream = {
  sessions: StreamSession[];
  boards: StreamBoard[];
  cells: StreamCell[];
  /** Zuletzt beurteilt, juengste zuerst — der Rueckweg zu dem, was man eben bestaetigt hat. */
  recent: StreamRecent[];
  /** `null` = `audit-flags.jsonl` does not exist; the chip renders `—`, never `0`. */
  audit: StreamAuditCell[] | null;
  /** Set when a matte or model read is newer than the flags — the lane then shows stale work. */
  auditStaleSince?: string;
  /** `null` = `hand-flags.jsonl` does not exist; the chip renders `—`, never `0`. */
  hands: StreamHandCell[] | null;
  /** `null` = `position-flags.jsonl` does not exist; the chip renders `—`, never `0`. */
  positions: StreamPositionCell[] | null;
  /** Aufnahmen, auf denen `settle-scan` nie lief. Sie tragen null Stellungs-Karten, und das ist
   *  keine Aussage — ohne sie las sich die Zahl der Lane als "der ganze Korpus ist geprueft". */
  positionsUnmeasured: string[];
  /** Per session, `stem|square -> label` from BOTH ledgers — what must not be asked again. */
  decided: Record<string, string>[];
  /** How far `model-read` reaches: the boards a model has read. One session of 43 on
   *  2026-08-19 — a corpus-wide run waits on a retrained model. */
  reads: { boards: number };
  /** Boards in the stream corpus-wide, and how many carry a verdict (CONCEPT.md 6.2). */
  progress: { boards: number; done: number };
  /**
   * Per session, `stem -> {square: coverage}` — SAM's measurement, carried per square so a board
   * and a crop can both print it. A stem missing from the map has no alpha at all, which is a
   * different statement from "nothing is covered" and reads as `—`. Squares at 0 are dropped.
   */
  coverage: Record<string, Record<string, number> | undefined>[];
  /** Per session, `stem -> Grund`, wo SAM ABGELEHNT hat. Eine Absage ist keine Messung: es liegt
   *  kein Alpha da, also bleibt das Frame eine offene Frage (CLAUDE.md, dieselbe Falle). */
  skipped: Record<string, string>[];
  /**
   * Per session, `stem -> Hand am BRETT` aus `frame-hands.jsonl`. Ein fehlender Stem heisst nur
   * dann "keine Hand", wenn `handScanned` die Session traegt — sonst wurde nie gemessen.
   */
  frameHands: Record<string, FrameHand>[];
  handScanned: boolean[];
  /** Per session, `frame|square` a human called unlabelable — `unusable-cells.jsonl`. Keine Lane
   *  fragt sie noch, und `iter_session_crops` macht keine Manifest-Zeile mehr daraus. */
  unusableCells: string[][];
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
      const [flag, archived] = await Promise.all([uselessFlag(name), isArchived(name)]);
      return flag === null && !archived ? name : null;
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
  const recent: StreamRecent[] = [];
  const decided: Record<string, string>[] = [];
  const coverage: Record<string, Record<string, number> | undefined>[] = [];
  const skipped: Record<string, string>[] = [];
  const frameHands: Record<string, FrameHand>[] = [];
  const unusableCell: string[][] = [];
  const handScanned: boolean[] = [];
  const gateRows = await loadFrameHands();
  // Nie gescannt = keine Aussage; die Karte fragt `handScanned`, nicht die leere Map.
  const hands = gateRows.measured ? gateRows.value : { rows: new Map<string, FrameHand>(), scannedSessions: new Set<string>() };
  const auditRows = await loadAuditFlags();
  const handRows = await loadHandFlags();
  const positionRows = await loadPositionFlags();
  const ruleRows = await loadCorrectionViolations();
  const violated = new Map<string, Map<string, CorrectionViolation>>();
  for (const row of ruleRows.measured ? ruleRows.value.rows : []) {
    const byStem = violated.get(row.session_id) ?? new Map<string, CorrectionViolation>();
    byStem.set(row.frame, row);
    violated.set(row.session_id, byStem);
  }
  const bySession = new Map<string, { index: number; byStem: Map<string, StreamBoard> }>();

  let pos = 0;
  let readBoards = 0;

  for (const name of await liveGames()) {
    let session;
    try {
      session = await loadSession(name);
    } catch (e) {
      // ENOENT heisst "der Export lief nie" — die Kette schuldet dieser Aufnahme ein
      // `export-session`. Jeder ANDERE Fehler nahm sie hier lautlos aus `progress.boards`.
      if ((e as { code?: string })?.code !== "ENOENT") throw e;
      continue;
    }
    const id = sessionId(name);
    const [rows, judged, unusable, matte, wanted, useless] = await Promise.all([
      modelReadRows(name),
      judgedKeys(name),
      unusableBoards(id),
      loadMatte(name),
      matteWanted(id),
      unusableCells(name),
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
    // `unusable` auf der Log-Zeile ist das Urteil "keine gueltige Stellung" — `slice_session`
    // ueberspringt sie, also darf keine Lane sie noch zeigen.
    const stems = session.rows
      .filter((r) => !unusable.has(r.stem) && !r.unusable)
      .sort((a, b) => a.stem.localeCompare(b.stem));
    if (stems.length === 0) continue;

    const index = sessions.length;
    sessions.push({
      name,
      sessionId: id,
      probs: rows.some((r) => r.probs !== undefined),
      reportedDirty: [...(await frameReviews(id))].flatMap(([stem, r]) => (r.dirty ? [stem] : [])),
      matteWanted: [...wanted],
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
        ...(row.dirtyReason ? { dirtyReason: row.dirtyReason } : {}),
        settleMeasured: row.settleMeasured,
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
    skipped.push(Object.fromEntries(
      [...matte].flatMap(([stem, frame]) => (frame.skipped ? [[stem, frame.skipped]] : [])),
    ));
    coverage.push(Object.fromEntries([...matte].map(([stem, frame]) => [
      stem,
      // Nullen BLEIBEN: eine geleerte Matte ist "gemessen, nichts verdeckt". Bei SAMs Absage
      // fehlt `coverage` ganz — `reachesPool` liest das Brett dann als ungemattet, was es ist.
      frame.coverage,
    ])));
    frameHands.push(Object.fromEntries(
      stems.flatMap((row) => {
        const hand = hands.rows.get(handKey(id, row.stem));
        return hand ? [[row.stem, hand] as const] : [];
      }),
    ));
    handScanned.push(hands.scannedSessions.has(id));
    unusableCell.push([...useless]);
    cells.push(...controlCells(index, stems, byStem, judged));
    for (const row of await recentVerdicts(name, RECENT_MAX)) {
      const board = byStem.get(row.frame);
      if (!board) continue;
      const { frame, ...rest } = row;
      recent.push({ session: index, pos: board.pos, stem: frame, fen_label: fenLabels(board.fen)[row.square] ?? "empty", ...rest });
    }
    bySession.set(id, { index, byStem });
  }

  const touched = decided.map((seen) => new Set(Object.keys(seen).map((k) => k.slice(0, k.indexOf("|")))));
  return {
    sessions,
    boards,
    cells,
    recent: recent.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, RECENT_MAX),
    audit: auditRows.measured ? auditCells(auditRows.value.rows, bySession) : null,
    auditStaleSince: auditRows.measured ? auditRows.value.staleSince : undefined,
    hands: handRows.measured ? handCells(handRows.value.rows, bySession) : null,
    positions: positionRows.measured ? positionCells(positionRows.value.rows, bySession) : null,
    positionsUnmeasured: positionRows.measured ? positionRows.value.unmeasured : [],
    decided,
    reads: { boards: readBoards },
    progress: { boards: boards.length, done: boards.filter((b) => touched[b.session]?.has(b.stem)).length },
    coverage,
    skipped,
    frameHands,
    handScanned,
    unusableCells: unusableCell,
  };
}

/** Cells the control takes per recording — enough to estimate a rate, few enough for one sitting. */
const CONTROL_MAX = 180;
/** Wie weit „Fertige zeigen" zurueckreicht — ein paar Seiten, nicht das ganze Ledger. */
const RECENT_MAX = 300;
const SQUARES = 64;

/**
 * FNV-1a over a frame stem. The draw has to come out the same on every load of the same ledger, or
 * the list would resize under the cursor while the user commits (`lib/label/lanes.ts` `openCells`) — so
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
function handCells(
  rows: HandFlag[],
  bySession: Map<string, { index: number; byStem: Map<string, StreamBoard> }>,
): StreamHandCell[] {
  const out: StreamHandCell[] = [];
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
      model_cov: row.model_cov,
      matte_cov: row.matte_cov,
    });
  }
  return out;
}

function positionCells(
  rows: PositionFlag[],
  bySession: Map<string, { index: number; byStem: Map<string, StreamBoard> }>,
): StreamPositionCell[] {
  const out: StreamPositionCell[] = [];
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
      dev: row.dev,
      reason: row.reason,
      ...(row.temporal_score !== undefined ? { temporal_score: row.temporal_score } : {}),
    });
  }
  return out;
}

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
    });
  }
  return out;
}
