/**
 * `data/realgames/<name>/occluded-proposals.jsonl` — phase 02's output, read against the schema
 * PINNED in specs/53-cnn-headroom/entry.md, never against 02's code (02 and 03b run in parallel).
 *
 * Line 1 is the `_thresholds` header; its inner shape is not pinned, so `hi`/`lo` are looked for
 * both on the header and inside its `_thresholds` value, and their absence is REPORTED, not
 * invented — the view prints which numbers it is using.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { checkName, gameDir } from "@/lib/data";
import {
  type Filter,
  type Proposal,
  classesSeen,
  framesMatching,
  matches,
  acceptLabel,
  proposalKey,
  topRead,
  DISAGREE,
} from "@/lib/query";

export { acceptLabel, classesSeen, DISAGREE, framesMatching, matches, proposalKey, topRead };
export type { Filter, Proposal };

export type Thresholds = { hi: number; lo: number; declared: boolean };
export type Proposals = {
  rows: Proposal[];
  thresholds: Thresholds;
  /** `pack` = the real artifact, `fixture` = the hand-written stand-in, `none` = nothing yet. */
  source: "pack" | "fixture" | "none";
};

/** Only used when phase 02 has not emitted a header — shown in the view as "defaults". */
const DEFAULTS = { hi: 0.7, lo: 0.3 };
/** Enough of the control stream to notice a producer that is wrong at the bottom end. */
const CONTROL_MAX = 180;

function pick(o: Record<string, unknown>, key: string): number | undefined {
  const v = o[key];
  return typeof v === "number" ? v : undefined;
}

/** Mtime-keyed to avoid re-parsing 250k rows per hot reload (REVIEW.md S12). */
type Cache = Map<string, { key: string; value: Proposals }>;
const cache: Cache = ((globalThis as { __chesslabProposals?: Cache }).__chesslabProposals ??= new Map());

export async function loadProposals(name: string): Promise<Proposals> {
  checkName(name, "game name");
  const file = path.join(gameDir(name), "occluded-proposals.jsonl");
  const key = await stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");
  const hit = cache.get(file);
  if (hit?.key === key) return hit.value;

  let text: string | null = null;
  let source: Proposals["source"] = "pack";
  try {
    text = await readFile(file, "utf8");
  } catch {
    try {
      const fixture = path.join(process.cwd(), "test-fixtures", `occluded-proposals.${name}.jsonl`);
      text = await readFile(fixture, "utf8");
      source = "fixture";
    } catch {
      return { rows: [], thresholds: { ...DEFAULTS, declared: false }, source: "none" };
    }
  }

  const rows: Proposal[] = [];
  let thresholds: Thresholds = { ...DEFAULTS, declared: false };
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue; // a half-written line is not a proposal (`lib/pool.ts:24-28`)
    }
    if ("_thresholds" in obj) {
      const inner = (typeof obj._thresholds === "object" && obj._thresholds
        ? (obj._thresholds as Record<string, unknown>)
        : {}) as Record<string, unknown>;
      const hi = pick(inner, "hi") ?? pick(obj, "hi");
      const lo = pick(inner, "lo") ?? pick(obj, "lo");
      thresholds = { hi: hi ?? DEFAULTS.hi, lo: lo ?? DEFAULTS.lo, declared: hi !== undefined };
      continue;
    }
    rows.push(obj as unknown as Proposal);
  }
  rows.sort((a, b) => b.score - a.score);
  const value: Proposals = { rows, thresholds, source };
  cache.set(file, { key, value });
  return value;
}

export type Streams = { confirm: Proposal[]; control: Proposal[]; unsure: Proposal[] };

/**
 * The three streams: confirm by the page, the unsure mid-band (also by the page — the one-at-a-
 * time tinder view is gone, "tinder nervt", 2026-08-10), and a sample of the bottom as control.
 */
export function splitStreams(rows: Proposal[], t: Thresholds): Streams {
  const confirm = rows.filter((r) => r.score > t.hi && r.proposed === "occluded");
  const unsure = rows.filter((r) => r.score >= t.lo && r.score <= t.hi);
  const below = rows.filter((r) => r.score < t.lo);
  const step = controlStep(below.length);
  return { confirm, control: below.filter((_, i) => i % step === 0), unsure };
}

const controlStep = (below: number) => Math.max(1, Math.ceil(below / CONTROL_MAX));

/** How many cells the control sample holds — the producer computes the same (`occluded.stream_counts`). */
export function controlSize(below: number): number {
  return Math.ceil(below / controlStep(below));
}
