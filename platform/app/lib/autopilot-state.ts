// Non-wire-format state: pause outlives restart, lock serializes heavy jobs (no Python side).
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { readFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { inboxDir } from "@/lib/ingest";

export type PauseFile = { paused: boolean; at: string };
/** Written while an Autopilot job runs: pid, what it is, since when (CONCEPT §5.5). */
export type HeavyLock = {
  /** Who CLAIMED the slot — the server, or a `chesslab` process writing this file itself. */
  pid: number;
  /** The job's own process, stamped once it exists. A killed job then frees the slot by dying;
   *  without it the server's pid holds the lock forever and the Autopilot never runs again. */
  childPid?: number;
  job: string;
  name: string;
  startedAt: string;
};

const pausePath = () => path.join(inboxDir(), "autopilot.json");
export const heavyLockPath = () => path.join(inboxDir(), "heavy.lock");

export async function isPaused(): Promise<boolean> {
  try {
    return (JSON.parse(await readFile(pausePath(), "utf8")) as PauseFile).paused === true;
  } catch {
    return false;
  }
}

export async function setPaused(paused: boolean): Promise<PauseFile> {
  const row: PauseFile = { paused, at: new Date().toISOString() };
  await mkdir(inboxDir(), { recursive: true });
  await writeFile(pausePath(), JSON.stringify(row, null, 2) + "\n", "utf8");
  return row;
}

export async function readHeavyLock(): Promise<HeavyLock | null> {
  try {
    return JSON.parse(await readFile(heavyLockPath(), "utf8")) as HeavyLock;
  } catch {
    return null;
  }
}

/**
 * Signal 0 asks the OS whether the pid exists without touching it. `EPERM` means it exists and
 * belongs to someone else — a live process either way, so the lock stands.
 */
export function alive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** A lock nobody is holding any more: the process that wrote it is gone, so it says nothing. */
export function stale(lock: HeavyLock | null): boolean {
  if (lock === null) return true;
  // The JOB decides, not the claimer: the server outlives every job it starts.
  return !alive(lock.childPid ?? lock.pid);
}

function readLockSync(): HeavyLock | null {
  try {
    return JSON.parse(readFileSync(heavyLockPath(), "utf8")) as HeavyLock;
  } catch {
    return null;
  }
}

/** `wx` is the whole point: the OS decides who created the file, so no read can be raced. */
function createLock(lock: HeavyLock): boolean {
  try {
    writeFileSync(heavyLockPath(), JSON.stringify(lock, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}

// Create-exclusive to avoid TOCTOU; retry once for stale locks (6 GB replay window).
export async function claimHeavyLock(job: string, name: string): Promise<{ held: HeavyLock } | { foreign: HeavyLock }> {
  await mkdir(inboxDir(), { recursive: true });
  const lock: HeavyLock = { pid: process.pid, job, name, startedAt: new Date().toISOString() };
  if (createLock(lock)) return { held: lock };

  const current = readLockSync();
  // Ours already: the slot is serialized, so re-stamping it would only lose the real start time.
  if (current && current.pid === process.pid) return { held: current };
  if (current && !stale(current)) return { foreign: current };
  try {
    unlinkSync(heavyLockPath());
  } catch {
    /* someone else cleared it first — the retry below decides */
  }
  if (createLock(lock)) return { held: lock };
  const winner = readLockSync();
  return winner ? { foreign: winner } : { held: lock };
}

/** The job's pid, once spawned — see `HeavyLock.childPid`. Silent if the lock is not ours. */
export async function stampHeavyLockChild(childPid: number): Promise<void> {
  const current = await readHeavyLock();
  if (!current || current.pid !== process.pid) return;
  await writeFile(heavyLockPath(), JSON.stringify({ ...current, childPid }, null, 2) + "\n", "utf8");
}

/** Only ever removes OUR lock — another process's file is not this process's to delete. */
export async function releaseHeavyLock(): Promise<void> {
  const current = await readHeavyLock();
  if (current && current.pid !== process.pid) return;
  await rm(heavyLockPath(), { force: true });
}
