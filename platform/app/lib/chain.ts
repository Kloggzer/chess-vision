/**
 * The ladder from a transferred recording to a relabel screen, as a STATE rather than a procedure.
 *
 * The chain is four steps with a human in the middle (`docs/phone-transfer.md`): the tracker
 * proposes a move list, a person judges it, the confirmed intervals become a session, and the
 * session's dirty cells become occlusion proposals. Each step's input is the previous step's file,
 * so the next step is not a decision — it is READ OFF THE DISK. The UI therefore offers exactly one
 * button, and never one whose input does not exist yet.
 */
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkName, dataDir, gameDir } from "@/lib/data";
import { checkMp4 } from "@/lib/mp4";

/** `label` and `propose` are jobs; `confirm` and `relabel` are pages; `done` is nothing left. */
export type ChainStep = "label" | "confirm" | "export" | "propose" | "relabel";

export type ChainState = {
  step: ChainStep;
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
  hasProposals: boolean;
};

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

/** `data/sessions/rg-<name>/` — what `export-session` writes and `/relabel` reads. */
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
  const [video, offeredPgn, hasReference, candidateText, hasSession, hasProposals] = await Promise.all([
    videoOf(name),
    phonePgn(name),
    exists(path.join(dir, "reference.pgn")),
    readFile(path.join(dir, "candidate.json"), "utf8").catch(() => null),
    exists(sessionDir(name)),
    exists(path.join(dir, "occluded-proposals.jsonl")),
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
    hasProposals,
  };
  return { ...state, step: nextStep(state) };
}

/**
 * The one step that can run now.
 *
 * Order is the chain's own, with the confirm gate honoured: `export-session` reads
 * `reviewed_plies`, so an unconfirmed candidate has nothing for it to export, and offering the
 * button anyway would produce an empty session and a puzzled user.
 */
export function nextStep(state: Omit<ChainState, "step">): ChainStep {
  if (!state.hasCandidate) return "label";
  if (!state.confirmed) return "confirm";
  if (!state.hasSession) return "export";
  if (!state.hasProposals) return "propose";
  return "relabel";
}

/**
 * Copy the phone's PGN in as `reference.pgn`.
 *
 * Never overwrites: an existing reference is a human's choice (uploaded by hand, or edited), and
 * the phone's own move list is exactly the thing the confirm screen exists to doubt.
 */
export async function adoptPgn(name: string): Promise<{ adopted: string } | { reason: string }> {
  const target = path.join(gameDir(name), "reference.pgn");
  if (await exists(target)) return { reason: "reference.pgn already exists — nothing was overwritten" };
  const source = await phonePgn(name);
  if (!source) return { reason: "the transfer carries no .pgn — the phone never finished a game for it" };
  await writeFile(target, await readFile(source, "utf8"), "utf8");
  return { adopted: path.basename(source) };
}
