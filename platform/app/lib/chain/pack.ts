/** Der Trainings-Pack eines Transfers: seine zwei Eingaben finden, und sein Ergebnis fail-closed
 *  pruefen — ein Exit-Code 0 reicht nicht (`verifyPack`). */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { DESKTOP_MODEL } from "@/lib/chain/cli-args";
import { checkName } from "@/lib/session-store/recordings";
import { targetDir, videoInput } from "@/lib/ingest/ingest";
import { stripBom } from "@/lib/jsonl";

export type PackResult = {
  output: string;
  acceptedFrames: number;
  acceptedCrops: number;
  quarantineFrames: number;
  quarantineCrops: number;
  occludedProposalFrames: number;
  occludedProposalCrops: number;
};

const TRAINING_LABELS = new Set([
  "empty",
  "wP", "wN", "wB", "wR", "wQ", "wK",
  "bP", "bN", "bB", "bR", "bQ", "bK",
  "occluded",
]);
const FEN_LABELS = new Set([...TRAINING_LABELS].filter((label) => label !== "occluded"));
const PACK_SIDE = 80;

function object(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${where} is not a JSON object`);
  return value as Record<string, unknown>;
}

function count(row: Record<string, unknown>, key: string, where: string): number {
  const value = row[key];
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${where}.${key} is not a non-negative integer`);
  return value as number;
}

async function manifestRows(file: string): Promise<Record<string, unknown>[]> {
  const text = await readFile(file, "utf8");
  return stripBom(text)
    .split("\n")
    .filter((line) => line.trim())
    .map((line, index) => object(JSON.parse(line) as unknown, `${file}:${index + 1}`));
}

async function verifySink(
  out: string,
  directory: string,
  expectedCrops: number,
  expectedFrames: number,
  review: "accepted" | "quarantine" | "occluded-proposal",
): Promise<void> {
  const dir = path.join(out, directory);
  const rows = await manifestRows(path.join(dir, "manifest.jsonl"));
  if (rows.length !== expectedCrops) throw new Error(`${directory}/manifest.jsonl has ${rows.length} rows, expected ${expectedCrops}`);

  const frames = new Set<string>();
  for (const [index, row] of rows.entries()) {
    const where = `${directory}/manifest.jsonl:${index + 1}`;
    if (typeof row.frame !== "string") throw new Error(`${where} has no frame`);
    frames.add(row.frame);
    if (review === "accepted") {
      if (typeof row.label !== "string" || !FEN_LABELS.has(row.label)) throw new Error(`${where} contains invalid training label`);
      if ("review_status" in row || "proposed_label" in row) throw new Error(`${where} contains review data in accepted`);
    } else {
      if (row.label !== "unreviewed" || row.review_status !== "quarantine") throw new Error(`${where} is not quarantined`);
      if (typeof row.proposed_label !== "string" || !TRAINING_LABELS.has(row.proposed_label)) {
        throw new Error(`${where} contains invalid proposed_label`);
      }
      if (review === "occluded-proposal" && row.proposed_label !== "occluded") {
        throw new Error(`${where} is not an occluded proposal`);
      }
    }
  }
  if (frames.size !== expectedFrames) throw new Error(`${directory} has ${frames.size} frames, expected ${expectedFrames}`);

  const meta = object(JSON.parse(await readFile(path.join(dir, "packed_meta.json"), "utf8")) as unknown, `${directory}/packed_meta.json`);
  if (count(meta, "n", `${directory}/packed_meta.json`) !== expectedCrops) throw new Error(`${directory}/packed_meta.json count disagrees with summary`);
  const height = count(meta, "h", `${directory}/packed_meta.json`);
  const width = count(meta, "w", `${directory}/packed_meta.json`);
  if (height !== PACK_SIDE || width !== PACK_SIDE) throw new Error(`${directory} is ${width}x${height}, expected ${PACK_SIDE}x${PACK_SIDE}`);
  const image = await stat(path.join(dir, "packed_images.u8"));
  if (image.size !== expectedCrops * height * width * 3) throw new Error(`${directory}/packed_images.u8 has an unsafe size`);
}

/** A zero exit code is not enough: reject legacy or partially written packs fail-closed. */
export async function verifyPack(out: string): Promise<PackResult> {
  const summary = object(JSON.parse(await readFile(path.join(out, "summary.json"), "utf8")) as unknown, "summary.json");
  if (summary.model !== DESKTOP_MODEL) throw new Error(`summary model is ${String(summary.model)}, expected ${DESKTOP_MODEL}`);
  const result: PackResult = {
    output: out,
    acceptedFrames: count(summary, "accepted_frames", "summary.json"),
    acceptedCrops: count(summary, "accepted_crops", "summary.json"),
    quarantineFrames: count(summary, "quarantine_frames", "summary.json"),
    quarantineCrops: count(summary, "quarantine_crops", "summary.json"),
    occludedProposalFrames: count(summary, "occluded_proposal_frames", "summary.json"),
    occludedProposalCrops: count(summary, "occluded_proposal_crops", "summary.json"),
  };
  await verifySink(out, "accepted", result.acceptedCrops, result.acceptedFrames, "accepted");
  await verifySink(out, "quarantine", result.quarantineCrops, result.quarantineFrames, "quarantine");
  await verifySink(
    out,
    "occluded-proposals",
    result.occludedProposalCrops,
    result.occludedProposalFrames,
    "occluded-proposal",
  );
  return result;
}

/**
 * The two inputs of a pack: the recording and the game it was played in. The link is
 * `StoredGame.sessionId`, which the phone writes into the game record — matching by timestamp
 * would be a guess, and a pack built against the wrong game labels every crop wrongly.
 */
export async function packInputs(name: string): Promise<{ video: string; game: string } | { reason: string }> {
  const recording = await videoInput(name);
  if ("reason" in recording) return recording;
  const { video, sessionId } = recording;
  const files = targetDir(checkName(name, "transfer name"));

  let games: string[] = [];
  try {
    games = (await readdir(path.join(files, "games"))).filter((f) => f.endsWith(".json"));
  } catch (e) {
    if ((e as { code?: string })?.code !== "ENOENT") throw e;
    return { reason: "no games/ in the transfer — nothing states what was played" };
  }
  for (const file of games.sort()) {
    const full = path.join(files, "games", file);
    const text = await readFile(full, "utf8").catch(() => "");
    if (text.includes(`"sessionId":"${sessionId}"`) || text.includes(`"sessionId": "${sessionId}"`)) return { video, game: full };
  }
  return { reason: `no game record names session ${sessionId} — the game was not finished on the phone` };
}
