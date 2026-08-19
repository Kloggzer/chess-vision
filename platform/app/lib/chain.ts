/**
 * The ladder from a transferred recording to the labelling stream, as a STATE, not a procedure.
 *
 * The chain is five steps with a human in the middle (`docs/phone-transfer.md`): the tracker
 * proposes a move list, a person judges it, the confirmed intervals become a session, SAM cuts the
 * hand out of its occluded frames, and a model reads it. Each step's input is the previous file,
 * so the next step is not a decision — it is READ OFF THE DISK. The UI therefore offers exactly one
 * button, and never one whose input does not exist yet.
 */
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkName, dataDir, gameDir } from "@/lib/data";
import { type MatteCensus, matteCensus } from "@/lib/matte";
import { checkMp4 } from "@/lib/mp4";
import { type UselessFlag, uselessFlag } from "@/lib/useless";

/** `label`, `matte` and `model-read` are jobs; `confirm` and `labeln` are pages. */
export type ChainStep = "label" | "confirm" | "export" | "matte" | "model-read" | "labeln";

export type ChainState = {
  /** Null = nothing to do here: the game is flagged useless, and no step is offered at all. */
  step: ChainStep | null;
  /** The recording the chain runs on, relative to the data dir — null when the bundle has none. */
  video: string | null;
  /** Set when the video cannot be decoded at all, in the words of what is wrong with it. */
  videoBroken: string | null;
  /** A PGN the phone recorded is truth the confirm screen can compare against. One click adopts it. */
  offeredPgn: string | null;
  hasReference: boolean;
  hasCandidate: boolean;
  confirmed: boolean;
  hasSession: boolean;
  /** Alphas on disk, the occluded pile, and what one run targets of it (`lib/matte.ts`). */
  mattes: MatteCensus;
  hasModelReads: boolean;
  /** The human's "nutzlos" verdict, active only — see `lib/useless.ts`. */
  useless: UselessFlag | null;
};

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

/** `data/sessions/rg-<name>/` — what `export-session` writes and the label streams read. */
export function sessionDir(name: string): string {
  return path.join(dataDir(), "sessions", `rg-${checkName(name, "game name")}`);
}

