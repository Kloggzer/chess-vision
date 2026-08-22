/**
 * `data/recordings/<name>/matte.jsonl` — SAM 3's alpha, per square, as a fraction. It replaced
 * the hand-painted `occluded` class: coverage is measured now (`training/occlusion.py`).
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { checkName } from "@/lib/data";
import { frameReviews } from "@/lib/review-notes";
import { sessionDir, sessionId } from "@/lib/session";

export type MatteFrame = {
  stem: string;
  ply?: number;
  /** Which `dirty_reason` the alpha was cut for; only `occluded` frames carry one. */
  reason?: string;
  concepts: Record<string, number>;
  coverage: Record<string, number>;
  /** SAM 3 refused this frame (zone too big, board unreadable) — there is no alpha on disk. */
  skipped?: string;
  /** `"fixed"` once `occluders recut` has read a hand-corrected alpha into these numbers. */
  alpha?: string;
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
  return (await stat(fixed).then(() => true, () => false)) ? fixed : mattePath(name, stem);
}

/** Corrected alphas of one session as `stem -> mtime`; absent directory means nobody painted. */
export async function fixedAlphas(name: string): Promise<Map<string, number>> {
  const dir = path.join(sessionDir(name), "mattes");
  const out = new Map<string, number>();
  const names = await readdir(dir).catch(() => [] as string[]);
  for (const file of names.filter((f) => f.endsWith(".fixed.webp"))) {
    const at = await stat(path.join(dir, file)).then((s) => s.mtimeMs, () => 0);
    out.set(file.slice(0, -".fixed.webp".length), at);
  }
  return out;
}

/** When `matte.jsonl` last changed — a correction newer than that has not reached the numbers. */
export function matteStamp(name: string): Promise<number> {
  return stat(path.join(sessionDir(name), "matte.jsonl")).then((s) => s.mtimeMs, () => 0);
}

/**
 * The browser paints pixels; only `occluders recut` turns them into coverage. `pending` is what
 * the human has to see, because until then the numbers on screen are still SAM's.
 */
export function alphaState(row: MatteFrame, fixedAt: number | undefined, recutAt: number): AlphaState {
  if (fixedAt === undefined) return "sam";
  return row.alpha === "fixed" && fixedAt <= recutAt ? "fixed" : "pending";
}

type Cache = Map<string, { key: string; value: SessionMatte }>;
const cache: Cache = ((globalThis as { __chesslabMattes?: Cache }).__chesslabMattes ??= new Map());

/** One session's mattes, mtime-keyed — a 12 000-frame run is ~7 MB of JSON per request otherwise. */
export async function loadMatte(name: string): Promise<SessionMatte> {
  const file = path.join(sessionDir(name), "matte.jsonl");
  const key = await stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");
  const hit = cache.get(file);
  if (hit?.key === key) return hit.value;

  const value: SessionMatte = new Map();
  const text = key === "none" ? "" : await readFile(file, "utf8").catch(() => "");
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as {
        frame: string; ply?: number; reason?: string; skipped?: string; alpha?: string;
        concepts?: Record<string, number>; coverage?: Record<string, number>;
      };
      value.set(row.frame, {
        stem: row.frame,
        ply: row.ply,
        reason: row.reason,
        concepts: row.concepts ?? {},
        coverage: row.coverage ?? {},
        ...(row.alpha ? { alpha: row.alpha } : {}),
        ...(row.skipped ? { skipped: row.skipped } : {}),
      });
    } catch {
      /* a half-written line carries no alpha */
    }
  }
  cache.set(file, { key, value });
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
};

/** Frames per session one run brings the file to (`--limit`), as the overnight `--all` is driven. */
export function matteTarget(): number {
  const raw = Number(process.env.CHESSLAB_MATTE_TARGET);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 80;
}

type Counts = Map<string, { key: string; value: number }>;
const counts: Counts = ((globalThis as { __chesslabMatteCounts?: Counts }).__chesslabMatteCounts ??= new Map());

const FRAME = /"frame":\s*"([^"]+)"/g;
const OCCLUDED = /"dirty_reason":\s*"occluded"/g;

/** Distinct, not lines: `recut_fixed` rewrites the file whole, and 27 stems came back twice on
 *  14-32-33 — line counts then read "done" while frames of the pile are still missing. */
const frames = (text: string) => new Set([...text.matchAll(FRAME)].map((m) => m[1])).size;
const occluded = (text: string) => (text.match(OCCLUDED) ?? []).length;

/** Mtime-keyed like `loadMatte` — a card must not parse two megabytes of log per render. */
async function counted(file: string, tag: string, count: (text: string) => number): Promise<number> {
  const key = await stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");
  const id = `${file}|${tag}`;
  const hit = counts.get(id);
  if (hit?.key === key) return hit.value;
  const text = key === "none" ? "" : await readFile(file, "utf8").catch(() => "");
  const value = count(text);
  counts.set(id, { key, value });
  return value;
}

/**
 * `done` and `total` are measured; only `target` is an intention — and it is what "done" means to
 * the chain, because 80 of 394 is the instruction carried out, not a run that stopped short.
 */
export async function matteCensus(name: string): Promise<MatteCensus> {
  const dir = sessionDir(name);
  const [done, total, matted, reviews] = await Promise.all([
    counted(path.join(dir, "matte.jsonl"), "frames", frames),
    counted(path.join(dir, "log.jsonl"), "occluded", occluded),
    matteStems(path.join(dir, "matte.jsonl")),
    frameReviews(sessionId(name)),
  ]);
  const reported = [...reviews].filter(([stem, r]) => r.dirty && !matted.has(stem)).length;
  return { done, total, target: Math.min(matteTarget(), total), reported };
}

/** Die Stems, die eine Matte-Zeile haben — `done` zählt sie nur, hier braucht es die Namen. */
async function matteStems(file: string): Promise<Set<string>> {
  const text = await readFile(file, "utf8").catch(() => "");
  return new Set([...text.matchAll(FRAME)].map((m) => m[1]));
}
