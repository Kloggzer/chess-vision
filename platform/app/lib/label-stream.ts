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
import { listGames } from "@/lib/data";
import { type AuditFlag, loadAuditFlags } from "@/lib/audit-flags";
import { loadMeta } from "@/lib/meta";
import { loadProposals, splitStreams, topRead, type Proposal } from "@/lib/proposals";
import { unusableBoards } from "@/lib/review-notes";
import { recordedAt } from "@/lib/queues";
import { loadSession, sessionId, type FramePhase } from "@/lib/session";
import { uselessFlag } from "@/lib/useless";

export type StreamSession = {
  name: string;
  sessionId: string;
  /** No proposal file: the session is in the stream for its `unknown_squares` alone (REVIEW S9). */
  proposals: boolean;
  /** The producer wrote model reads here — the two identity lanes need this and never have it yet. */
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
  /** `{square: "occluded"}` the hand channel raised here, with the read that raised it. */
  hands: Record<string, string>;
  reads: Record<string, string>;
  /** `{square: <the model's word>}` where its argmax contradicts the FEN — empty without `probs`. */
  disagree: Record<string, string>;
  disagreeReads: Record<string, string>;
  /** Has at least one proposal row — the `Alle Bretter` lane and the 3 976 denominator. */
  proposed: boolean;
};

/**
 * `hi` = above the confirm threshold, `unsure` = the mid band, `control` = the 180-cell sample,
 * `wall` = the model reads a class the FEN contradicts (empty until the re-propose pass of D2).
 */
export type CellKind = "hi" | "unsure" | "control" | "wall";

export type StreamCell = {
  session: number;
  /** Its BOARD's ordinal, so a cell lane keeps position with the board lanes. */
  pos: number;
  stem: string;
  square: string;
  fen_label: string;
  score: number;
  kind: CellKind;
  /** The model's own word, on `wall` cells only — printed beside the FEN's. */
  predicted?: string;
  prob?: number;
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
  /** Per session, `stem|square -> label` from BOTH ledgers — what must not be asked again. */
  decided: Record<string, string>[];
  /** Boards with proposals corpus-wide, and how many carry a verdict (CONCEPT.md 6.2). */
  progress: { boards: number; done: number };
};

/** Newest recording first, the same reading of the two naming schemes the queues use. */
const newestFirst = (names: string[]) =>
  [...names].sort((a, b) => recordedAt(b).localeCompare(recordedAt(a)) || b.localeCompare(a));

/** Hand-shaped: grid saw it or merged score > hi; weak cells stay unsure to avoid painter-facing empty boards (2026-08-10). */
function handCells(rows: Proposal[], hi: number, lo: number): Map<string, Proposal[]> {
  const byFrame = new Map<string, Proposal[]>();
  for (const row of rows) {
    if (Math.max(row.score, row.probs?.occluded ?? 0) < lo) continue;
    if ((row.grid_score ?? 0) <= 0 && row.score <= hi) continue;
    const list = byFrame.get(row.frame);
    if (list) list.push(row);
    else byFrame.set(row.frame, [row]);
  }
  return byFrame;
}

const read = (c: Proposal) =>
  c.grid_score ? `grid ${c.grid_score.toFixed(2)}` : `score ${c.score.toFixed(2)}`;

/**
 * The filter bar's own floor (`app/relabel/[name]/filter.tsx:37`) — the identity lanes ask the same
 * question the class filter asks, so they must not answer it with a different threshold.
 */
const DISAGREE_MIN = 0.1;

/** The model's argmax against the FEN's word. `occluded` is the hand lane's job, not an identity. */
function disagreement(row: Proposal): { label: string; p: number } | null {
  const top = topRead(row);
  if (!top || top.p < DISAGREE_MIN) return null;
  return top.label !== row.fen_label && top.label !== "occluded" ? top : null;
}