/** The transferred bundle's own recording: the newest session directory that has a video. */
async function videoOf(name: string): Promise<string | null> {
  const sessions = path.join(gameDir(name), "files", "sessions");
  let ids: string[] = [];
  try {
    ids = (await readdir(sessions, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return null;
  }
  for (const id of ids.sort().reverse()) {
    const video = path.join(sessions, id, "video.mp4");
    if (await exists(video)) return video;
  }
  return null;
}

/** A `.pgn` the phone wrote beside its game record — the only truth these recordings ever carry. */
async function phonePgn(name: string): Promise<string | null> {
  const games = path.join(gameDir(name), "files", "games");
  try {
    const pgns = (await readdir(games)).filter((f) => f.endsWith(".pgn")).sort();
    return pgns.length > 0 ? path.join(games, pgns[pgns.length - 1]) : null;
  } catch {
    return null;
  }
}

export async function chainState(name: string): Promise<ChainState> {
  const dir = gameDir(name);
  const [video, offeredPgn, hasReference, candidateText, hasSession, mattes, hasModelReads, useless] = await Promise.all([
    videoOf(name),
    phonePgn(name),
    exists(path.join(dir, "reference.pgn")),
    readFile(path.join(dir, "candidate.json"), "utf8").catch(() => null),
    // The export writes frames first and log.jsonl LAST, so the directory alone proves nothing:
    // a killed export left one, the chain offered the next step, and Python refused (2026-08-15).
    exists(path.join(sessionDir(name), "log.jsonl")),
    matteCensus(name),
    exists(path.join(dir, "model-reads.jsonl")),
    uselessFlag(name),
  ]);
  const confirmed = candidateText !== null && (JSON.parse(candidateText) as { confirmed?: boolean }).confirmed === true;
  // Checked before the button is offered, not after ten minutes of replay.
  const broken = video && !(await checkMp4(video)).finalized;
  const state = {
    video,
    videoBroken: broken ? "the recording has no MP4 index (moov) — it was interrupted before the recorder could close it" : null,
    offeredPgn: hasReference ? null : offeredPgn,
    hasReference,
    hasCandidate: candidateText !== null,
    confirmed,
    hasSession,
    mattes,
    hasModelReads,
    useless,
  };
  return { ...state, step: nextStep(state) };
}

/**
 * The one step that can run now.
 *
 * Order is the chain's own, with the confirm gate honoured: `export-session` reads
 * `reviewed_plies`, so an unconfirmed candidate has nothing for it to export, and offering the
 * button anyway would produce an empty session and a puzzled user. A game the human called
 * useless has no step at all — that is the whole point of the flag, and it is one click undone.
 */
export function nextStep(state: Omit<ChainState, "step">): ChainStep | null {
  if (state.useless) return null;
  if (!state.hasCandidate) return "label";
  if (!state.confirmed) return "confirm";
  if (!state.hasSession) return "export";
  // Before `model-read`, which needs a model picked by hand: the alphas need nothing but the
  // export. The bar is the run's TARGET, not the pile — 80 of 394 is the instruction carried out,
  // and a step waiting for the other 314 would strand the biggest sessions on this rung forever.
  if (state.mattes.done < state.mattes.target) return "matte";
  if (!state.hasModelReads) return "model-read";
  return "labeln";
}

/**
 * Copy the phone's PGN in as `reference.pgn` — the chain's default, run by `tick`, never a button.
 *
 * Never overwrites: an existing reference is a human's choice (uploaded by hand, or edited), and
 * the phone's own move list is exactly the thing the confirm screen exists to doubt — which is why
 * `referenceOrigin` has to say so wherever the adopted file is used.
 */
export async function adoptPgn(name: string): Promise<{ adopted: string } | { reason: string }> {
  const target = path.join(gameDir(name), "reference.pgn");
  if (await exists(target)) return { reason: "reference.pgn already exists — nothing was overwritten" };
  const source = await phonePgn(name);
  if (!source) return { reason: "the transfer carries no .pgn — the phone never finished a game for it" };
  await writeFile(target, await readFile(source, "utf8"), "utf8");
  return { adopted: path.basename(source) };
}

/**
 * Every offered PGN adopted, wherever the queue is read — there is no ticker to do it any more.
 * A refusal is remembered, not retried: it is the same news on every read until a human acts, and
 * silence about it is the defect (see `docs/labeling-ux/CONCEPT.md` §5).
 */
export async function adoptOffered(names: readonly string[]): Promise<void> {
  for (const name of names) {
    if (refusals.has(name)) continue;
    const adopted = await adoptPgn(name);
    if ("reason" in adopted) refusals.set(name, `PGN ${name}: ${adopted.reason}`);
  }
}

// Pinned so a hot reload cannot turn a remembered refusal back into work on every render.
const refusals: Map<string, string> = ((globalThis as { __chesslabAdoptFailed?: Map<string, string> }).__chesslabAdoptFailed ??= new Map());

export function adoptFailures(): string[] {
  return [...refusals.values()];
}

/** A press is the human answering the refusal: ask again on the next read of the queue. */
export function clearAdoptFailures(): void {
  refusals.clear();
}

/** `phone` = the reference IS the phone's own move list, so confirming is a self-check. */
export type ReferenceOrigin = "none" | "phone" | "outside";

const md5 = (bytes: Buffer) => createHash("md5").update(bytes).digest("hex");

/**
 * Where `reference.pgn` came from, by digest against every `files/games/*.pgn`.
 *
 * The same test `realgames.reference_is_the_phones_own` makes — deliberately not a second
 * definition, because `chesslab realgames confirm --yes` REFUSES on `phone` and a screen that drew
 * the line elsewhere would wave through what the CLI blocks.
 */
export async function referenceOrigin(name: string): Promise<ReferenceOrigin> {
  const dir = gameDir(name);
  let digest: string;
  try {
    digest = md5(await readFile(path.join(dir, "reference.pgn")));
  } catch {
    return "none";
  }
  const games = path.join(dir, "files", "games");
  let pgns: string[] = [];
  try {
    pgns = (await readdir(games)).filter((f) => f.endsWith(".pgn"));
  } catch {
    return "outside"; // no bundle to have written it
  }
  for (const file of pgns) {
    if (md5(await readFile(path.join(games, file))) === digest) return "phone";
  }
  return "outside";
}
