/**
 * The ladder from a transferred recording to the labelling stream, as a STATE, not a procedure.
 *
 * The chain is four steps with a human in the middle (`docs/phone-transfer.md`): the tracker
 * proposes a move list, a person judges it, the confirmed intervals become a session, and the
 * session's dirty cells become occlusion proposals. Each step's input is the previous step's file,
 * so the next step is not a decision — it is READ OFF THE DISK. The UI therefore offers exactly one
 * button, and never one whose input does not exist yet.
 */
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkName, dataDir, gameDir } from "@/lib/data";
import { checkMp4 } from "@/lib/mp4";
import { type UselessFlag, uselessFlag } from "@/lib/useless";

/** `label` and `propose` are jobs; `confirm` and `labeln` are pages; `done` is nothing left. */
export type ChainStep = "label" | "confirm" | "export" | "propose" | "labeln";

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
  hasProposals: boolean;
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
  const [video, offeredPgn, hasReference, candidateText, hasSession, hasProposals, useless] = await Promise.all([
    videoOf(name),
    phonePgn(name),
    exists(path.join(dir, "reference.pgn")),
    readFile(path.join(dir, "candidate.json"), "utf8").catch(() => null),
    // The export writes frames first and log.jsonl LAST, so the directory alone proves nothing:
    // a killed export left one, the chain said "propose", and Python refused (2026-08-15, pid 15264).
    exists(path.join(sessionDir(name), "log.jsonl")),
    exists(path.join(dir, "occluded-proposals.jsonl")),
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
    hasProposals,
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
  if (!state.hasProposals) return "propose";
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
