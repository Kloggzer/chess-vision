// No ticker, no timer, no work on import: every job starts on a press (2026-08-18).
import { adoptFailures, clearAdoptFailures } from "@/lib/chain";
import { refused, startStep } from "@/lib/chain-run";
import { jobs, lastByStep, runningJob, stopRunning, whenIdle, type Job } from "@/lib/jobs";
import { backlog, JOB_STEPS, type Backlog, type JobStep } from "@/lib/backlog";
import { readHeavyLock, stale } from "@/lib/heavy-lock";
import { queueRows } from "@/lib/queues";

/** The panel polls; two polls inside this window share one pass over `recordings/`. */
const SNAPSHOT_MS = 10_000;

/** `"chain"` folgt der KETTE statt einer Sprosse: jede Aufnahme auf ihrer eigenen, bis zum
 *  naechsten Menschen-Tor (`confirm`, `labeln` sind Seiten und damit keine Jobs). */
export type DrainTarget = JobStep | "chain";

/** One press, one step, across the corpus. `started` is the loop guard, gekeyt auf
 *  `<name>|<step>`: eine Aufnahme darf dieselbe Sprosse nie zweimal nehmen, die naechste schon. */
type Drain = { step: DrainTarget; started: Set<string>; stopped: boolean };

const taken = (name: string, step: JobStep) => `${name}|${step}`;

type Engine = {
  /** The backlog a human is draining right now — never more than one, because the slot is one. */
  drain: Drain | null;
  /** What a drain ran into. Kept until the next press, which is the human answering it. */
  errors: string[];
  snapshot: { at: number; backlog: Backlog } | null;
};

/** Pinned across hot reloads: a second module instance would forget which drain is running and
 *  hand the single slot to two of them. */
const engine: Engine = ((globalThis as { __chesslabDrain?: Engine }).__chesslabDrain ??= {
  drain: null,
  errors: [],
  snapshot: null,
});
engine.errors ??= [];

async function freshBacklog(): Promise<Backlog> {
  const [rows, ledger, lastSteps] = await Promise.all([queueRows(), jobs(500), lastByStep()]);
  const lastJobs = new Map<string, Job>(ledger.map((job) => [job.name, job]));
  const next = backlog({ rows, lastJobs, lastSteps });
  engine.snapshot = { at: Date.now(), backlog: next };
  return next;
}

async function cachedBacklog(): Promise<Backlog> {
  const hit = engine.snapshot;
  if (hit && Date.now() - hit.at < SNAPSHOT_MS) return hit.backlog;
  return freshBacklog();
}

/** SAM zu laden kostet 7-9 min, die Arbeit danach Sekunden je Frame (gemessen 2026-09-15) —
 *  also faehrt der ganze Stapel in EINEM Prozess. Jeder andere Schritt bleibt einzeln: er haelt
 *  den Heavy-Slot kuerzer, und Stopp trifft dann genau eine Aufnahme. */
const BATCHED: JobStep = "matte";

/** Die Aufnahmen aus [rest], die denselben Matte-Modus haben wie [first]. */
async function sameMattePass(first: string, rest: string[]): Promise<string[]> {
  const mode = new Map((await queueRows()).map((row) => [row.name, row.chain.mattes.reportedOpen > 0]));
  const wanted = mode.get(first);
  return rest.filter((row) => mode.get(row) === wanted);
}

/** Die Sprossen, die dieser Druck bedienen darf — `JOB_STEPS` steht in Kettenreihenfolge. */
const lane = (drain: Drain): readonly JobStep[] => (drain.step === "chain" ? JOB_STEPS : [drain.step]);

// Null = nothing left to take: the backlog is empty, or Stopp was pressed since the last one.
async function drainNext(drain: Drain): Promise<{ started: string } | { error: string } | null> {
  if (drain.stopped) return null;
  const waiting = (await freshBacklog()).waiting;
  let step: JobStep | undefined;
  let open: string[] = [];
  for (const candidate of lane(drain)) {
    open = waiting[candidate].filter((row) => !drain.started.has(taken(row, candidate)));
    if (open.length > 0) {
      step = candidate;
      break;
    }
  }
  const [name, ...rest] = open;
  if (name === undefined || step === undefined) return null;
  // Nur Aufnahmen im SELBEN Modus: `runChesslab` waehlt `--reported` oder `--limit` einmal fuer
  // den Prozess, also duerfen nicht beide Sorten mitreisen (`mattes.reportedOpen`).
  const also = step === BATCHED ? await sameMattePass(name, rest) : [];
  const started = await startStep(name, step, undefined, also);
  if (refused(started)) return { error: `${name}: ${started.error}` };
  for (const row of [name, ...also]) drain.started.add(taken(row, step));
  engine.snapshot = null;
  return { started: name };
}

