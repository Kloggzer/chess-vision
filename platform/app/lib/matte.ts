/**
 * `data/recordings/<name>/matte.jsonl` — SAM 3's alpha, per square, as a fraction. It replaced
 * the hand-painted `occluded` class: coverage is measured now (`training/occlusion.py`).
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { checkName } from "@/lib/data";
import { readJsonl } from "@/lib/jsonl";
import { absentOnly, stampOrMissing } from "@/lib/measurement";
import { frameReviews } from "@/lib/review-notes";
import { sessionDir, sessionId } from "@/lib/session";

export type MatteFrame = {
  stem: string;
  ply?: number;
  /** Which `dirty_reason` the alpha was cut for; only `occluded` frames carry one. */
  reason?: string;
  concepts: Record<string, number>;
  /** Fehlt bei SAMs Absage: dort wurde NICHTS gemessen, und `{}` hiesse "gemessen und frei". */
  coverage?: Record<string, number>;
  /** SAM 3 refused this frame (zone too big, board unreadable) — there is no alpha on disk. */
  skipped?: string;
  /** `"fixed"` once `occluders recut` has read a hand-corrected alpha into these numbers. */
  alpha?: string;
  /** `session temporal-merge` added cells SAM called clear — when, and which. */
  mergedAt?: string;
  /** `_source.log` (`chesslab.provenance`): der Export, gegen den das Alpha geschnitten wurde. */
  source?: string;
};

/** Whose alpha the row's numbers came from: SAM's, a recut correction, or a correction not yet cut. */
export type AlphaState = "sam" | "fixed" | "pending";

export type SessionMatte = Map<string, MatteFrame>;

export function mattePath(name: string, stem: string): string {
  return path.join(sessionDir(name), "mattes", `${checkName(stem, "frame")}.webp`);
}

/** `matte.FIXED_SUFFIX` — the hand-corrected alpha sits BESIDE SAM's cut and never over it. */
export function fixedMattePath(name: string, stem: string): string {
  return path.join(sessionDir(name), "mattes", `${checkName(stem, "frame")}.fixed.webp`);
}

/** What a viewer should show: the correction when there is one, SAM's cut otherwise. */
export async function alphaPath(name: string, stem: string): Promise<string> {
  const fixed = fixedMattePath(name, stem);
  return (await stat(fixed).catch(absentOnly)) !== null ? fixed : mattePath(name, stem);
}

/** Corrected alphas of one session as `stem -> mtime`; absent directory means nobody painted. */
export async function fixedAlphas(name: string): Promise<Map<string, number>> {
  const dir = path.join(sessionDir(name), "mattes");
  const out = new Map<string, number>();
  const names = (await readdir(dir).catch(absentOnly)) ?? [];
  for (const file of names.filter((f) => f.endsWith(".fixed.webp"))) {
    // Verschwunden zwischen `readdir` und `stat` heisst: es gibt keine Korrektur mehr.
    const at = await stat(path.join(dir, file)).catch(absentOnly);
    if (at !== null) out.set(file.slice(0, -".fixed.webp".length), at.mtimeMs);
  }
  return out;
}

/** When `matte.jsonl` last changed — a correction newer than that has not reached the numbers. */
export function matteStamp(name: string): Promise<number> {
  return stat(path.join(sessionDir(name), "matte.jsonl")).catch(absentOnly).then((s) => s?.mtimeMs ?? 0);
}

/**
 * The browser paints pixels; only `occluders recut` turns them into coverage. `pending` is what
 * the human has to see, because until then the numbers on screen are still SAM's.
 */
export function alphaState(row: MatteFrame, fixedAt: number | undefined, recutAt: number): AlphaState {
  if (fixedAt === undefined) return "sam";
  return row.alpha === "fixed" && fixedAt <= recutAt ? "fixed" : "pending";
}

/** Nur ein verschwundenes File ist leer. Jeder andere Lesefehler — EBUSY waehrend der Matte-Lauf
 *  schreibt, EMFILE wenn die Stream-Seite ueber 40 Aufnahmen faechert — landete sonst als "nie
 *  gemattet" unter dem ECHTEN Stempel und stand, bis sich die Datei bewegt. */
async function readOnlyMissingIsEmpty(file: string): Promise<string> {
  try {
    return await readFile(file, "utf8");
  } catch (e) {
    if ((e as { code?: string })?.code !== "ENOENT") throw e;
    return "";
  }
}

type Sets = Map<string, { key: string; value: unknown }>;
const sets: Sets = ((globalThis as { __chesslabMatteSets?: Sets }).__chesslabMatteSets ??= new Map());

