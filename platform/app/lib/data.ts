/**
 * Filesystem access to `CHESSLAB_DATA_DIR` — the only bridge to the Python side is the format.
 *
 * Nothing here imports or shells out to chesslab (specs/53 entry.md, ownership registry).
 */
import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { Chess } from "chess.js";
import { lcsReport, reviewedPlies } from "@/lib/lcs";

export type Move = {
  ply: number;
  san: string;
  frame: number;
  t?: number;
  decider?: string;
  fen_after?: string;
};
export type Candidate = {
  name: string;
  confirmed?: boolean;
  confirmed_at?: string;
  created_at?: string;
  reviewed_plies?: number[];
  start_fen?: string;
  moves: Move[];
  /** Board geometry of the recording — the cell crops are cut through it (`lib/warp.ts`). */
  geometry?: { corners?: number[][]; margin?: number | number[]; board_size?: number };
  /** The recording's own frame rate — commit distances are reported in seconds off it. */
  clock?: { fps?: number };
  source?: { crop?: { pad_up?: number; pad_side?: number; out_size?: number[] } };
};

/** `..` and separators would let a URL segment walk out of the data dir. */
const NAME = /^[A-Za-z0-9._-]+$/;

/** Every URL segment that becomes a path component goes through here. */
export function checkName(value: string, what = "name"): string {
  if (!NAME.test(value) || value === "." || value === "..") throw new Error(`bad ${what}: ${value}`);
  return value;
}

export function dataDir(): string {
  const dir = process.env.CHESSLAB_DATA_DIR;
  if (!dir) throw new Error("CHESSLAB_DATA_DIR is unset — see platform/app/README.md");
  return dir;
}

export function gameDir(name: string): string {
  return path.join(dataDir(), "realgames", checkName(name, "game name"));
}

export async function listGames(): Promise<string[]> {
  try {
    const entries = await readdir(path.join(dataDir(), "realgames"), { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

export async function loadCandidate(name: string): Promise<Candidate> {
  return JSON.parse(await readFile(path.join(gameDir(name), "candidate.json"), "utf8"));
}

/**
 * SANs of `reference.pgn`'s mainline, or NULL when the game has no reference on disk.
 *
 * Absence is a legitimate state, not an error: a video can be tracked and labeled long before
 * anyone types its PGN, and several already are. Null means "nothing to compare against", and
 * the confirm view then puts every ply in front of the human instead of only the disagreeing
 * ones — which is the same review, just without the machine narrowing it down first.
 */
export async function truthSans(name: string): Promise<string[] | null> {
  let pgn: string;
  try {
    pgn = await readFile(path.join(gameDir(name), "reference.pgn"), "utf8");
  } catch {
    return null;
  }
  const chess = new Chess();
  chess.loadPgn(pgn);
  return chess.history();
}

/** Every review-frame stem on disk, numerically sorted — one readdir instead of a probe per card. */
export async function listFrameStems(name: string): Promise<string[]> {
  try {
    const entries = await readdir(path.join(gameDir(name), "frames"));
    return entries
      .filter((e) => /^\d+\.png$/.test(e))
      .map((e) => e.replace(/\.png$/, ""))
      .sort();
  } catch {
    return [];
  }
}

export async function framePng(name: string, stem: string): Promise<Buffer> {
  return readFile(path.join(gameDir(name), "frames", `${checkName(stem, "frame")}.png`));
}

/**
 * Stamp `confirmed` / `confirmed_at` / `reviewed_plies` and NOTHING else.
 *
 * Byte-preserving on every other key: a plain parse would print the file's `0.0` back as `0`,
 * so numbers are carried through as raw source text. Write is tmp + rename, like
 * `realgames.write_confirmation` — a half-written label is worse than none.
 */
export async function writeConfirmation(name: string, kept: number[]): Promise<number[]> {
  const file = path.join(gameDir(name), "candidate.json");
  const text = await readFile(file, "utf8");
  const doc = JSON.parse(text, function (_key, value, context?: { source?: string }) {
    return typeof value === "number" && context?.source
      ? (JSON as unknown as { rawJSON(t: string): unknown }).rawJSON(context.source)
      : value;
  }) as Record<string, unknown>;

  const candidate = JSON.parse(text) as Candidate;
  const truth = await truthSans(name);
  // No reference game: nothing is "matched", so the human's keeps ARE the reviewed plies. With
  // one, the client may only decide the unmatched ones — the matched set is not its to change.
  const all = candidate.moves.map((_, i) => i);
  const { matched, invented } = truth
    ? lcsReport(truth, candidate.moves.map((m) => m.san))
    : { matched: [] as [number, number][], invented: all };
  const inventedSet = new Set(invented);
  const plies = reviewedPlies(candidate.moves, matched, kept.filter((j) => inventedSet.has(j)));

  doc.confirmed = true;
  doc.confirmed_at = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  doc.reviewed_plies = plies;

  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(doc, null, 2) + "\n", "utf8");
  await rename(tmp, file);
  return plies;
}
