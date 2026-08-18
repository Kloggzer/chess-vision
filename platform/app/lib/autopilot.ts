// Pure on purpose: testable without disk or server, driven by queue state and clock.
import type { ChainStep } from "@/lib/chain";
import type { Job } from "@/lib/jobs";
import { recordedAt, type QueueRow } from "@/lib/queues";
import { EXPORT_HOLD_MS } from "@/lib/zuege";

/**
 * The steps a machine can take alone. `confirm` and `labeln` are the human's, forever — and so is
 * `model-read` since 2026-08-19: `realgames model-read` requires `--model` and refuses a run that
 * trained on the session, so WHICH run is a per-session choice no tick can make (`chain-run.ts`).
 */
export type MachineStep = "label" | "export";

const MACHINE: ReadonlySet<ChainStep> = new Set<ChainStep>(["label", "export"]);

function isMachineStep(step: ChainStep | null): step is MachineStep {
  return step !== null && MACHINE.has(step);
}

export type Eligible = { name: string; step: MachineStep };
/** A step that will not run again by itself: the human presses, or nothing happens (§5.4). */
export type Repair = { name: string; step: MachineStep; reason: string };
export type Plan = {
  /** Runnable now, oldest recording first — the Autopilot takes the head and nothing else. */
  eligible: Eligible[];
  repair: Repair[];
  /** Bundles whose phone `.pgn` can become `reference.pgn` — free, and never overwrites. */
  adopt: string[];
};

export type PlanInput = {
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
const oldestFirst = <T extends { name: string }>(rows: T[]) => [...rows].sort((a, b) => byRecording(a.name, b.name));

/**
 * The whole tick's decision in one pass.
 *
 * `useless` and `archived` are out by the same filters the queues apply — both flags mean "not my
 * work right now", and an autopilot that ignores them is the one thing they exist to prevent.
 */
export function plan({ rows, lastJobs, lastSteps, now = Date.now() }: PlanInput): Plan {
  const eligible: Eligible[] = [];
  const repair: Repair[] = [];
  const adopt: string[] = [];

  for (const row of rows) {
    const { chain } = row;
    if (row.archived || chain.useless) continue;
    if (chain.offeredPgn) adopt.push(row.name);
    const step = chain.step;
    if (!isMachineStep(step)) continue;
    // A bundle with no recording has nothing to replay; a broken one costs ten minutes of decoding
    // to learn what the atom chain already said. Neither is a job, and only the second is a defect.
    if (step === "label" && chain.video === null) continue;
    if (step === "label" && chain.videoBroken) {
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
    eligible.push({ name: row.name, step });
  }

  return { eligible: oldestFirst(eligible), repair: oldestFirst(repair), adopt: adopt.sort(byRecording) };
}
