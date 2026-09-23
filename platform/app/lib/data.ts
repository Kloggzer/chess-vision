/**
 * Filesystem access to `CHESSLAB_DATA_DIR` — the only bridge to the Python side is the format.
 *
 * Nothing here imports or shells out to chesslab (specs/53 entry.md, ownership registry).
 */
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { stampOf, writeFileAtomicGuarded } from "@/lib/atomic";
import { absentOnly } from "@/lib/measurement";
import { serialize } from "@/lib/serialize";
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
  /** Gegen welche `reference.pgn` bestaetigt wurde; `at` bindet den Stempel an genau diese Bestaetigung. */
  confirmed_reference?: ConfirmedReference;
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

export function recordingsDir(): string {
  return path.join(dataDir(), "recordings");
}

export function gameDir(name: string): string {
  return path.join(recordingsDir(), checkName(name, "game name"));
}

/**
 * Die Aufnahme muss schon dastehen, bevor ein Ledger neben sie geschrieben wird.
 *
 * `mkdir(recursive)` legte sie sonst aus einem Tippfehler in `session_id` an, und `listGames`
 * fuehrt jedes Verzeichnis als Aufnahme — mit Trainingseingabe darin.
 */
export async function requireRecording(dir: string, session_id: string): Promise<void> {
  const ok = (await stat(dir).catch(absentOnly))?.isDirectory() ?? false;
  if (!ok) throw new Error(`keine Aufnahme ${session_id} auf dieser Maschine (${dir})`);
}

