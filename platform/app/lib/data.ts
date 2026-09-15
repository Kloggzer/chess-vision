/**
 * Filesystem access to `CHESSLAB_DATA_DIR` — the only bridge to the Python side is the format.
 *
 * Nothing here imports or shells out to chesslab (specs/53 entry.md, ownership registry).
 */
import { readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { lcsReport, reviewedPlies } from "@/lib/lcs";
import { parseReference, type Reference } from "@/lib/pgn";

type Move = {
  ply: number;
  san: string;
  frame: number;
  t?: number;
  decider?: string;
  fen_after?: string;
  /** The quad the decider stood on at this commit — the export cuts the ply's interval through it. */
  corners?: number[][];
};
export type Candidate = {
  name: string;
  confirmed?: boolean;
  confirmed_at?: string;
  created_at?: string;
  reviewed_plies?: number[];
  /** Plies, die ein Mensch gestrichen hat, weil die LCS eine SAN traf und keine Stellung. */
  struck_plies?: number[];
  start_fen?: string;
  moves: Move[];
  /** Board geometry of the recording — the cell crops are cut through it (`lib/warp.ts`). */
  geometry?: { corners?: number[][]; margin?: number | number[]; board_size?: number };
  /** The recording's own frame rate — commit distances are reported in seconds off it. */
  clock?: { fps?: number };
  source?: { lens?: boolean; crop?: { pad_side?: number; out_size?: number[] } };
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
  return path.join(dataDir(), "recordings", checkName(name, "game name"));
}

/**
 * Die Aufnahme muss schon dastehen, bevor ein Ledger neben sie geschrieben wird.
 *
 * `mkdir(recursive)` legte sie sonst aus einem Tippfehler in `session_id` an, und `listGames`
 * fuehrt jedes Verzeichnis als Aufnahme — mit Trainingseingabe darin.
 */
export async function requireRecording(dir: string, session_id: string): Promise<void> {
  const ok = await stat(dir).then((s) => s.isDirectory(), () => false);
  if (!ok) throw new Error(`keine Aufnahme ${session_id} auf dieser Maschine (${dir})`);
}

export async function listGames(): Promise<string[]> {
  try {
    const entries = await readdir(path.join(dataDir(), "recordings"), { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch (e) {
    // Eine fehlende Wurzel ist ein frisches Projekt. Ein kaputtes `CHESSLAB_DATA_DIR` ist es
    // nicht — als leere Liste sieht es genauso aus, und niemand sucht dann nach dem Pfad.
    if ((e as { code?: string })?.code !== "ENOENT") throw e;
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
  return (await readReference(name))?.sans ?? null;
}

/** `reference.pgn` as read — null without the file; with one, `problem` says why `sans` can be null. */
export async function readReference(name: string): Promise<Reference | null> {
  try {
    return parseReference(await readFile(path.join(gameDir(name), "reference.pgn"), "utf8"));
  } catch {
    return null;
  }
}

/**
 * `labeled` = the burst the label verb writes under `review/`, `plain` = a `:desktop rectify`
 * board under `review-extra/`. The SIZE is read off the file rather than assumed: review frames
 * were 720x816 with the tracker's belief drawn under the board until 2026-08-16 and are the bare
 * square board since, and the move overlay has to land on the squares of both.
 */
export type FrameStem = { stem: string; kind: "labeled" | "plain"; width: number; height: number };

/** `AnnotatedFrames.REVIEW_SUFFIX` first, then what every run before 2026-08-17 wrote. */
const REVIEW_EXTS = [".webp", ".png"];

/** Width and height off the header. From a BUFFER: sharp given a path keeps the file mapped, and a
 *  mapped file cannot be replaced on Windows — 13 review boards a rebuild wrote went nowhere (2026-09-06). */
async function frameSize(file: string): Promise<{ width: number; height: number }> {
  try {
    const meta = await sharp(await readFile(file)).metadata();
    return { width: meta.width ?? 720, height: meta.height ?? 816 };
  } catch {
    return { width: 720, height: 816 };
  }
}

/** The label verb writes `frames/` (`LabelSession.review`), runs before 2026-08-17 left `review/`. */
const LABELED_DIRS = ["frames", "review"];

/** Where a review frame actually is — a run writes WebP, everything older left PNG behind. */
export async function reviewFramePath(name: string, stem: string): Promise<string | null> {
  const safe = checkName(stem, "frame");
  for (const dir of [...LABELED_DIRS, "review-extra"]) {
    for (const ext of REVIEW_EXTS) {
      const file = path.join(gameDir(name), dir, `${safe}${ext}`);
      if (await stat(file).then(() => true, () => false)) return file;
    }
  }
  return null;
}

/** Every review-frame stem on disk, both sources, numerically sorted; `labeled` wins a tie. */
export async function listFrameStems(name: string): Promise<FrameStem[]> {
  const stemsOf = async (dir: string) => {
    try {
      const entries = await readdir(path.join(gameDir(name), dir));
      return entries.filter((e) => /^\d+\.(webp|png)$/.test(e)).map((e) => e.replace(/\.\w+$/, ""));
    } catch {
      return [];
    }
  };
  const seen = new Set<string>();
  const found: { stem: string; kind: FrameStem["kind"] }[] = [];
  for (const [dir, kind] of [...LABELED_DIRS.map((d) => [d, "labeled"] as const), ["review-extra", "plain"] as const]) {
    for (const stem of await stemsOf(dir)) {
      if (!seen.has(stem)) found.push({ stem, kind });
      seen.add(stem);
    }
  }
  const out: FrameStem[] = await Promise.all(
    found.map(async ({ stem, kind }) => ({
      stem,
      kind,
      ...(await frameSize((await reviewFramePath(name, stem)) ?? "")),
    })),
  );
  return out.sort((a, b) => a.stem.localeCompare(b.stem));
}

export async function framePng(name: string, stem: string): Promise<Buffer> {
  const file = await reviewFramePath(name, stem);
  if (file === null) throw new Error(`no review frame ${stem} for ${name}`);
  return readFile(file);
}

/**
 * Stamp `confirmed` / `confirmed_at` / `reviewed_plies` and NOTHING else.
 *
 * Byte-preserving on every other key: a plain parse would print the file's `0.0` back as `0`,
 * so numbers are carried through as raw source text. Write is tmp + rename, like
 * `realgames.write_confirmation` — a half-written label is worse than none.
 */
export async function writeConfirmation(name: string, kept: number[], drop: number[] = []): Promise<number[]> {
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
  // A matched ply is not automatically a TRUE one. The LCS compares SAN sequences, and a
  // transposition makes it match a move to the same move played later: `2026-08-13-19-34-23`'s
  // replay committed `Nf6` where the board actually showed `e5`, and the LCS matched that `Nf6` to
  // the reference's own — four plies later. The position it stamps on its commit window never
  // existed, so the human must be able to strike it.
  // Gestrichenes bleibt gestrichen: `drop` wurde nur angewendet und nie gespeichert, also holte
  // der naechste Aufruf ohne Liste die Plies zurueck — und `/api/zuege` schickt nie eine.
  const struck = [...new Set([...(candidate.struck_plies ?? []), ...drop])].sort((a, b) => a - b);
  const dropped = new Set(struck);
  const plies = reviewedPlies(candidate.moves, matched, kept.filter((j) => inventedSet.has(j))).filter(
    (ply) => !dropped.has(ply),
  );

  doc.confirmed = true;
  doc.confirmed_at = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  doc.reviewed_plies = plies;
  if (struck.length > 0) doc.struck_plies = struck;

  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(doc, null, 2) + "\n", "utf8");
  await rename(tmp, file);
  return plies;
}
