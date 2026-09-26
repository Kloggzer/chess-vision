// Non-wire-format state: one lock serializes heavy jobs across processes (no Python side).
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { readFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomic";
import { inboxDir } from "@/lib/ingest/ingest";

/** Written while a heavy job runs: pid, what it is, since when (CONCEPT §5.5). */
export type HeavyLock = {
  /** Who CLAIMED the slot — the server, or a `chesslab` process writing this file itself. */
  pid: number;
  /** The job's own process, stamped once it exists. A killed job then frees the slot by dying;
   *  without it the server's pid holds the lock forever and no press ever gets the slot. */
  childPid?: number;
  job: string;
  name: string;
  startedAt: string;
};

export const heavyLockPath = () => path.join(inboxDir(), "heavy.lock");

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

/** `null` = keine Datei. `"unreadable"` = eine liegt da, die niemand deuten kann — und die ist
 *  NICHT verwaist: Pythons `locks._claim` legt sie mit `O_EXCL` leer an und schreibt erst danach,
 *  also ist das Fenster der Normalfall eines LAUFENDEN Prozesses, nicht der einer Leiche. */
type LockRead = HeavyLock | null | "unreadable";

function readLockSync(): LockRead {
  let text: string;
  try {
    text = readFileSync(heavyLockPath(), "utf8");
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT" ? null : "unreadable";
  }
  try {
    const row = JSON.parse(text) as HeavyLock;
    return typeof row?.pid === "number" ? row : "unreadable";
  } catch {
    return "unreadable";
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

/** Eine Absage ohne deutbaren Halter — der Slot bleibt zu, und der Satz sagt, wo nachzusehen ist. */
export type LockBlocked = { blocked: string };

const unreadable = (): LockBlocked => ({
  blocked: `heavy.lock ist da, aber nicht deutbar — ein Lauf schreibt sie gerade, oder sie ist zerrissen: ${heavyLockPath()} pruefen und von Hand loeschen, wenn kein Prozess mehr laeuft`,
});

const contested = (): LockBlocked => ({
  blocked: `heavy.lock wechselt gerade den Halter — noch einmal druecken: ${heavyLockPath()}`,
});

// Create-exclusive to avoid TOCTOU; retry once for stale locks (6 GB replay window).
export async function claimHeavyLock(job: string, name: string): Promise<{ held: HeavyLock } | { foreign: HeavyLock } | LockBlocked> {
  await mkdir(inboxDir(), { recursive: true });
  const lock: HeavyLock = { pid: process.pid, job, name, startedAt: new Date().toISOString() };
  if (createLock(lock)) return { held: lock };

  const current = readLockSync();
  if (current === "unreadable") return unreadable();
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
  if (winner === "unreadable") return unreadable();
  if (winner) return { foreign: winner };
  // Zwischen unserem `wx` und diesem Lesen ist die Datei wieder weg. Gemeldet wird nur, was wir
  // auch anlegen konnten: ein `{held}` OHNE Sperrdatei gibt den Slot per `O_EXCL` sofort weiter.
  return createLock(lock) ? { held: lock } : contested();
}

/** Warum der Slot nicht frei ist, als Satz fuer die 409 — `null`, wenn er uns gehoert. */
export function lockRefusal(lock: Awaited<ReturnType<typeof claimHeavyLock>>): string | null {
  if ("blocked" in lock) return lock.blocked;
  if (!("foreign" in lock)) return null;
  const { pid, job, name } = lock.foreign;
  return `heavy.lock: pid ${pid} arbeitet an ${job} ${name}`;
}

/** The job's pid, once spawned — see `HeavyLock.childPid`. Silent if the lock is not ours. */
export async function stampHeavyLockChild(childPid: number): Promise<void> {
  const current = await readHeavyLock();
  if (!current || current.pid !== process.pid) return;
  await writeFileAtomic(heavyLockPath(), JSON.stringify({ ...current, childPid }, null, 2) + "\n");
}

/** Only ever removes OUR lock — another process's file is not this process's to delete. Eine
 *  unlesbare zaehlt dabei als FREMD: sie kann die halb geschriebene eines laufenden Laufs sein. */
export async function releaseHeavyLock(): Promise<void> {
  const current = readLockSync();
  if (current === "unreadable") return;
  if (current && current.pid !== process.pid) return;
  // Windows: a virus scanner holding the file for a moment answers EBUSY/EPERM, not a verdict.
  await rm(heavyLockPath(), { force: true, maxRetries: 3 });
}

/** Nach einem Fehlschlag: die Sperre zurueck, dann der Fehler. Wirft die Freigabe, nennt er beides —
 *  still verschluckt hielte die pid des Servers den Slot fuer jeden Python-Lauf. */
export async function releaseAfter(error: unknown): Promise<never> {
  try {
    await releaseHeavyLock();
  } catch (release) {
    throw new Error(`${String(error)} — heavy.lock bleibt liegen (${heavyLockPath()}): ${String(release)}`, { cause: error });
  }
  throw error;
}