export async function listGames(): Promise<string[]> {
  try {
    const entries = await readdir(recordingsDir(), { withFileTypes: true });
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
  } catch (e) {
    // NUR ENOENT ist "keine Referenz". Jeder andere Fehler ist eine Datei, die da ist und nicht
    // gelesen wurde — als `null` gemeldet wurde daraus "kein PGN", und `problem` blieb leer.
    if ((e as { code?: string })?.code !== "ENOENT") throw e;
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
async function frameSize(file: string): Promise<{ width: number; height: number } | null> {
  const bytes = await readFile(file).catch(absentOnly);
  if (bytes === null) return null;
  // Kein Rueckfall auf 720x816: eine geratene Groesse legt die Zugpfeile auf fremde Felder.
  const meta = await sharp(bytes).metadata().catch((cause: unknown) => {
    throw new Error(`${file}: kein lesbarer Bildkopf`, { cause });
  });
  if (!meta.width || !meta.height) throw new Error(`${file}: kein Bildkopf`);
  return { width: meta.width, height: meta.height };
}

/** The label verb writes `frames/` (`LabelSession.review`), runs before 2026-08-17 left `review/`. */
const LABELED_DIRS = ["frames", "review"];

/** Where a review frame actually is — a run writes WebP, everything older left PNG behind. */
export async function reviewFramePath(name: string, stem: string): Promise<string | null> {
  const safe = checkName(stem, "frame");
  for (const dir of [...LABELED_DIRS, "review-extra"]) {
    for (const ext of REVIEW_EXTS) {
      const file = path.join(gameDir(name), dir, `${safe}${ext}`);
      if ((await stat(file).catch(absentOnly)) !== null) return file;
    }
  }
  return null;
}

/** Every review-frame stem on disk, both sources, `labeled` wins a tie — named, not opened. */
async function frameEntries(name: string): Promise<Omit<FrameStem, "width" | "height">[]> {
  const stemsOf = async (dir: string) => {
    const entries = (await readdir(path.join(gameDir(name), dir)).catch(absentOnly)) ?? [];
    return entries.filter((e) => /^\d+\.(webp|png)$/.test(e)).map((e) => e.replace(/\.\w+$/, ""));
  };
  const seen = new Set<string>();
  const found: { stem: string; kind: FrameStem["kind"] }[] = [];
  for (const [dir, kind] of [...LABELED_DIRS.map((d) => [d, "labeled"] as const), ["review-extra", "plain"] as const]) {
    for (const stem of await stemsOf(dir)) {
      if (!seen.has(stem)) found.push({ stem, kind });
      seen.add(stem);
    }
  }
  return found;
}

/** Zaehlen braucht keinen Bildkopf: ein kaputter Frame nahm sonst die Startseite mit. */
export async function countFrames(name: string): Promise<number> {
  return (await frameEntries(name)).length;
}

/** Every review-frame stem with its measured size, numerically sorted. */
export async function listFrameStems(name: string): Promise<FrameStem[]> {
  const found = await frameEntries(name);
  // Zwischen `readdir` und dem Lesen kann ein Frame verschwinden (Neubau): der faellt weg.
  const sized = await Promise.all(
    found.map(async ({ stem, kind }) => {
      const file = await reviewFramePath(name, stem);
      const size = file === null ? null : await frameSize(file);
      return size === null ? null : { stem, kind, ...size };
    }),
  );
  return sized.filter((f): f is FrameStem => f !== null).sort((a, b) => a.stem.localeCompare(b.stem));
}

export async function framePng(name: string, stem: string): Promise<Buffer> {
  const file = await reviewFramePath(name, stem);
  // `ENOENT` wie `readFile` selbst: die Route trennt "nicht da" (404) von "unlesbar" (500) am
  // Code, und ein blanker Error zwaenge sie dazu, den Satz zu lesen.
  if (file === null) throw Object.assign(new Error(`no review frame ${stem} for ${name}`), { code: "ENOENT" });
  return readFile(file);
}

/** `md5` null = bestaetigt, als es keine Referenz gab. */
export type ConfirmedReference = { md5: string | null; at: string };

export const referenceDigest = (bytes: Buffer): string => createHash("md5").update(bytes).digest("hex");

/** `unknown`: kein Stempel, oder einer, den eine spaetere Bestaetigung ohne Stempel stehen liess. */
export function confirmedAgainst(doc: Pick<Candidate, "confirmed_at" | "confirmed_reference">,
  current: string | null): "same" | "moved" | "unknown" {
  const ref = doc.confirmed_reference;
  if (!ref || typeof ref !== "object" || ref.at !== doc.confirmed_at) return "unknown";
  return ref.md5 === current ? "same" : "moved";
}

/** Die Seite zeigte eine andere `reference.pgn` als die, gegen die jetzt geurteilt wuerde. */
export class ReferenceMoved extends Error {}

/**
 * Stamp `confirmed` / `confirmed_at` / `reviewed_plies` / `confirmed_reference` and NOTHING else.
 *
 * Byte-preserving on every other key: a plain parse would print the file's `0.0` back as `0`,
 * so numbers are carried through as raw source text. Write is tmp + rename, like
 * `realgames.write_confirmation` — a half-written label is worse than none.
 */
export async function writeConfirmation(name: string, kept: number[], drop: number[] = [],
  shownReference?: string | null): Promise<number[]> {
  const file = path.join(gameDir(name), "candidate.json");
  // Lesen-rechnen-ersetzen: ohne Riegel lasen zwei Streichungen denselben Stand und die zweite
  // vereinigte sich mit einer Liste ohne die erste — `struck_plies` verlor ein MENSCHLICHES
  // Urteil. Der Riegel sieht nur diesen Prozess, der Stempel darunter auch jeden anderen.
  return serialize(file, () => confirmUnlocked(name, file, kept, drop, shownReference));
}

async function confirmUnlocked(name: string, file: string, kept: number[], drop: number[],
  shownReference: string | null | undefined): Promise<number[]> {
  const stamp = await stampOf(file);
  const text = await readFile(file, "utf8");
  const doc = JSON.parse(text, function (_key, value, context?: { source?: string }) {
    return typeof value === "number" && context?.source
      ? (JSON as unknown as { rawJSON(t: string): unknown }).rawJSON(context.source)
      : value;
  }) as Record<string, unknown>;

  const candidate = JSON.parse(text) as Candidate;
  // EIN Lesen fuer Urteil und Stempel: zweimal gelesen koennte dazwischen eine andere landen.
  const refBytes = await readFile(path.join(gameDir(name), "reference.pgn")).catch(absentOnly);
  const refMd5 = refBytes === null ? null : referenceDigest(refBytes);
  // `shownReference`: md5 der angezeigten Referenz (null = keine); `undefined` = alter Client.
  if (shownReference !== undefined && shownReference !== refMd5) {
    throw new ReferenceMoved(`${name}: Referenz wurde waehrend der Pruefung ersetzt, Seite neu laden`);
  }
  const truth = refBytes === null ? null : (parseReference(refBytes.toString("utf8")).sans ?? null);
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
  doc.confirmed_reference = { md5: refMd5, at: doc.confirmed_at as string };
  if (struck.length > 0) doc.struck_plies = struck;

  await writeFileAtomicGuarded(file, JSON.stringify(doc, null, 2) + "\n", stamp,
    `${name}: candidate.json wurde waehrend der Bestaetigung von aussen geschrieben`);
  return plies;
}