/** One session's mattes, mtime-keyed — a 12 000-frame run is ~7 MB of JSON per request otherwise. */
export async function loadMatte(name: string): Promise<SessionMatte> {
  const file = path.join(sessionDir(name), "matte.jsonl");
  // Eine kaputte Zeile MITTENDRIN still zu ueberspringen nimmt einem gemessenen Frame sein Alpha,
  // und die Lane liest es danach als "nie gemattet" — der Schwanz eines laufenden Laufs nicht.
  const { frames, corrupt } = await cachedSet(file, "latest", latestFrames);
  if (corrupt > 0) throw new Error(`${file}: ${corrupt} beschaedigte Zeile(n)`);
  return frames;
}

/** `matte.jsonl` ist eine Historie: je Frame gilt die JUENGSTE Zeile — fuer die Lane, den Census
 *  und die Stempel gleich. Eine spaetere Absage nimmt eine fruehere Messung zurueck. */
function latestFrames(text: string): { frames: SessionMatte; corrupt: number } {
  const frames: SessionMatte = new Map();
  const read = readJsonl(text);
  for (const line of read.rows) {
    const row = line as unknown as {
      frame: string; ply?: number; reason?: string; skipped?: string; alpha?: string;
      concepts?: Record<string, number>; coverage?: Record<string, number>;
      merged_at?: string; _source?: { log?: unknown };
    };
    const source = row._source?.log;
    frames.set(row.frame, {
      stem: row.frame,
      ply: row.ply,
      reason: row.reason,
      concepts: row.concepts ?? {},
      ...(row.coverage ? { coverage: row.coverage } : {}),
      ...(row.alpha ? { alpha: row.alpha } : {}),
      ...(row.skipped ? { skipped: row.skipped } : {}),
      ...(typeof row.merged_at === "string" ? { mergedAt: row.merged_at } : {}),
      ...(typeof source === "string" ? { source } : {}),
    });
  }
  return { frames, corrupt: read.corrupt };
}

/** Gemessen heisst: keine Absage und eine `coverage` — auf der juengsten Zeile. */
const measured = (row: MatteFrame): boolean => row.coverage !== undefined && !row.skipped;

/** Die juengsten Zeilen ohne Diagnose: Census und Stempel werfen auf eine kaputte Zeile nicht. */
async function latestOf(name: string): Promise<SessionMatte> {
  return (await cachedSet(path.join(sessionDir(name), "matte.jsonl"), "latest", latestFrames)).frames;
}

export type MatteCensus = {
  /** Distinct frames with a row — `alpha_worker` counts `--limit` against the same set. */
  done: number;
  /** Every occluded frame of the session: the pile a targeted run deliberately does not finish. */
  total: number;
  /** What ONE run aims for, capped by the pile — the bar the chain reads. */
  target: number;
  /** Gemeldete Frames OHNE Matte. Nicht in `total`: die meisten sind `stale`, und der Stapel, den
   *  `--reason occluded` abarbeitet, kennt sie nicht — sichtbar wurden sie deshalb nie. */
  reported: number;
  /** Davon die, auf die SAM noch gar nicht geantwortet hat — die Zahl, an der die Kette haengt.
   *  Ein abgelehntes Frame bleibt in `reported` sichtbar, haelt den Schritt aber nicht ein
   *  zweites Mal auf: SAM wuerde es wieder ablehnen. */
  reportedOpen: number;
  /** Meldungen auf Frames, die dieser Export nicht mehr fuehrt — ein Re-Export waehlt andere.
   *  Es gibt kein Brett zu schneiden, also ist es keine offene Arbeit, sondern ein altes Urteil. */
  reportedOrphan: number;
  /** Vom Menschen ZUR MATTE geschickte Frames ohne Alpha (`alpha-worker --wanted`). Sie liegen
   *  auf dem dirty-Stapel, aber nicht als `occluded` — kein gewoehnlicher Lauf sieht sie. */
  wanted: number;
};

/** Frames per session one run brings the file to (`--limit`), as the overnight `--all` is driven. */
export function matteTarget(): number {
  const raw = Number(process.env.CHESSLAB_MATTE_TARGET);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 80;
}

const FRAME_ONE = /"frame":\s*"([^"]+)"/;
const BOARD_ONE = /"board":\s*"([^"]+)"/;
const OCCLUDED_ONE = /"dirty_reason":\s*"occluded"/;

/** Beide Seiten schreiben denselben Frame anders: das Log als Pfad mit Endung, `matte.jsonl` als
 *  nackten Stem. Ohne diese Normalisierung trifft der Vergleich nie zu. */
const stemOf = (value: string): string => {
  const base = value.split("/").pop()!.split(String.fromCharCode(92)).pop()!;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
};

/** Die Stems der Zeilen, die `keep` durchlaesst; `pick` nennt die Felder, die den Frame tragen,
 *  in der Reihenfolge, in der sie gelten. Ein Set, keine Zeilenzahl: ein Recut schreibt Stems doppelt. */