// The next recording once the slot frees — `whenIdle` covers any other job in it as well as ours.
function keepDraining(drain: Drain): void {
  void whenIdle()
    .then(() => drainNext(drain))
    .then((next) => {
      if (next && "error" in next) engine.errors.push(next.error);
      if (next && "started" in next) return keepDraining(drain);
      engine.drain = null;
    })
    .catch((error: unknown) => {
      engine.errors.push(error instanceof Error ? error.message : String(error));
      engine.drain = null;
    });
}

/**
 * Drain ONE step across the corpus, oldest recording first, one recording at a time.
 * Every job goes through `startStep`, so a press shares the single slot and the heavy lock with
 * every other press; the first refusal goes back to the button instead of only to the panel.
 */
export async function startDrain(step: DrainTarget): Promise<{ started: string } | { error: string }> {
  if (engine.drain) return { error: `${engine.drain.step} läuft schon — ein Schritt nach dem anderen` };
  engine.errors = [];
  clearAdoptFailures();
  const drain: Drain = { step, started: new Set(), stopped: false };
  engine.drain = drain;
  const first = await drainNext(drain).catch((error: unknown) => ({ error: String(error) }));
  if (first === null || "error" in first) {
    engine.drain = null;
    return first ?? { error: "nichts wartet auf diesen Schritt" };
  }
  keepDraining(drain);
  return first;
}

/**
 * Stopp: the running process is killed and no further recording is taken. Not a pause — the user
 * pressed stop and watched an 11-second-per-frame job carry on (2026-08-19): "alles stehen und
 * liegen lassen". Works on a job started from a card too, which is why it does not need a drain.
 */
export async function stopDrain(): Promise<{ stopped: string } | { error: string }> {
  const drain = engine.drain;
  if (drain) drain.stopped = true;
  const killed = await stopRunning();
  if ("stopped" in killed) return killed;
  return drain ? { stopped: drain.step } : killed;
}

export type DrainStatus = {
  /** What is in the single slot right now, whichever press put it there. */
  running: { name: string; step: string } | null;
  /** Recordings sitting on each job step — what the panel's buttons count, and drain. */
  waiting: Record<JobStep, number>;
  /** The step being drained and how far it has got. */
  drain: { step: DrainTarget; done: number; left: number; stopped: boolean } | null;
  repair: number;
  /** Another process holds the machine-wide lock, so nothing of ours may start. */
  foreignLock: { pid: number; job: string; name: string } | null;
  error: string | null;
};

function countWaiting(next: Backlog): Record<JobStep, number> {
  const out = {} as Record<JobStep, number>;
  for (const step of JOB_STEPS) out[step] = next.waiting[step].length;
  return out;
}

export async function drainStatus(): Promise<DrainStatus> {
  const [lock, next] = await Promise.all([readHeavyLock(), cachedBacklog()]);
  const job = runningJob();
  const foreign = lock && lock.pid !== process.pid && !stale(lock) ? lock : null;
  const drain = engine.drain;
  const errors = [...engine.errors, ...adoptFailures()];
  return {
    running: job ? { name: job.name, step: job.kind ?? "job" } : null,
    waiting: countWaiting(next),
    drain: drain
      ? { step: drain.step, done: drain.started.size, stopped: drain.stopped,
          left: lane(drain).reduce((sum, step) => sum + next.waiting[step].length, 0) }
      : null,
    repair: next.repair.length,
    foreignLock: foreign ? { pid: foreign.pid, job: foreign.job, name: foreign.name } : null,
    error: errors.length > 0 ? errors.join(" · ") : null,
  };
}

/** What the Reparatur lane lists: every step that will not run again without a human. */
export async function repairs(): Promise<Backlog["repair"]> {
  return (await freshBacklog()).repair;
}
