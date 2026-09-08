/**
 * What a running job has actually done so far, read out of the thing it already writes: its log.
 *
 * A ten-minute replay behind a button that only says "running" is indistinguishable from a hung
 * one — which on 2026-08-13 is exactly what it was. The replay prints its own milestones
 * (`state: … at 12.34s`, `decision: ply=…`), and the recording states its duration in
 * `session.yaml`, so the percentage is a MEASURED position in the video, not a spinner.
 *
 * Where a denominator is missing (a chesslab step, a recording without `video_duration_ns`) there is
 * no bar — the last line of output is shown instead. An invented percentage is worse than none.
 */
import { open, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { checkName, gameDir } from "@/lib/data";
import { lastRunOf } from "@/lib/jobs";

export type Progress = {
  /** Seconds of the recording the replay has reached, and the recording's own length. */
  atSeconds: number | null;
  totalSeconds: number | null;
  /** Plies the tracker has committed so far — the number a chess player actually reads. */
  plies: number;
  /** A chesslab step's own denominator: frames done of frames planned. */
  frames: { at: number; total: number } | null;
  /** The last few lines the tool printed, newest last. */
  tail: string[];
  /** Bytes the log holds; 0 means the tool has printed nothing yet. */
  bytes: number;
};

const TAIL_BYTES = 4096;
const TAIL_LINES = 4;
const NS_PER_S = 1e9;

/** The duration the phone recorded beside the video — the only honest denominator we have. */
async function recordingSeconds(name: string): Promise<number | null> {
  const sessions = path.join(gameDir(name), "files", "sessions");
  let ids: string[] = [];
  try {
    ids = (await readdir(sessions, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return null;
  }
  for (const id of ids.sort().reverse()) {
    const text = await readFile(path.join(sessions, id, "session.yaml"), "utf8").catch(() => "");
    const ns = /video_duration_ns:\s*(\d+)/.exec(text);
    if (ns && Number(ns[1]) > 0) return Number(ns[1]) / NS_PER_S;
  }
  return null;
}

/** Read the tail without pulling a growing log into memory. */
async function tailOf(file: string): Promise<{ tail: string[]; bytes: number }> {
  const info = await stat(file).catch(() => null);
  if (!info) return { tail: [], bytes: 0 };
  const handle = await open(file, "r");
  try {
    const length = Math.min(TAIL_BYTES, info.size);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, info.size - length);
    const lines = buffer.toString("utf8").split(/\r?\n/).filter((l) => l.trim());
    return { tail: lines.slice(-TAIL_LINES), bytes: info.size };
  } finally {
    await handle.close();
  }
}

/**
 * The whole log is scanned for the two milestones, not just the tail: the last `state:` line can be
 * thousands of lines back on a quiet stretch, and a position that jumps backwards when the tail
 * scrolls past it is worse than no position.
 */
export async function progressOf(name: string, log: string | undefined): Promise<Progress> {
  checkName(name, "game name");
  // A queued job has no log yet, but the recording's length is already known — "0 of 412 s" is
  // what a waiting user wants to see, and it is the only honest number available at that moment.
  if (!log) return { atSeconds: null, totalSeconds: await recordingSeconds(name), plies: 0, frames: null, tail: [], bytes: 0 };
  const { tail, bytes } = await tailOf(log);
  const text = await readFile(log, "utf8").catch(() => "");
  let atSeconds: number | null = null;
  let plies = 0;
  let frames: { at: number; total: number } | null = null;
  // The current run only — the log is appended across runs, and a position carried over from the
  // previous one shows a bar that starts half full and never moves.
  for (const line of lastRunOf(text)) {
    // A COMMITTED ply, not every decision row: the replay prints `decider=rejected` lines too, and
    // counting those told the card "3 plies" for a candidate whose move list is empty.
    const decision = /^decision: ply=(\d+).*decider=(\S+)/.exec(line);
    if (decision && decision[2] !== "rejected") plies = Math.max(plies, Number(decision[1]));
    // The JVM formats with the SYSTEM locale, so a German machine prints `at 30,38s`. Matching only
    // a dot is why the bar stayed empty on the first real run (2026-08-13).
    const at = /\bat (\d+[.,]\d+)s\b/.exec(line);
    if (at) atSeconds = Math.max(atSeconds ?? 0, Number(at[1].replace(",", ".")));
    // A chesslab step counts FRAMES, not seconds of video (`realgames.PROGRESS_EVERY`): without
    // this the export shows a spinner for half an hour and reads exactly like a hung job.
    const step = /\b(\d+)\/(\d+) frames\b/.exec(line);
    if (step && Number(step[2]) > 0) frames = { at: Number(step[1]), total: Number(step[2]) };
  }
  return { atSeconds, totalSeconds: await recordingSeconds(name), plies, frames, tail, bytes };
}
