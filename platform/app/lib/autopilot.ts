/**
 * Autopilot's decision half: which machine step may run now, read off the same disk state the
 * cards already render (`docs/labeling-ux/CONCEPT.md` §5).
 *
 * Pure on purpose — this picker starts a ~6 GB replay with nobody watching, so it is a function of
 * the queue rows, the job ledger and the clock, testable without a data dir or a server.
 */
import type { ChainStep } from "@/lib/chain";
import type { Job } from "@/lib/jobs";
import { recordedAt, type QueueRow } from "@/lib/queues";
import { sessionId } from "@/lib/session";

/** The three steps a machine can take alone. `confirm` and `relabel` are the human's, forever. */
export type MachineStep = "label" | "export" | "propose";

const MACHINE: ReadonlySet<ChainStep> = new Set<ChainStep>(["label", "export", "propose"]);

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
  /** Session ids with a correction row younger than the hold — guard 5 (§5.5). */
  labeling: ReadonlySet<string>;
};

/**
 * Why this step must not start, or null.
 *
 * A failed step is never repeated automatically — one rule, no exceptions, so a broken tool cannot
 * spend the night failing. The marker is the ledger's own last row FOR THAT STEP: keyed per
 * recording it was erased by the next job of any other kind, which handed the failing step back to
 * the loop. No new state file exists for it — `kind` names the step, `state` names the verdict.
 */
function blocker(last: Job | undefined, step: Job | undefined): { busy: true } | { reason: string } | null {
  if (last && (last.state === "queued" || last.state === "running")) return { busy: true };
  if (!step) return null;
  if (step.state === "failed" || step.state === "skipped") return { reason: step.reason ?? "gescheitert, ohne Grund im Ledger" };
  return null;
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
export function plan({ rows, lastJobs, lastSteps, labeling }: PlanInput): Plan {
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
    const blocked = blocker(lastJobs.get(row.name), lastSteps.get(`${row.name}|${step}`));
    if (blocked && "reason" in blocked) {
      repair.push({ name: row.name, step, reason: blocked.reason });
      continue;
    }
    if (blocked) continue;
    // Re-proposing rewrites `occluded-proposals.jsonl` under the cursor of whoever is labeling that
    // session right now (`loadProposals` is mtime-keyed), so a fresh ledger row holds the step.
    if (step === "propose" && (chain.hasProposals || labeling.has(sessionId(row.name)))) continue;
    eligible.push({ name: row.name, step });
  }

  return { eligible: oldestFirst(eligible), repair: oldestFirst(repair), adopt: adopt.sort(byRecording) };
}

/**
 * Sessions with a correction row younger than [since], read from the ledger's tail.
 *
 * The file is append-only, so recent rows are the last ones: the scan stops at the first row older
 * than the cutoff. The caller still READS all 17 000 lines — what this saves is the `JSON.parse`
 * per line, every 30 seconds, not the file read.
 */
export function sessionsTouchedSince(text: string, since: number): Set<string> {
  const out = new Set<string>();
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    let row: { session_id?: string; ts?: string };
    try {
      row = JSON.parse(line) as { session_id?: string; ts?: string };
    } catch {
      continue;
    }
    const at = Date.parse(row.ts ?? "");
    if (!Number.isFinite(at)) continue;
    if (at < since) break;
    if (row.session_id) out.add(row.session_id);
  }
  return out;
}
