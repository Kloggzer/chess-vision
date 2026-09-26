/** The exported session as the label views need it: one row per FRAME with its ply, FEN and quad.
 *  Mtime-keyed — the log of a 10 000-frame video is ~2 MB, parsed once, not per crop request. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { checkName, gameDir, loadCandidate } from "@/lib/session-store/recordings";
import { readJsonl } from "@/lib/jsonl";
import { absentOnly, stampOrMissing } from "@/lib/measurement";

/** `after`: the hand withdrawing from the move that just landed — FEN true. `before`: the next move
 *  being played, the piece may ALREADY have moved (the exporter marks `unknown_squares` only here).
 *  Whether a hand is in the frame is the exporter's `dirty`; only the SIDE is derived here. */
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
  /** Why the exporter refused to vouch for this frame — `occluded` is the one with an alpha. */
  dirtyReason?: string;
  /** `settle_dev` liegt an: dann entscheidet die ZELLE, ob ein Label gilt, nicht die Frame-Klasse. */
  settleMeasured: boolean;
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

const cache = new Map<string, { key: string; value: Session }>();

/** `null` heisst "der Export lief nie" (ENOENT); jeder andere Fehler nahm die Aufnahme sonst lautlos
 *  aus `progress`, und der Nenner stand ueber einer anderen Grundgesamtheit. */
export const exportedSession = (name: string): Promise<Session | null> => loadSession(name).catch(absentOnly);

/** Log + candidate (moves, fps) — mtime-keyed on both. */
export async function loadSession(name: string): Promise<Session> {
  const log = path.join(sessionDir(name), "log.jsonl");
  // Beide Dateien im Schluessel: Brettgroesse, Crop-Parameter, fps und die Commit-Grenzen kommen
  // aus `candidate.json`, ein Schnitt auf altem Stand trifft das falsche Feld.
  const stamp = async (file: string) => (await stampOrMissing(file)) ?? "none";
  const key = `${await stamp(log)}|${await stamp(path.join(sessionDir(name), "candidate.json"))}`;
  // Keyed by the PATH, not the bare name: `CHESSLAB_DATA_DIR` is a variable, and two roots with a
  // session of the same name would otherwise share an entry.
  const hit = cache.get(log);
  if (hit?.key === key) return hit.value;

  const candidate = await loadCandidate(name);
  // The frame each ply was committed at, and the frame the NEXT commit closes it at. A ply with
  // no successor has no known end; its interval is left open and every frame in it reads `after`.
  const commit = new Map(candidate.moves.map((m) => [m.ply, m.frame]));
  const closes = new Map(candidate.moves.map((m, i) => [m.ply, candidate.moves[i + 1]?.frame]));
  // Keine Vorgabe: die Aufnahmen auf dieser Platte laufen zwischen 14,8 und 30,0 fps, eine
  // erfundene 30 verdoppelt `sinceS`/`toS` und die Sekundenangabe sieht dabei normal aus.
  const fps = candidate.clock?.fps;
  if (!fps) throw new Error(`${name}: candidate.json nennt keine clock.fps — ohne sie sind die Sekunden geraten`);

  const rows: SessionRow[] = [];
  // Die halbe LETZTE Zeile ist ein laufender Export und darf die Seite nicht kosten; jede
  // andere kaputte Zeile kann kein Schreiber erklaeren und wird gemeldet, nicht verschluckt.
  const read = readJsonl(await readFile(log, "utf8"));
  if (read.corrupt > 0) {
    throw new Error(`${log}: ${read.corrupt} beschaedigte Zeile(n) — nicht das Ende einer laufenden Ausfuhr`);
  }
  for (const line of read.rows) {
    const row = line as unknown as {
      frame: string;
      ply: number;
      fen: string;
      corners: number[][];
      dirty?: boolean;
      unknown_squares?: string[];
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
      dirtyReason: row.dirty_reason,
      settleMeasured: (row.settle_dev ?? []).length > 0,
      unusable: row.unusable === true,
    });
  }
  const value: Session = {
    name,
    sessionId: sessionId(name),
    rows,
    byStem: new Map(rows.map((r) => [r.stem, r])),
    plies: rows.reduce((m, r) => m.set(r.ply, [...(m.get(r.ply) ?? []), r.stem]), new Map()),
    moves: new Map(candidate.moves.flatMap((m) => (m.fen_after ? [[m.ply, { san: m.san, fen: m.fen_after }] as const] : []))),
  };
  cache.set(log, { key, value });
  return value;
}

