/**
 * `/corpus` §7.3: quarantine share per training pack, dirty share per exported session.
 *
 * `training-pack/` ONLY — the canonical name `lib/jobs.ts` (`runPack`) writes. A bundle can
 * carry several packs of the same video under different sampling settings; they count as
 * variants and are never summed, because that double-counts one recording.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "@/lib/data";
import { absentOnly } from "@/lib/measurement";
import { sessionLogs } from "@/lib/pool";

type Counts = { frames: number | null; crops: number | null };
export type PackSummary = {
  /** `accepted` = packs from 2026-08-14 on, `clean` = the older key set, no quarantine column. */
  schema: "accepted" | "clean";
  sampled: number | null;
  accepted: Counts;
  quarantine: Counts | null;
  occluded: Counts | null;
  model: string | null;
};

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

/** Both key sets are read and neither is invented: an absent quarantine column stays absent. */
export function readSummary(raw: unknown): PackSummary {
  const row = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const model = typeof row.model === "string" ? row.model : null;
  const sampled = num(row.sampled_frames);
  if ("accepted_frames" in row || "quarantine_frames" in row) {
    return {
      schema: "accepted",
      sampled,
      accepted: { frames: num(row.accepted_frames), crops: num(row.accepted_crops) },
      quarantine: { frames: num(row.quarantine_frames), crops: num(row.quarantine_crops) },
      occluded: { frames: num(row.occluded_proposal_frames), crops: num(row.occluded_proposal_crops) },
      model,
    };
  }
  return {
    schema: "clean",
    sampled,
    accepted: { frames: num(row.clean_frames), crops: num(row.clean_crops) },
    quarantine: null,
    occluded: { frames: num(row.occluded_frames), crops: num(row.occluded_crops) },
    model,
  };
}

export type Decided = { decided: number; quarantined: number; ratio: number };

/** The denominator is the frames the pack DECIDED, not the ones it sampled — they differ 10×. */
export function decidedRatio(summary: PackSummary): Decided | null {
  const accepted = summary.accepted.frames;
  const quarantined = summary.quarantine?.frames ?? null;
  if (accepted === null || quarantined === null) return null;
  const decided = accepted + quarantined;
  return decided > 0 ? { decided, quarantined, ratio: quarantined / decided } : null;
}

export type Bundle = { name: string; pack: PackSummary | null; variants: string[] };

async function packSummary(dir: string): Promise<PackSummary | null> {
  const text = await readFile(path.join(dir, "summary.json"), "utf8").catch(absentOnly);
  return text === null ? null : readSummary(JSON.parse(text));
}

/** Every bundle that carries at least one pack, canonical first, siblings named but not added up. */
export async function listPacks(): Promise<Bundle[]> {
  const root = path.join(dataDir(), "recordings");
  const games = await readdir(root, { withFileTypes: true }).catch(absentOnly);
  if (games === null) return [];
  const bundles: Bundle[] = [];
  for (const game of games.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const dirs = ((await readdir(path.join(root, game.name), { withFileTypes: true }).catch(absentOnly)) ?? [])
      .filter((e) => e.isDirectory() && e.name.startsWith("training-pack"))
      .map((e) => e.name)
      .sort();
    const summaries = await Promise.all(dirs.map((d) => packSummary(path.join(root, game.name, d))));
    const carrying = dirs.filter((_, i) => summaries[i] !== null);
    if (carrying.length === 0) continue;
    const canonical = dirs.indexOf("training-pack");
    bundles.push({
      name: game.name,
      pack: canonical >= 0 ? summaries[canonical] : null,
      variants: carrying.filter((d) => d !== "training-pack"),
    });
  }
  return bundles;
}

export type SessionDirty = { sessionId: string; rows: number; dirty: number };

/** `count(dirty)/count(rows)` over the exported log — the same rows the pool expands. */
export async function sessionDirty(): Promise<SessionDirty[]> {
  return (await sessionLogs()).map((log) => ({
    sessionId: log.sessionId,
    rows: log.frames.length,
    dirty: log.frames.filter((f) => f.dirty).length,
  }));
}