const stemsIn = (keep: (line: string) => boolean, pick: RegExp[] = [FRAME_ONE]) => (text: string): Set<string> => {
  const out = new Set<string>();
  for (const line of text.split(String.fromCharCode(10))) {
    if (!line || !keep(line)) continue;
    const m = pick.map((re) => re.exec(line)).find((hit) => hit !== null);
    if (m) out.add(stemOf(m[1]));
  }
  return out;
};

/** Jeder Stem mit einem Brett. Der `occluded`-Stapel ist eine TEILMENGE davon. */
const exportedStemsIn = stemsIn(() => true, [BOARD_ONE]);

/** Der aktuelle Stapel: die Stems der `occluded`-Zeilen, nicht ihre Anzahl. Eine Matte-Zeile zu
 *  einem Stem, den der Export nicht mehr waehlt, ist verwaist und zaehlt nicht als erledigt. */
const occludedStemsIn = stemsIn((line) => OCCLUDED_ONE.test(line), [BOARD_ONE, FRAME_ONE]);

/** Mtime-keyed — a card must not parse two megabytes of log per render. */
async function cachedSet<T>(file: string, tag: string,
                            read: (text: string) => T): Promise<T> {
  const key = (await stampOrMissing(file)) ?? "none";
  const id = `${file}|${tag}`;
  const hit = sets.get(id);
  if (hit?.key === key) return hit.value as T;
  const text = key === "none" ? "" : await readOnlyMissingIsEmpty(file);
  const value = read(text);
  sets.set(id, { key, value });
  return value;
}

/** Die Herkunft der Alphas, die heute noch zaehlen — `chain.ts` haelt sie gegen die `log.jsonl`.
 *  Nur Stems, die dieser Export noch fuehrt (eine verwaiste Zeile hielte die Sprosse fuer immer
 *  offen), und nur gestempelte: Altbestand hat keinen Stempel und gilt weiter. */
export async function matteSources(name: string): Promise<string[]> {
  const dir = sessionDir(name);
  const [latest, exported] = await Promise.all([
    latestOf(name),
    cachedSet(path.join(dir, "log.jsonl"), "exported", exportedStemsIn),
  ]);
  const stamps = [...latest.values()].filter((row) => measured(row) && exported.has(stemOf(row.stem)));
  return [...new Set(stamps.flatMap((row) => (row.source ? [row.source] : [])))];
}

/**
 * `done` and `total` are measured; only `target` is an intention — and it is what "done" means to
 * the chain, because 80 of 394 is the instruction carried out, not a run that stopped short.
 */
export async function matteCensus(name: string): Promise<MatteCensus> {
  const dir = sessionDir(name);
  const [latest, pile, reviews, exported] = await Promise.all([
    latestOf(name),
    cachedSet(path.join(dir, "log.jsonl"), "pile", occludedStemsIn),
    frameReviews(sessionId(name)),
    cachedSet(path.join(dir, "log.jsonl"), "exported", exportedStemsIn),
  ]);
  // Nur was BEIDES ist: brauchbar gemattet UND heute noch im Stapel. Ein Re-Export waehlt andere
  // Frames, und die alten Zeilen meldeten die Session sonst als erledigt, waehrend der Stapel
  // unberuehrt daliegt (gemessen an den sechs ungescannten Sessions, 2026-09-09).
  const rows = [...latest.values()];
  const usable = new Set(rows.filter(measured).map((row) => stemOf(row.stem)));
  const skipped = new Set(rows.filter((row) => row.skipped).map((row) => stemOf(row.stem)));
  let done = 0;
  for (const stem of usable) if (pile.has(stem)) done += 1;
  const total = pile.size;
  // Sichtbar ist jeder gemeldete Frame ohne Alpha — `usable` schliesst die von SAM abgelehnten
  // aus, und ohne sie fiele ein unschneidbarer Frame aus der Zahl, die ihn ueberhaupt zeigt.
  // OFFEN ist nur, wovon SAM noch nichts weiss: sonst haengt die Kette ewig auf `matte`.
  const open = [...reviews].filter(([stem, r]) => r.dirty && !usable.has(stem));
  // Eine Meldung auf einen Frame, den dieser Export nicht fuehrt, ist unerreichbar: `--reported`
  // findet kein Brett. Sie bleibt sichtbar, haelt die Sprosse aber nicht ewig offen.
  const orphan = open.filter(([stem]) => !exported.has(stem));
  // `openFrames` nimmt ein zur Matte geschicktes Frame aus der Lane. Ohne diese Zahl war es
  // danach nirgends mehr sichtbar UND blieb ungemattet — die Sprosse schloss sich darueber.
  const wanted = [...reviews].filter(
    ([stem, r]) => r.wanted && !usable.has(stem) && exported.has(stem),
  );
  return {
    done,
    total,
    target: Math.min(matteTarget(), total),
    reported: open.length,
    reportedOpen: open.filter(([stem]) => !skipped.has(stem) && exported.has(stem)).length,
    reportedOrphan: orphan.length,
    wanted: wanted.length,
  };
}

