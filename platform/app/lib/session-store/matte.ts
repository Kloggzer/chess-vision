/**
 * `data/recordings/<name>/matte.jsonl` — SAM 3's alpha, per square, as a fraction. It replaced
 * the hand-painted `occluded` class: coverage is measured now (`training/occlusion.py`).
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { checkName, dataDir } from "@/lib/session-store/recordings";
import { pyCall } from "@/lib/py/worker";
import { readJsonl } from "@/lib/jsonl";
import { absentOnly, stampOrMissing } from "@/lib/measurement";
import { sessionDir } from "@/lib/session-store/session";

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
};

/** Whose alpha the row's numbers came from: SAM's, a recut correction, or a correction not yet cut. */
export type AlphaState = "sam" | "fixed" | "pending";

export type SessionMatte = Map<string, MatteFrame>;

/** `mattes/` einer Aufnahme: SAMs Schnitt und daneben die Handfassung. */
const mattesDir = (name: string): string => path.join(sessionDir(name), "mattes");

export function mattePath(name: string, stem: string): string {
  return path.join(mattesDir(name), `${checkName(stem, "frame")}.webp`);
}

/** `matte.FIXED_SUFFIX` — the hand-corrected alpha sits BESIDE SAM's cut and never over it. */
export function fixedMattePath(name: string, stem: string): string {
  return path.join(mattesDir(name), `${checkName(stem, "frame")}.fixed.webp`);
}

/** What a viewer should show: the correction when there is one, SAM's cut otherwise. */
export async function alphaPath(name: string, stem: string): Promise<string> {
  const fixed = fixedMattePath(name, stem);
  return (await stat(fixed).catch(absentOnly)) !== null ? fixed : mattePath(name, stem);
}

/** Corrected alphas of one session as `stem -> mtime`; absent directory means nobody painted. */
export async function fixedAlphas(name: string): Promise<Map<string, number>> {
  const dir = mattesDir(name);
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

/** Nur ein verschwundenes File ist leer. EBUSY oder EMFILE landeten sonst als "nie gemattet" unter
 *  dem ECHTEN Stempel und standen, bis sich die Datei bewegt. */
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

/** `matte.jsonl` ist eine Historie: je Frame gilt die JUENGSTE Zeile (`session_store.matte.effective_rows`).
 *  Eine spaetere Absage nimmt eine fruehere Messung zurueck. */
function latestFrames(text: string): { frames: SessionMatte; corrupt: number } {
  const frames: SessionMatte = new Map();
  const read = readJsonl(text);
  for (const line of read.rows) {
    const row = line as unknown as {
      frame: string; ply?: number; reason?: string; skipped?: string; alpha?: string;
      concepts?: Record<string, number>; coverage?: Record<string, number>;
      merged_at?: string;
    };
    frames.set(row.frame, {
      stem: row.frame,
      ply: row.ply,
      reason: row.reason,
      concepts: row.concepts ?? {},
      ...(row.coverage ? { coverage: row.coverage } : {}),
      ...(row.alpha ? { alpha: row.alpha } : {}),
      ...(row.skipped ? { skipped: row.skipped } : {}),
      ...(typeof row.merged_at === "string" ? { mergedAt: row.merged_at } : {}),
    });
  }
  return { frames, corrupt: read.corrupt };
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
  /** Davon die, auf die SAM noch nicht geantwortet hat — daran haengt die Kette. Ein abgelehntes
   *  Frame haelt den Schritt nicht auf: SAM wuerde es wieder ablehnen. */
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

/** `chain_state.matte_census` (Python): `done` gegen den `occluded`-Stapel DIESES Exports,
 *  `target` ist die Absicht EINES Laufs — was "fertig" fuer die Kette heisst. */
export function matteCensus(name: string): Promise<MatteCensus> {
  return pyCall<MatteCensus>("matte_census", { root: dataDir(), name: checkName(name, "game name"), target: matteTarget() });
}
