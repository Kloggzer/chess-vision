/**
 * Der eine Slot der Kette und was in ihm steht. Auf `globalThis` gepinnt: eine Warteschlange, die
 * jeder Hot Reload leert, startet einen zweiten Pack fuer eine Aufnahme, an der der erste noch baut.
 */
import type { ChildProcess } from "node:child_process";
import type { PackResult } from "@/lib/chain/pack";

export type JobState = "queued" | "running" | "done" | "failed" | "skipped" | "stopped";
type JobKind = "pack" | "phone-record" | "label" | "export" | "adopt-dirty" | "settle-scan" | "matte" | "temporal" | "model-read";
export type Job = {
  name: string;
  kind?: JobKind;
  state: JobState;
  /** Why a job was skipped or failed, in the words the user needs to act on. */
  reason?: string;
  command?: string;
  log?: string;
  queuedAt: string;
  startedAt?: string;
  finishedAt?: string;
  code?: number;
  /** Present only after the fail-closed pack verification has succeeded. */
  pack?: PackResult;
  /** Candidate written by a manual replay label job, relative to the UI's real-game name. */
  candidate?: string;
  /** Label runs only: whether the barrel was removed. `false` crops differ from corrected ones
   * permanently (specs/52), so the record has to carry it — see `lensFor`. */
  lens?: boolean;
  /** The server process that wrote the row. Absent on every row written before this key existed. */
  pid?: number;
  /** The spawned tool's own pid: it outlives a killed server. */
  childPid?: number;
  /** Wall clock before which the picker must not start this step — the boundary commit's undo
   *  window (§4.1.1). Additive, declared in the §9.1 register; nothing in Python reads this file. */
  notBefore?: string;
  /** Weitere Aufnahmen IM SELBEN Prozess, nur beim Matten: SAM zu laden kostet 7-9 min, die Arbeit
   *  danach Sekunden je Frame. Stopp killt wie sonst den ganzen Prozess. */
  also?: string[];
};

/** The process in the slot right now — held so Stopp can kill it, not just decline the next. */
type Live = { name: string; child: ChildProcess };
type Queue = { jobs: Map<string, Job>; running: Promise<void>; live: Live | null; stopped: Set<string>;
               /** Die Ledger-Schreibvorgaenge, einer nach dem anderen — siehe `appendRow`. */
               ledger: Promise<void> };

export const queue: Queue = ((globalThis as { __chesslabJobs?: Queue }).__chesslabJobs ??= {
  jobs: new Map(),
  running: Promise.resolve(),
  live: null,
  stopped: new Set(),
  ledger: Promise.resolve(),
});
// An object pinned by older code lacks the fields added since (see `drain`).
queue.live ??= null;
queue.stopped ??= new Set();
queue.ledger ??= Promise.resolve();

/** Is the one slot taken? Every press asks first — nothing ever widens the queue (§5.5). */
export function busy(): boolean {
  return runningJob() !== null;
}

/** What the slot is chewing on, so a strip can name it instead of saying "etwas läuft". */
export function runningJob(): Job | null {
  for (const job of queue.jobs.values()) {
    if (job.state === "queued" || job.state === "running") return job;
  }
  return null;
}

/** Resolves when everything queued right now has finished — a drain starts the next recording here. */
export async function whenIdle(): Promise<void> {
  // Bis die Kette WIRKLICH steht: eine Sprosse haengt die naechste an und ersetzt dabei
  // `queue.running`, die alte Zusage sieht den Nachfolger noch als `running`.
  for (let seen = queue.running; ; seen = queue.running) {
    await seen;
    if (queue.running === seen) return;
  }
}
