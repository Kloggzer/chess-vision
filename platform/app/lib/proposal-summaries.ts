/**
 * `data/realgames/<n>/occluded-proposals.summary.json` — the per-file counts a header needs, so
 * nine sessions cost nine small JSON files instead of 251 413 parsed rows (CONCEPT.md 6.3).
 *
 * Every file on disk predates the sidecar, so the fallback is the normal case: it derives the SAME
 * shape from the rows and says so. Writing a sidecar is the producer's job, never this app's.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { checkName, gameDir } from "@/lib/data";
import { controlSize, loadProposals, type Proposal, type Thresholds } from "@/lib/proposals";

export type StreamCounts = { confirm: number; unsure: number; control: number };

export type ProposalSummary = {
  /** Distinct frames with a proposal row — the denominator a human clears (CONCEPT.md 6.2). */
  boards: number;
  cells: number;
  /**
   * The sorted stems themselves, `null` on a sidecar written before this key existed. Progress is
   * `|touched ∩ proposed|`, so a counter alone leaves every reader parsing 33 MB anyway.
   */
  frames: string[] | null;
  by_stream: StreamCounts;
  hi: number;
  lo: number;
  /** The propose run, when the producer recorded it — `null` means unknown, never "no model". */
  model: string | null;
  written_at: string | null;
  /** `sidecar` = the producer's file, `fallback` = counted from the jsonl, `none` = no proposals. */
  read: "sidecar" | "fallback" | "none";
};

const NONE: ProposalSummary = {
  boards: 0,
  cells: 0,
  frames: [],
  by_stream: { confirm: 0, unsure: 0, control: 0 },
  hi: 0,
  lo: 0,
  model: null,
  written_at: null,
  read: "none",
};

/**
 * The producer's own arithmetic (`occluded.stream_counts`), reproduced so a sidecar and a fallback
 * are interchangeable. `confirm` here is every cell above `hi`; `splitStreams` narrows it further
 * to `proposed == occluded`, which is the page's question, not the file's census.
 */
export function summaryFromRows(rows: Proposal[], t: Thresholds): Omit<ProposalSummary, "read"> {
  let confirm = 0;
  let unsure = 0;
  let below = 0;
  const frames = new Set<string>();
  for (const row of rows) {
    frames.add(row.frame);
    if (row.score > t.hi) confirm++;
    else if (row.score >= t.lo) unsure++;
    else below++;
  }
  return {
    boards: frames.size,
    cells: rows.length,
    frames: [...frames].sort(),
    by_stream: { confirm, unsure, control: controlSize(below) },
    hi: t.hi,
    lo: t.lo,
    model: null,
    written_at: null,
  };
}

const num = (o: Record<string, unknown>, key: string): number | undefined =>
  typeof o[key] === "number" ? (o[key] as number) : undefined;
const str = (o: Record<string, unknown>, key: string): string | null =>
  typeof o[key] === "string" ? (o[key] as string) : null;

/** A sidecar missing its two load-bearing counts is not a sidecar — the caller falls back. */
function parseSidecar(text: string): ProposalSummary | null {
  const o = JSON.parse(text) as Record<string, unknown>;
  const boards = num(o, "boards");
  const cells = num(o, "cells");
  if (boards === undefined || cells === undefined) return null;
  const s = (typeof o.by_stream === "object" && o.by_stream ? o.by_stream : {}) as Record<string, unknown>;
  const frames = Array.isArray(o.frames) && o.frames.every((f) => typeof f === "string") ? (o.frames as string[]) : null;
  return {
    boards,
    cells,
    frames,
    by_stream: {
      confirm: num(s, "confirm") ?? 0,
      unsure: num(s, "unsure") ?? 0,
      control: num(s, "control") ?? 0,
    },
    hi: num(o, "hi") ?? 0,
    lo: num(o, "lo") ?? 0,
    model: str(o, "model"),
    written_at: str(o, "written_at"),
    read: "sidecar",
  };
}

type Cache = Map<string, { key: string; value: ProposalSummary }>;
/** Pinned like `lib/jobs.ts:56` — a module-level Map re-parses the corpus on every hot reload. */
const cache: Cache = ((globalThis as { __chesslabSummaries?: Cache }).__chesslabSummaries ??= new Map());

const stamp = (file: string) => stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");

function summaryPath(name: string): string {
  return path.join(gameDir(name), "occluded-proposals.summary.json");
}

/** Both mtimes: a sidecar written after the jsonl must win, and a rewritten jsonl must invalidate. */
export async function loadProposalSummary(name: string): Promise<ProposalSummary> {
  checkName(name, "game name");
  const sidecar = summaryPath(name);
  const key = `${await stamp(sidecar)}|${await stamp(path.join(gameDir(name), "occluded-proposals.jsonl"))}`;
  const hit = cache.get(sidecar);
  if (hit?.key === key) return hit.value;

  let value: ProposalSummary | null = null;
  try {
    value = parseSidecar(await readFile(sidecar, "utf8"));
  } catch {
    /* no sidecar, or one written half-way — the rows answer the same question */
  }
  if (!value) {
    const { rows, thresholds, source } = await loadProposals(name);
    value = source === "none" ? NONE : { ...summaryFromRows(rows, thresholds), read: "fallback" };
  }
  cache.set(sidecar, { key, value });
  return value;
}

/**
 * The board denominator of CONCEPT.md 6.2 — `|touched ∩ proposed| / |proposed|`.
 *
 * Cells are the wrong noun: their count is a function of `hi`/`lo`, so a re-propose would rewrite
 * how much work is done, while a board is a property of the recording. `judged` carries the
 * `frame|square` keys of both ledgers; a frame outside the proposals is work on another corpus.
 */
export function boardProgress(
  proposalFrames: Iterable<string>,
  judged: Iterable<string>,
): { boards: number; done: number } {
  const proposed = new Set(proposalFrames);
  const touched = new Set<string>();
  for (const key of judged) {
    const frame = key.slice(0, key.indexOf("|"));
    if (proposed.has(frame)) touched.add(frame);
  }
  return { boards: proposed.size, done: touched.size };
}

/**
 * The same figure for a whole session, WITHOUT parsing its rows when a sidecar carries `frames`.
 *
 * That is the sidecar's entire purpose: a list surface that still called `loadProposals` for the
 * frame set paid the 33 MB anyway and the file saved nothing. Only a sidecar from before `frames`
 * existed — or none at all — falls back to the rows, and then their board count is the true one.
 */
export async function boardProgressOf(
  name: string,
  judged: Iterable<string>,
): Promise<{ summary: ProposalSummary; boards: number; done: number }> {
  const summary = await loadProposalSummary(name);
  if (summary.frames) return { summary, ...boardProgress(summary.frames, judged) };
  const { rows } = await loadProposals(name);
  return { summary, ...boardProgress(rows.map((r) => r.frame), judged) };
}
