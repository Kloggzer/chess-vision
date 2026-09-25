/** Filesystem access to `CHESSLAB_DATA_DIR`; what Python already computes is asked of `lib/py/`. */
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { Contested } from "@/lib/atomic";
import { BadRequest, NotFound } from "@/lib/http-error";
import { absentOnly, exists } from "@/lib/measurement";
import { parseReference, type Reference } from "@/lib/py/ops";
import { PyOpFailed, pyCall } from "@/lib/py/worker";
import { serialize } from "@/lib/serialize";

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
  /** The recording's own frame rate — commit distances are reported in seconds off it. */
  clock?: { fps?: number };
  source?: { lens?: boolean; crop?: { pad_side?: number; out_size?: number[] } };
};

/** `..` and separators would let a URL segment walk out of the data dir. */
const NAME = /^[A-Za-z0-9._-]+$/;

/** Every URL segment that becomes a path component goes through here. */
export function checkName(value: string, what = "name"): string {
  if (!NAME.test(value) || value === "." || value === "..") throw new BadRequest(`bad ${what}: ${value}`);
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

/** Die Dateien einer Aufnahme, die Handy, Python und Kotlin mit uns teilen — EINMAL benannt, und
 *  nur `lib/session-store/` nennt sie (`lib/recording-files.test.ts`). */
export const RECORDING_FILES = {
  log: "log.jsonl",
  matte: "matte.jsonl",
  candidate: "candidate.json",
  reference: "reference.pgn",
  modelReads: "model-reads.jsonl",
  session: "session.yaml",
} as const;

export const recordingFile = (name: string, file: keyof typeof RECORDING_FILES): string =>
  path.join(gameDir(name), RECORDING_FILES[file]);

/** Liegt ein `log.jsonl`? Nur ENOENT heisst nein — ein EACCES wirft. */
export const hasExport = (name: string): Promise<boolean> => exists(recordingFile(name, "log"));

/** Liegt eine `candidate.json`? Ein EACCES wirft — sonst ueberschriebe das Label-Werkzeug Bestaetigungen. */
export const hasCandidateFile = (name: string): Promise<boolean> => exists(recordingFile(name, "candidate"));

/** `mkdir(recursive)` legte die Aufnahme sonst aus einem Tippfehler an, und `listGames` fuehrt jedes
 *  Verzeichnis als Aufnahme. */
export async function requireRecording(dir: string, session_id: string): Promise<void> {
  const ok = (await stat(dir).catch(absentOnly))?.isDirectory() ?? false;
  if (!ok) throw new NotFound(`keine Aufnahme ${session_id} auf dieser Maschine (${dir})`);
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

/** The second a bundle was recorded, read off its name. Both schemes on disk carry the same 14
 *  digits (`2026-08-13-19-34-23` from the transfer, `VID_20260802_222741` from the camera roll);
 *  on the raw name the letter sorts above every digit and put the OLDEST recordings on top. */
export const recordedAt = (name: string) => name.replace(/\D/g, "").padEnd(14, "0").slice(0, 14);

export async function loadCandidate(name: string): Promise<Candidate> {
  return JSON.parse(await readFile(recordingFile(name, "candidate"), "utf8"));
}

/** `candidate.json` fuer eine ANZEIGE: `null` ohne Datei, `{ doc: null }` halb geschrieben (sie
 *  entsteht, waehrend `writeConfirmation` schreibt). Nur ENOENT ist "keine" — alles andere wirft. */
export async function peekCandidate(name: string): Promise<{ doc: Candidate | null } | null> {
  const text = await readFile(recordingFile(name, "candidate"), "utf8").catch(absentOnly);
  if (text === null) return null;
  try {
    return { doc: JSON.parse(text) as Candidate };
  } catch {
    return { doc: null };
  }
}

/** NULL when the game has no reference — a legitimate state: the confirm view then puts every ply
 *  in front of the human instead of only the disagreeing ones. */
export async function truthSans(name: string): Promise<string[] | null> {
  return (await readReference(name))?.sans ?? null;
}

export const referencePath = (name: string): string => recordingFile(name, "reference");

/** Die rohen Bytes — ihr md5 ist der Stempel, gegen den eine Bestaetigung urteilt. Null nur bei ENOENT. */
export const readReferenceBytes = (name: string): Promise<Buffer | null> =>
  readFile(referencePath(name)).catch(absentOnly);

/** `reference.pgn` as read — null without the file; with one, `problem` says why `sans` can be null. */
export async function readReference(name: string): Promise<Reference | null> {
  // NUR ENOENT ist "keine Referenz". Jeder andere Fehler ist eine Datei, die da ist und nicht
  // gelesen wurde — als `null` gemeldet wurde daraus "kein PGN", und `problem` blieb leer.
  const text = await readFile(referencePath(name), "utf8").catch(absentOnly);
  return text === null ? null : parseReference(text);
}

/** The SIZE is read off the file, not assumed: older review frames are 720x816 with the tracker's
 *  belief under the board, newer ones the bare square board. */
export type FrameStem = { stem: string; kind: "labeled" | "plain"; width: number; height: number };

/** `AnnotatedFrames.REVIEW_SUFFIX` first, then what every run before 2026-08-17 wrote. */
const REVIEW_EXTS = [".webp", ".png"];

/** From a BUFFER: sharp given a path keeps the file mapped, and a mapped file cannot be replaced on
 *  Windows. */
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

export type ConfirmedAgainst = "same" | "moved" | "unknown";

/** `session_store.recording.confirmation_against`: `unknown` ohne Stempel oder mit einem, den eine
 *  spaetere Bestaetigung ohne Stempel stehen liess. */
export const confirmedAgainst = (doc: Pick<Candidate, "confirmed_at" | "confirmed_reference">,
  current: string | null): Promise<ConfirmedAgainst> =>
  pyCall<ConfirmedAgainst>("confirmed_against", { candidate: doc, reference_md5: current });

/** Die Seite zeigte eine andere `reference.pgn` als die, gegen die jetzt geurteilt wuerde. */
export class ReferenceMoved extends Contested {}

/** Das Urteil des Menschen, gerechnet und geschrieben von `realgames.confirm.confirm_kept` — mit dessen
 *  Riegeln. `shownReference`: md5 der angezeigten Referenz (null = keine); `undefined` = alter Client. */
export async function writeConfirmation(name: string, kept: number[], drop: number[] = [],
  shownReference?: string | null): Promise<number[]> {
  const file = recordingFile(name, "candidate");
  const shown = shownReference === undefined ? {} : { shown_reference: shownReference };
  // Ohne Riegel lasen zwei Streichungen denselben Stand, und `struck_plies` verlor ein MENSCHLICHES
  // Urteil. Der Riegel reiht DIESEN Prozess, Pythons Stempel lehnt jeden anderen Schreiber ab.
  return serialize(file, () =>
    pyCall<number[]>("confirm", { root: dataDir(), name, kept, drop, ...shown }).catch((e: unknown) => {
      if (e instanceof PyOpFailed && e.kind === "ReferenceMoved") throw new ReferenceMoved(e.detail);
      if (e instanceof PyOpFailed && e.kind === "VerdictContested") throw new Contested(e.detail);
      throw e;
    }));
}
