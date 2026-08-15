/**
 * The exported session (`data/sessions/rg-<name>/`, phase 01) as the relabel views need it:
 * one row per FRAME with its ply, its FEN and its own corner quad.
 *
 * Read paths are mtime-keyed (CLAUDE.md: never re-read a whole manifest per request) — the log
 * of a 10 000-frame video is ~2 MB and every crop request would otherwise parse it again.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { checkName, dataDir, loadCandidate } from "@/lib/data";
import { type CropParams, type GridMesh, meshFromLines } from "@/lib/warp";

/**
 * Where a frame sits between the two commits that bound its interval — the labeling context.
 *
 * "die stillen fens sind alle akurat die nerven nur" (2026-08-09): the FEN is not equally
 * trustworthy across an interval, and a labeler needs to know WHICH side of it a frame is on.
 * `after` is the hand withdrawing from the move that just landed — the FEN is true and the
 * occluders are real. `before` is the next move being played: the piece may ALREADY have moved
 * while the interval FEN has not caught up, which is why the exporter marks `unknown_squares`
 * there and nowhere else. `settled` is the quiet middle, clear of both hands.
 *
 * Whether a hand is in the frame is the EXPORTER's word (`dirty`, written from the quiet margin);
 * only which SIDE is derived here, from the commit frames in `candidate.json` and the ply on the
 * row — so this needs no re-export. Checked against 3 772 real rows: `unknown_squares`, which the
 * exporter writes on the trailing window alone, lands on a `before` frame every single time.
 * Distances are reported raw (frames and seconds) so the phase never has to be taken on faith.
 */
export type FramePhase = "settled" | "after" | "before";
export type SessionRow = {
  stem: string;
  ply: number;
  fen: string;
  corners: number[][];
  phase: FramePhase;
  /** Frames since the commit that established this FEN, and until the next commit. */
  since: number;
  to: number;
  /** Seconds, at the recording's own frame rate — what a human reasons in. */
  sinceS: number;
  toS: number;
  /** Squares the exporter refuses to vouch for on this frame (the next move's footprint). */
  unknown: string[];
  /** The frame's 18 measured grid lines, when `session fit-mesh` could put them there. */
  mesh?: GridMesh;
};
export type Session = {
  name: string;
  sessionId: string;
  rows: SessionRow[];
  byStem: Map<string, SessionRow>;
  plies: Map<number, string[]>;
  boardSize: number;
  margin: number | number[];
  crop: CropParams;
  whitePov: boolean;
};

export function sessionId(name: string): string {
  return `rg-${checkName(name, "game name")}`;
}

export function sessionDir(name: string): string {
  return path.join(dataDir(), "sessions", sessionId(name));
}

export function framePath(name: string, stem: string): string {
  return path.join(sessionDir(name), "frames", `${checkName(stem, "frame")}.png`);
}

const cache = new Map<string, { key: number; value: Session }>();

/** Log + the candidate's geometry block — the two files the crops are cut from. */
export async function loadSession(name: string): Promise<Session> {
  const log = path.join(sessionDir(name), "log.jsonl");
  const key = (await stat(log)).mtimeMs;
  // Keyed by the PATH, not the bare name: `CHESSLAB_DATA_DIR` is a variable, and two roots
  // holding a session of the same name would otherwise share an entry whenever their logs
  // happened to land in the same millisecond.
  const hit = cache.get(log);
  if (hit?.key === key) return hit.value;

  const candidate = await loadCandidate(name);
  // The frame each ply was committed at, and the frame the NEXT commit closes it at. A ply with
  // no successor has no known end; its interval is left open and every frame in it reads `after`.
  const commit = new Map(candidate.moves.map((m) => [m.ply, m.frame]));
  const closes = new Map(candidate.moves.map((m, i) => [m.ply, candidate.moves[i + 1]?.frame]));
  const fps = candidate.clock?.fps ?? 30;

  const rows: SessionRow[] = [];
  for (const line of (await readFile(log, "utf8")).split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as {
      frame: string;
      ply: number;
      fen: string;
      corners: number[][];
      dirty?: boolean;
      unknown_squares?: string[];
      grid_lines?: unknown;
    };
    const stem = path.basename(row.frame, ".png");
    const at = Number(stem);
    const since = at - (commit.get(row.ply) ?? at);
    const end = closes.get(row.ply);
    const to = end === undefined ? Number.POSITIVE_INFINITY : end - at;
    rows.push({
      stem,
      ply: row.ply,
      fen: row.fen,
      corners: row.corners,
      phase: !row.dirty ? "settled" : since <= to ? "after" : "before",
      since,
      to,
      sinceS: since / fps,
      toS: to / fps,
      unknown: row.unknown_squares ?? [],
      mesh: meshFromLines(row.grid_lines),
    });
  }
  const geometry = candidate.geometry ?? {};
  const source = candidate.source ?? {};
  const value: Session = {
    name,
    sessionId: sessionId(name),
    rows,
    byStem: new Map(rows.map((r) => [r.stem, r])),
    plies: rows.reduce((m, r) => m.set(r.ply, [...(m.get(r.ply) ?? []), r.stem]), new Map()),
    boardSize: geometry.board_size ?? 928,
    margin: geometry.margin ?? 0,
    crop: { pad_up: source.crop?.pad_up ?? 0, pad_side: source.crop?.pad_side ?? 0.05 },
    whitePov: true,
  };
  cache.set(log, { key, value });
  return value;
}

