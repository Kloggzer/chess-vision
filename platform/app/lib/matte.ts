/**
 * `data/sessions/rg-<name>/matte.jsonl` — SAM 3's alpha, per square, as a fraction. It replaced
 * the hand-painted `occluded` class: coverage is measured now (`training/occlusion.py`).
 */
import { readFile, stat } from "node:fs/promises";
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
};

export type SessionMatte = Map<string, MatteFrame>;

export function mattePath(name: string, stem: string): string {
  return path.join(sessionDir(name), "mattes", `${checkName(stem, "frame")}.webp`);
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
        frame: string; ply?: number; reason?: string; skipped?: string;
        concepts?: Record<string, number>; coverage?: Record<string, number>;
      };
      value.set(row.frame, {
        stem: row.frame,
        ply: row.ply,
        reason: row.reason,
        concepts: row.concepts ?? {},
        coverage: row.coverage ?? {},
        ...(row.skipped ? { skipped: row.skipped } : {}),
      });
    } catch {
      /* a half-written line carries no alpha */
    }
  }
  cache.set(file, { key, value });
  return value;
}
