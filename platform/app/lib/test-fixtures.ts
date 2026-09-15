/**
 * Datenwurzel und Aufnahme in der Form, die die PRODUKTION schreibt: mit den vier
 * `board*`-Schluesseln (Brett-Store, 2026-08-17) und mit `clock.fps`. Die alten Formen gibt es
 * nur auf ausdrueckliche Bestellung — `board: false`, `fps: null`.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { onTestFinished } from "vitest";

export const BOARD_SIZE = 928;
export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Eine Wurzel je Test, `CHESSLAB_DATA_DIR` gesetzt, und wieder weg — 45 von 55 Dateien liessen
 *  ihre Temp-Verzeichnisse stehen. Aufruf aus `beforeEach` oder aus dem Test selbst. */
export async function tempDataRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), `chesslab-${prefix}-`));
  process.env.CHESSLAB_DATA_DIR = root;
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  return root;
}

export type RowSpec = {
  /** Frame-Nummer; der Stem wird auf sechs Stellen aufgefuellt, wie der Export ihn schreibt. */
  frame: number;
  ply?: number;
  fen?: string;
  corners?: number[][];
  dirty?: boolean;
  /** `false` laesst die vier `board*`-Schluessel weg — die Zeilenform von vor dem Brett-Store. */
  board?: boolean;
  boardSize?: number;
  boardBorder?: number;
  straightened?: boolean;
  /** Weitere Log-Schluessel, roh wie der Export sie schreibt (`grid_lines`, `settle_dev`, …). */
  extra?: Record<string, unknown>;
};

export function stemOf(frame: number): string {
  return String(frame).padStart(6, "0");
}

/** Ein dirty Frame liegt unter `dirty/`, ein sauberes unter `boards/` (`session.boardPath`). */
export function sessionRow(spec: RowSpec): Record<string, unknown> {
  const stem = stemOf(spec.frame);
  const dirty = spec.dirty ?? false;
  const row: Record<string, unknown> = {
    frame: `frames/${stem}.png`,
    ply: spec.ply ?? 1,
    fen: spec.fen ?? START_FEN,
    corners: spec.corners ?? [],
    ...(dirty ? { dirty: true } : {}),
  };
  if (spec.board !== false) {
    Object.assign(row, {
      board: `${dirty ? "dirty" : "boards"}/${stem}.webp`,
      board_size: spec.boardSize ?? BOARD_SIZE,
      board_border: spec.boardBorder ?? 0,
      board_straightened: spec.straightened ?? true,
    });
  }
  return { ...row, ...spec.extra };
}

export function logText(rows: RowSpec[]): string {
  return rows.length === 0 ? "" : rows.map((r) => JSON.stringify(sessionRow(r))).join("\n") + "\n";
}

export type SessionSpec = {
  root: string;
  name?: string;
  rows?: RowSpec[];
  moves?: object[];
  /** `null` schreibt `candidate.json` ohne `clock.fps` — darauf wirft `loadSession` seit 2026-09-15. */
  fps?: number | null;
  boardSize?: number;
  /** Ueberschreibt Felder des `candidate.json`, nachdem die Vorgaben stehen. */
  candidate?: Record<string, unknown>;
};

/** Schreibt `candidate.json` + `log.jsonl` und gibt das Aufnahmeverzeichnis zurueck. */
export async function writeSession(spec: SessionSpec): Promise<string> {
  const name = spec.name ?? "g";
  const dir = path.join(spec.root, "recordings", name);
  await mkdir(dir, { recursive: true });
  const candidate: Record<string, unknown> = {
    name,
    ...(spec.fps === null ? {} : { clock: { fps: spec.fps ?? 25 } }),
    geometry: { board_size: spec.boardSize ?? BOARD_SIZE },
    moves: spec.moves ?? [],
    ...spec.candidate,
  };
  await writeFile(path.join(dir, "candidate.json"), JSON.stringify(candidate), "utf8");
  await writeLog(dir, spec.rows ?? []);
  return dir;
}

export async function writeLog(dir: string, rows: RowSpec[]): Promise<void> {
  await writeFile(path.join(dir, "log.jsonl"), logText(rows), "utf8");
}
