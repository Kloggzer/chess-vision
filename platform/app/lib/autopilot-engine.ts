/**
 * Autopilot's engine: the ticker, the lock and the strip's numbers (`CONCEPT.md` §5).
 *
 * A loop driven by page loads would make "a recording works its way to the stream by itself" true
 * only while a browser tab is open, so the tick is a `setInterval` started from
 * `instrumentation.ts` — once per server process — plus an event tick when the slot frees.
 */
import { readFile } from "node:fs/promises";
import { adoptPgn } from "@/lib/chain";
import { refused, startStep } from "@/lib/chain-run";
import { ledgerPath } from "@/lib/corrections";
import { busy, jobs, lastByStep, runningJob, whenIdle, type Job } from "@/lib/jobs";
import { plan, sessionsTouchedSince, type Eligible, type Plan } from "@/lib/autopilot";
import { isPaused, readHeavyLock, stale } from "@/lib/autopilot-state";
import { queueRows } from "@/lib/queues";

const TICK_MS = 30_000;
/** Guard 5: a session with a correction row this fresh is being labeled right now (§5.5). */
const LABELING_HOLD_MS = 10 * 60_000;
/** The strip polls; two polls inside this window share one pass over `realgames/`. */
const SNAPSHOT_MS = 10_000;

type Engine = {
  timer: ReturnType<typeof setInterval> | null;
  ticking: boolean;
  /** What THIS loop started, as opposed to a job a human pressed. */
  current: Eligible | null;
  /** Everything the CURRENT pass ran into — one field per tick lost all but the last of them. */
  errors: string[];
  /** Bundle → why `adoptPgn` refused it. Also the do-not-retry set: the refusal is deterministic. */
  adoptFailed: Map<string, string>;
  snapshot: { at: number; plan: Plan } | null;
};

/**
 * Pinned like `jobs.ts`'s queue: a hot reload that re-imports this module must not leave a second
 * interval behind, and two tickers on one slot is exactly the race the single slot exists to avoid.
 */
const engine: Engine = ((globalThis as { __chesslabAutopilot?: Engine }).__chesslabAutopilot ??= {
  timer: null,
  ticking: false,
  current: null,
  errors: [],
  adoptFailed: new Map(),
  snapshot: null,
});
// The pin outlives a hot reload ACROSS shape changes: an object created by older code lacks the
// fields added since, and the crash surfaces on the strip, not here. Heal instead of trusting.
engine.errors ??= [];
engine.adoptFailed ??= new Map();

async function labelingSessions(): Promise<Set<string>> {
  try {
    const text = await readFile(ledgerPath("corrections"), "utf8");
    return sessionsTouchedSince(text, Date.now() - LABELING_HOLD_MS);
  } catch {
    return new Set();
  }
}

async function freshPlan(): Promise<Plan> {
  const [rows, ledger, lastSteps, labeling] = await Promise.all([
    queueRows(),
    jobs(500),
    lastByStep(),
    labelingSessions(),
  ]);
  const lastJobs = new Map<string, Job>(ledger.map((job) => [job.name, job]));
  const next = plan({ rows, lastJobs, lastSteps, labeling });
  engine.snapshot = { at: Date.now(), plan: next };
  return next;
}

async function cachedPlan(): Promise<Plan> {
  const hit = engine.snapshot;
  if (hit && Date.now() - hit.at < SNAPSHOT_MS) return hit.plan;
  return freshPlan();
}

/**
 * One pass: adopt what is free, then start at most one machine step.
 *
 * A no-op when paused, when the slot is busy, when a foreign process holds the heavy lock, or when
 * nothing is eligible — those are the four ways this loop is allowed to do nothing.
 */
export async function tick(): Promise<void> {
  if (engine.ticking) return;
  engine.ticking = true;
  try {
    if (await isPaused()) return;
    // Cleared per pass: this list says why the loop cannot work RIGHT NOW. What failed for good is
    // in `repair` and in `adoptFailed`, neither of which a tick rewrites.
    engine.errors = [];
    const next = await freshPlan();
    for (const name of next.adopt) {
      if (engine.adoptFailed.has(name)) continue;
      const adopted = await adoptPgn(name);
      // Non-destructive by construction (`adoptPgn` never overwrites), so a refusal is news — and
      // it is the SAME news every 30 s, so it is remembered instead of retried until a human acts.
      if ("reason" in adopted) engine.adoptFailed.set(name, `PGN ${name}: ${adopted.reason}`);
    }
    if (busy() || next.eligible.length === 0) return;
    const pick = next.eligible[0];
    // The heavy lock is `startStep`'s — the same door the button goes through, so a manual press
    // and a tick cannot both be "the one heavy job", and nothing here has to release it.
    const started = await startStep(pick.name, pick.step);
    if (refused(started)) {
      engine.errors.push(`${pick.name}: ${started.error}`);
      return;
    }
    engine.current = pick;
    engine.snapshot = null;
    void whenIdle().then(() => {
      engine.current = null;
      engine.snapshot = null;
      return tick();
    });
  } catch (error) {
    engine.errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    engine.ticking = false;
  }
}

/** The pause press is a human taking over: what the loop gave up on is theirs to retry now. */
export function clearErrors(): void {
  engine.errors = [];
  engine.adoptFailed.clear();
}

export type AutopilotStatus = {
  paused: boolean;
  /** The step in the slot — `auto: false` when a human pressed it. */
  running: { name: string; step: string; auto: boolean } | null;
  queued: number;
  repair: number;
  /** Another process holds the machine-wide lock, so nothing of ours may start. */
  foreignLock: { pid: number; job: string; name: string } | null;
  error: string | null;
};

export async function autopilotStatus(): Promise<AutopilotStatus> {
  const [paused, lock, next] = await Promise.all([isPaused(), readHeavyLock(), cachedPlan()]);
  const job = runningJob();
  const running = engine.current
    ? { name: engine.current.name, step: engine.current.step, auto: true }
    : job
      ? { name: job.name, step: job.kind ?? "job", auto: false }
      : null;
  const foreign = lock && lock.pid !== process.pid && !stale(lock) ? lock : null;
  const errors = [...engine.errors, ...engine.adoptFailed.values()];
  return {
    paused,
    running,
    queued: next.eligible.length,
    repair: next.repair.length,
    foreignLock: foreign ? { pid: foreign.pid, job: foreign.job, name: foreign.name } : null,
    error: errors.length > 0 ? errors.join(" · ") : null,
  };
}

/** What the Reparatur lane lists: every step that will not run again without a human. */
export async function repairPlan(): Promise<Plan["repair"]> {
  return (await freshPlan()).repair;
}

/**
 * Start the loop. First tick after the full interval, on purpose: a server that begins a 6 GB
 * replay the second it boots gives nobody time to reach the pause toggle.
 */
export function startAutopilot(): void {
  if (engine.timer) return;
  const timer = setInterval(() => void tick(), TICK_MS);
  timer.unref?.();
  engine.timer = timer;
}
