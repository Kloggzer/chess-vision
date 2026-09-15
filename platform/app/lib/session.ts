/**
 * The exported session (`data/recordings/<name>/`, phase 01) as the label views need it:
 * one row per FRAME with its ply, its FEN and its own corner quad.
 *
 * Read paths are mtime-keyed (CLAUDE.md: never re-read a whole manifest per request) — the log
 * of a 10 000-frame video is ~2 MB and every crop request would otherwise parse it again.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { checkName, gameDir, loadCandidate } from "@/lib/data";
import { type CropParams, type GridMesh, type Mat3, meshFromLines } from "@/lib/warp";

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
  // TODO: nur `session.test.ts` liest das. `crops.ts` schneidet mit `sampleBox`, nicht mit
  // `sampleBoxMesh` wie der Stored-Weg — entweder der Schnitt braucht das Netz, oder die
  // Zeile parst es je Log-Zeile umsonst. Das ist eine Entwurfsfrage, kein Aufraeumen.
  mesh?: GridMesh;
  /** The stored board's own path and scale (`realgames.write_board`). A homography lets board
   *  coordinates cancel against it; a stored raster does not, so both are read, never assumed. */
  board?: { rel: string; size: number; border: number; straightened: boolean };
  /** Why the exporter refused to vouch for this frame — `occluded` is the one with an alpha. */
  dirtyReason?: string;
  /** `settle_dev` liegt an: dann entscheidet die ZELLE, ob ein Label gilt, nicht die Frame-Klasse. */
  measured: boolean;
  /** Das Urteil „hier steht keine gueltige Stellung" (`session flag --unusable`). `slice_session`
   *  und `matte.alpha_worker` ueberspringen die Zeile beide. */
  unusable: boolean;
};
export type Session = {
  name: string;
  sessionId: string;
  rows: SessionRow[];
  byStem: Map<string, SessionRow>;
  plies: Map<number, string[]>;
  /** ply -> the halfmove and the position it leaves behind. A log row's `ply` is the position
   *  AFTER that halfmove, so `moves.get(row.ply)` produced what the frame shows and `ply + 1`
   *  is the one being played into it. */
  moves: Map<number, { san: string; fen: string }>;
  boardSize: number;
  crop: CropParams;
  whitePov: boolean;
};

export function sessionId(name: string): string {
  return `rg-${checkName(name, "game name")}`;
}

/** Inverse of `sessionId` — the id stays `rg-`-prefixed, the directory on disk never was. */
export function recordingName(session_id: string): string {
  return checkName(session_id.replace(/^rg-/, ""), "session id");
}

/** The session was merged INTO its recording (2026-08-20); both names now name one directory. */
export function sessionDir(name: string): string {
  return gameDir(name);
}

/** The row's OWN `board` path: a dirty frame's raster lives under `dirty/`, a clean one under
 *  `boards/`, and assuming either one serves the wrong pixels for half the session. */
export function boardPath(name: string, rel: string): string {
  return path.join(sessionDir(name), ...rel.split("/").map((part) => checkName(part, "board path")));
}

/**
 * Board coordinates -> pixels of the STORED board: scale to its side, then shift past its border.
 *
 * The candidate's geometry says 1008 where the export profile says 928, and the two only ever
 * agreed because a homography absorbs the difference. Reading the row's own numbers is what keeps
 * the label view on the training crop instead of 8 % beside it (measured at 14 dB before this).
 */
export function boardToStored(session: Session, board: { size: number; border: number }): Mat3 {
  const s = board.size / session.boardSize;
  return [s, 0, board.border, 0, s, board.border, 0, 0, 1];
}

const cache = new Map<string, { key: string; value: Session }>();

/** Log + the candidate's geometry block — the two files the crops are cut from. */
export async function loadSession(name: string): Promise<Session> {
  const log = path.join(sessionDir(name), "log.jsonl");
  // Beide Dateien im Schluessel: Brettgroesse, Crop-Parameter, fps und die Commit-Grenzen kommen
  // aus `candidate.json`, ein Schnitt auf altem Stand trifft das falsche Feld.
  const stamp = async (file: string) =>
    stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");
  const key = `${await stamp(log)}|${await stamp(path.join(sessionDir(name), "candidate.json"))}`;
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
      board?: string;
      board_size?: number;
      board_border?: number;
      board_straightened?: boolean;
      dirty_reason?: string;
      settle_dev?: number[];
      unusable?: boolean;
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
      board: row.board && row.board_size
        ? { rel: row.board, size: row.board_size, border: row.board_border ?? 0,
            straightened: row.board_straightened === true }
        : undefined,
      dirtyReason: row.dirty_reason,
      measured: (row.settle_dev ?? []).length > 0,
      unusable: row.unusable === true,
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
    moves: new Map(candidate.moves.flatMap((m) => (m.fen_after ? [[m.ply, { san: m.san, fen: m.fen_after }] as const] : []))),
    boardSize: geometry.board_size ?? 928,
    crop: { pad_side: source.crop?.pad_side ?? 0.05 },
    whitePov: true,
  };
  cache.set(log, { key, value });
  return value;
}

