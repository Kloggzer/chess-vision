/** What a running job has done so far, read out of its log: the replay's milestones against the
 *  duration in `session.yaml` give a MEASURED position in the video. Without a denominator there is
 *  no bar, only the last line — an invented percentage is worse than none. */
import { open, readFile, stat } from "node:fs/promises";
import { checkName } from "@/lib/session-store/recordings";
import { phoneSessionSeconds } from "@/lib/session-store/stored";
import { absentOnly } from "@/lib/measurement";
import { lastRunOf } from "@/lib/chain/job-log";

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

/** Read the tail without pulling a growing log into memory. */
async function tailOf(file: string): Promise<{ tail: string[]; bytes: number }> {
  const info = await stat(file).catch(absentOnly);
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
  if (!log) return { atSeconds: null, totalSeconds: await phoneSessionSeconds(name), plies: 0, frames: null, tail: [], bytes: 0 };
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
    // The JVM formats with the SYSTEM locale, so a German machine prints `at 30,38s`.
    const at = /\bat (\d+[.,]\d+)s\b/.exec(line);
    if (at) atSeconds = Math.max(atSeconds ?? 0, Number(at[1].replace(",", ".")));
    // A chesslab step counts FRAMES, not seconds of video (`realgames.PROGRESS_EVERY`): without
    // this the export shows a spinner for half an hour and reads exactly like a hung job.
    const step = /\b(\d+)\/(\d+) frames\b/.exec(line);
    if (step && Number(step[2]) > 0) frames = { at: Number(step[1]), total: Number(step[2]) };
  }
  return { atSeconds, totalSeconds: await phoneSessionSeconds(name), plies, frames, tail, bytes };
}
