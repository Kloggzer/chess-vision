/**
 * `data/sessions/rg-<name>/matte.jsonl` — SAM 3's alpha, per square, as a fraction. It replaced
 * the hand-painted `occluded` class: coverage is measured now (`training/occlusion.py`).
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { checkName } from "@/lib/data";
import { sessionDir } from "@/lib/session";

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
