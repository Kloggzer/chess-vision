// Pure on purpose: testable without disk or server, driven by queue state and clock.
import type { ChainStep } from "@/lib/chain";
import type { Job } from "@/lib/jobs";
import { proposesCandidate, recordedAt, type QueueRow } from "@/lib/queues";
import { EXPORT_HOLD_MS } from "@/lib/zuege";

/**
 * The chain steps that are JOBS — one button each. `confirm` and `labeln` are the human's pages.
 * Nothing here ever starts by itself: every one of them is a press (2026-08-18, "ich will die
 * immer selbst starten"), which is also the interlock `matte` and `model-read` always needed.
 */
export type JobStep = "phone-record" | "label" | "export" | "matte" | "model-read";
export const JOB_STEPS = ["phone-record", "label", "export", "matte", "model-read"] as const satisfies readonly JobStep[];

const JOBS: ReadonlySet<ChainStep> = new Set<ChainStep>(JOB_STEPS);

export function isJobStep(step: string | null): step is JobStep {
  return step !== null && JOBS.has(step as ChainStep);
}

/** A step that will not run again by itself: the human presses, or nothing happens (§5.4). */
type Repair = { name: string; step: JobStep; reason: string };
/** Per job step, the recordings sitting on it, oldest first — the backlog one press drains. */
type Waiting = Record<JobStep, string[]>;
export type Backlog = {
  waiting: Waiting;
  repair: Repair[];
};

export type BacklogInput = {
  rows: QueueRow[];
  /** Name → the last job the ledger holds for it, of any kind. Only "is this recording busy". */
  lastJobs: Map<string, Job>;
  /** `<name>|<kind>` → that STEP's last row (`jobs.lastByStep`). THIS is the no-retry marker. */
  lastSteps: Map<string, Job>;
  /** Injected so the two 90-second holds of §4.1.1 are testable without waiting for a clock. */
  now?: number;
};

// Unparsed row via `notBefore`: held but neither busy nor no-retry marker until expiry.
function holding(job: Job | undefined, now: number): boolean {
  return job?.notBefore !== undefined && Date.parse(job.notBefore) > now;
}

// Failed steps never retry — marker is THIS step's last ledger row, per recording.
function blocker(last: Job | undefined, step: Job | undefined, now: number): { busy: true } | { reason: string } | null {
  if (holding(last, now) || holding(step, now)) return { busy: true };
  if (last && !last.notBefore && (last.state === "queued" || last.state === "running")) return { busy: true };
  if (!step || step.notBefore) return null;
  if (step.state === "failed" || step.state === "skipped") return { reason: step.reason ?? "gescheitert, ohne Grund im Ledger" };
  return null;
}

// Cross-client guard: candidate.json timestamp buys 90 s hold (§4.1.1).
function freshlyConfirmed(row: QueueRow, now: number): boolean {
  const at = Date.parse(row.confirmedAt ?? "");
  return Number.isFinite(at) && at > now - EXPORT_HOLD_MS;
}

/** Oldest first: the backlog drains in the order it was recorded, never newest-first like the queues. */
const byRecording = (a: string, b: string) => recordedAt(a).localeCompare(recordedAt(b)) || a.localeCompare(b);

const noneWaiting = (): Waiting => ({ "phone-record": [], label: [], export: [], matte: [], "model-read": [] });

/**
 * What waits on which step, in one pass over the disk state the cards already read. `useless` and
 * `archived` are out by the same filters the queues apply — both flags mean "not my work right
 * now", and a button that counts them is the one thing they exist to prevent.
 */
export function backlog({ rows, lastJobs, lastSteps, now = Date.now() }: BacklogInput): Backlog {
  const waiting = noneWaiting();
  const repair: Repair[] = [];

  for (const row of rows) {
    const { chain } = row;
    if (row.archived || chain.useless) continue;
    const step = chain.step;
    if (!isJobStep(step)) continue;
    // A bundle with no recording has nothing to replay; a broken one costs ten minutes of decoding
    // to learn what the atom chain already said. Neither is a job, and only the second is a defect.
    if (proposesCandidate(step) && chain.video === null) continue;
    if (proposesCandidate(step) && chain.videoBroken) {
      repair.push({ name: row.name, step, reason: chain.videoBroken });
      continue;
    }
    // The undo the stream promised has to still be free while it is promised.
    if (step === "export" && freshlyConfirmed(row, now)) continue;
    const blocked = blocker(lastJobs.get(row.name), lastSteps.get(`${row.name}|${step}`), now);
    if (blocked && "reason" in blocked) {
      repair.push({ name: row.name, step, reason: blocked.reason });
      continue;
    }
    if (blocked) continue;
    waiting[step].push(row.name);
  }

  for (const step of JOB_STEPS) waiting[step].sort(byRecording);
  return { waiting, repair: repair.sort((a, b) => byRecording(a.name, b.name)) };
}
