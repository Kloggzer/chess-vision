/**
 * `data/recordings/<name>/matte.jsonl` — SAM 3's alpha, per square, as a fraction. It replaced
 * the hand-painted `occluded` class: coverage is measured now (`training/occlusion.py`).
 */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { checkName, dataDir } from "@/lib/session-store/recordings";
import { pyCall } from "@/lib/py/worker";
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

type Row = { ply?: number; reason?: string; concepts?: Record<string, number>; coverage?: Record<string, number>;
  alpha?: string; skipped?: string; merged_at?: string };
type Cached = { key: string; value: SessionMatte };
const sets: Map<string, Cached> = ((globalThis as { __chesslabMatteSets?: Map<string, Cached> }).__chesslabMatteSets ??= new Map());

/** One session's mattes, je Frame die JUENGSTE Zeile — Python liest (`session_store.matte.effective_rows`,
 *  eine kaputte Zeile MITTENDRIN wirft). Mtime-gekeyt: ein 12 000-Frame-Lauf sind ~7 MB JSON. */
export async function loadMatte(name: string): Promise<SessionMatte> {
  const file = path.join(sessionDir(name), "matte.jsonl");
  const key = (await stampOrMissing(file)) ?? "none";
  const hit = sets.get(file);
  if (hit?.key === key) return hit.value;
  const rows = key === "none" ? {} : await pyCall<Record<string, Row>>("matte_frames", { root: dataDir(), name: checkName(name, "game name") });
  const value: SessionMatte = new Map(Object.entries(rows).map(([stem, r]) => [stem, {
    stem,
    ply: r.ply,
    reason: r.reason,
    concepts: r.concepts ?? {},
    ...(r.coverage ? { coverage: r.coverage } : {}),
    ...(r.alpha ? { alpha: r.alpha } : {}),
    ...(r.skipped ? { skipped: r.skipped } : {}),
    ...(r.merged_at ? { mergedAt: r.merged_at } : {}),
  }]));
  sets.set(file, { key, value });
  return value;
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

/** `chain_state.matte_census` (Python): `done` gegen den `occluded`-Stapel DIESES Exports,
 *  `target` ist die Absicht EINES Laufs — was "fertig" fuer die Kette heisst. */
export function matteCensus(name: string): Promise<MatteCensus> {
  return pyCall<MatteCensus>("matte_census", { root: dataDir(), name: checkName(name, "game name"), target: matteTarget() });
}
