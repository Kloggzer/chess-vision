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

export type Proposal = {
  session_id: string;
  frame: string;
  square: string;
  fen_label: string;
  proposed: string;
  score: number;
  /** Pixel channel alone, present only when a model also scored the cell. */
  pixel_score?: number;
  /** The model's sparse per-class softmax (classes under 1 % omitted) — the filter's input. */
  probs?: Record<string, number>;
};

export type Filter = {
  /** A class name, or `disagree` = the model's argmax contradicts the FEN label. */
  klass: string;
  min: number;
};

/** Cells a filter selects. `disagree` needs no threshold beyond the model's own confidence. */
export function matches(row: Proposal, f: Filter): boolean {
  const probs = row.probs;
  if (!probs) return false;
  if (f.klass !== "disagree") return (probs[f.klass] ?? 0) >= f.min;
  const [top, p] = Object.entries(probs).reduce((a, b) => (b[1] > a[1] ? b : a), ["", 0]);
  return p >= f.min && top !== row.fen_label && top !== "occluded";
}

/** The BOARDS a filter hits: one entry per frame, with the cells that matched on it. */
export function framesMatching(rows: Proposal[], f: Filter): { stem: string; cells: Proposal[] }[] {
  const byFrame = new Map<string, Proposal[]>();
  for (const row of rows) {
    if (!matches(row, f)) continue;
    const list = byFrame.get(row.frame);
    if (list) list.push(row);
    else byFrame.set(row.frame, [row]);
  }
  return [...byFrame.entries()]
    .map(([stem, cells]) => ({ stem, cells }))
    .sort((a, b) => b.cells.length - a.cells.length || a.stem.localeCompare(b.stem));
}

/** Every class the model actually emitted, so the filter offers real options only. */
export function classesSeen(rows: Proposal[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) for (const k of Object.keys(row.probs ?? {})) seen.add(k);
  return [...seen].sort();
}
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

/** 48 641 rows / 6.5 MB on the first real game — mtime-keyed, never re-parsed per request. */
const cache = new Map<string, { key: string; value: Proposals }>();

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
    const obj = JSON.parse(line) as Record<string, unknown>;
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

export type Streams = { confirm: Proposal[]; control: Proposal[]; tinder: Proposal[] };

/** The three streams of the spec: confirm by the page, check one by one, sample the bottom. */
export function splitStreams(rows: Proposal[], t: Thresholds): Streams {
  const confirm = rows.filter((r) => r.score > t.hi && r.proposed === "occluded");
  const tinder = rows.filter((r) => r.score >= t.lo && r.score <= t.hi);
  const below = rows.filter((r) => r.score < t.lo);
  const step = Math.max(1, Math.ceil(below.length / CONTROL_MAX));
  return { confirm, control: below.filter((_, i) => i % step === 0), tinder };
}

export function proposalKey(p: { frame: string; square: string }): string {
  return `${p.frame}|${p.square}`;
}