/** Games a stream may show: a recording flagged `nutzlos` or archived asks for no work. */
async function liveGames(): Promise<string[]> {
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
 * One pass over the corpus. Costly by construction — no sidecar on disk carries `frames` yet, so
 * `loadProposalSummary` would parse the same rows anyway (CONCEPT.md 6.3) — but every read path it
 * uses is mtime-keyed and `globalThis`-pinned, so it is paid once per changed file, not per request.
 */
export async function loadLabelStream(): Promise<LabelStream> {
  const sessions: StreamSession[] = [];
  const boards: StreamBoard[] = [];
  const cells: StreamCell[] = [];
  const decided: Record<string, string>[] = [];
  const auditRows = await loadAuditFlags();
  const bySession = new Map<string, { index: number; byStem: Map<string, StreamBoard> }>();

  let pos = 0;
  let done = 0;
  let proposedBoards = 0;

  for (const name of await liveGames()) {
    let session;
    try {
      session = await loadSession(name);
    } catch {
      continue; // not exported yet — the chain owes this one an `export-session`
    }
    const id = sessionId(name);
    const [{ rows, thresholds }, judged, unusable] = await Promise.all([
      loadProposals(name).catch(() => ({ rows: [] as Proposal[], thresholds: { hi: 0.7, lo: 0.3, declared: false } })),
      judgedKeys(id),
      unusableBoards(id),
    ]);

    const hands = handCells(rows, thresholds.hi, thresholds.lo);
    const streams = splitStreams(rows, thresholds);
    const kinds = new Map<string, CellKind>();
    for (const c of streams.confirm) kinds.set(`${c.frame}|${c.square}`, "hi");
    for (const c of streams.unsure) kinds.set(`${c.frame}|${c.square}`, "unsure");
    for (const c of streams.control) kinds.set(`${c.frame}|${c.square}`, "control");
    // The identity evidence: the same cells, rendered as boards by `Modell ≠ FEN` and as a grid by
    // `Klassenwand`. Both stay empty until a propose run carries `--model` (CONCEPT.md D2).
    const walls = new Map<string, { label: string; p: number }>();
    const wallsByFrame = new Map<string, Proposal[]>();
    for (const row of rows) {
      const hit = disagreement(row);
      if (!hit) continue;
      walls.set(`${row.frame}|${row.square}`, hit);
      kinds.set(`${row.frame}|${row.square}`, "wall");
      const list = wallsByFrame.get(row.frame);
      if (list) list.push(row);
      else wallsByFrame.set(row.frame, [row]);
    }

    // A board is in the stream when it carries a proposal OR an unknown square — the second is the
    // `FEN unklar` lane, whose boards are partly outside the proposal corpus by construction.
    const proposedStems = new Set(rows.map((r) => r.frame));
    const stems = session.rows
      .filter((r) => (proposedStems.has(r.stem) || r.unknown.length > 0) && !unusable.has(r.stem))
      .sort((a, b) => a.stem.localeCompare(b.stem));
    if (stems.length === 0) continue;

    const index = sessions.length;
    sessions.push({
      name,
      sessionId: id,
      proposals: rows.length > 0,
      probs: rows.some((r) => r.probs !== undefined),
    });

    const byStem = new Map<string, StreamBoard>();
    const seen: Record<string, string> = {};
    for (const row of stems) {
      const flagged = hands.get(row.stem) ?? [];
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
        hands: Object.fromEntries(flagged.map((c) => [c.square, "occluded"])),
        reads: Object.fromEntries(flagged.map((c) => [c.square, read(c)])),
        disagree: Object.fromEntries(wall.map((c) => [c.square, walls.get(`${c.frame}|${c.square}`)!.label])),
        disagreeReads: Object.fromEntries(
          wall.map((c) => {
            const hit = walls.get(`${c.frame}|${c.square}`)!;
            return [c.square, `${hit.label} ${hit.p.toFixed(2)}`];
          }),
        ),
        proposed: proposedStems.has(row.stem),
      };
      boards.push(board);
      byStem.set(row.stem, board);
      if (board.proposed) proposedBoards++;
    }
    // Only the stream's own frames: the ledgers hold verdicts for boards no lane shows.
    const touched = new Set<string>();
    for (const [key, label] of judged) {
      const stem = key.slice(0, key.indexOf("|"));
      const board = byStem.get(stem);
      if (!board) continue;
      seen[key] = label;
      if (board.proposed) touched.add(stem);
    }
    done += touched.size;
    decided.push(seen);

    for (const row of rows) {
      const kind = kinds.get(`${row.frame}|${row.square}`);
      const board = byStem.get(row.frame);
      if (!kind || !board) continue;
      const wall = walls.get(`${row.frame}|${row.square}`);
      cells.push({
        session: index,
        pos: board.pos,
        stem: row.frame,
        square: row.square,
        fen_label: row.fen_label,
        score: row.score,
        kind,
        ...(wall ? { predicted: wall.label, prob: wall.p } : {}),
      });
    }
    bySession.set(id, { index, byStem });
  }

  return {
    sessions,
    boards,
    cells,
    audit: auditRows.present ? auditCells(auditRows.rows, bySession) : null,
    decided,
    progress: { boards: proposedBoards, done },
  };
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
