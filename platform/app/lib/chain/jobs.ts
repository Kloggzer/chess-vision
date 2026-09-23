/** Die Warteschlange der Kette: EIN Slot, mit Absicht — ein Replay-JVM haelt ~6 GB, ein zweiter Pack
 *  daneben fuellte 32 GB. Den Lauf macht `runners.ts`; ein Fehler steht mit GRUND im Ledger. */
import { alive, releaseHeavyLock } from "@/lib/chain/heavy-lock";
import { appendRow, readLedger } from "@/lib/chain/ledger";
import { guard, runChesslab, runLabel, runPack, runPhoneRecord } from "@/lib/chain/runners";
import { type Job, queue, runningJob } from "@/lib/chain/slot";
import { killTree } from "@/lib/chain/spawn";
import { checkName } from "@/lib/session-store/recordings";

/** The heavy lock belongs to the SLOT, not to one job: per job it would unlock the machine while the
 *  next job of the same chain is still working. */
async function releaseWhenIdle(): Promise<void> {
  if (runningJob()) return;
  await releaseHeavyLock().catch(() => undefined);
}

/** Returns immediately — the caller is an upload that must not wait for a job measured in minutes. */
export async function enqueuePack(name: string): Promise<Job> {
  const known = queue.jobs.get(name);
  if (known && (known.state === "queued" || known.state === "running")) return known;
  const job: Job = { name, kind: "pack", state: "queued", queuedAt: new Date().toISOString() };
  queue.jobs.set(name, job);
  queue.running = queue.running.then(() => guard(job, () => runPack(job))).then(releaseWhenIdle);
  return job;
}

/** Queue the manual tracker proposal used by the UI when no phone game record exists. */
export async function enqueueLabel(name: string, lens?: boolean): Promise<Job> {
  checkName(name, "transfer name");
  const known = queue.jobs.get(name);
  if (known && (known.state === "queued" || known.state === "running")) return known;
  const job: Job = { name, kind: "label", state: "queued", queuedAt: new Date().toISOString() };
  queue.jobs.set(name, job);
  queue.running = queue.running.then(() => guard(job, () => runLabel(job, lens))).then(releaseWhenIdle);
  return job;
}

/** Same queue and same guard as the replay: it is the same machine, only far cheaper. */
export async function enqueuePhoneRecord(name: string): Promise<Job> {
  checkName(name, "transfer name");
  const known = queue.jobs.get(name);
  if (known && (known.state === "queued" || known.state === "running")) return known;
  const job: Job = { name, kind: "phone-record", state: "queued", queuedAt: new Date().toISOString() };
  queue.jobs.set(name, job);
  queue.running = queue.running.then(() => guard(job, () => runPhoneRecord(job))).then(releaseWhenIdle);
  return job;
}

/** Spawned, never imported — the file formats are the only bridge to Python — and in the SAME
 *  single-slot queue as the packs, because they share the machine's CPU. */
export async function enqueueChain(
  name: string,
  step: "export" | "adopt-dirty" | "settle-scan" | "matte" | "temporal" | "model-read",
  also: string[] = [],
): Promise<Job> {
  checkName(name, "game name");
  for (const row of also) checkName(row, "game name");
  const known = queue.jobs.get(name);
  if (known && (known.state === "queued" || known.state === "running")) return known;
  const job: Job = { name, kind: step, state: "queued", queuedAt: new Date().toISOString(),
                     ...(also.length ? { also } : {}) };
  queue.jobs.set(name, job);
  queue.running = queue.running.then(() => guard(job, () => runChesslab(job, step))).then(releaseWhenIdle);
  return job;
}

/** A LEDGER row, no slot: the picker starts it once the hold expires, so pause, heavy lock and 409
 *  still apply. `skipped`, because `queued` would read as a corpse to `restarted()` and as busy. */
export async function holdExport(name: string, holdMs: number): Promise<Job> {
  checkName(name, "game name");
  const notBefore = new Date(Date.now() + holdMs).toISOString();
  const job: Job = {
    name,
    kind: "export",
    state: "skipped",
    reason: `Export gehalten bis ${notBefore} — z macht die Bestätigung so lange kostenlos rückgängig`,
    queuedAt: new Date().toISOString(),
    notBefore,
  };
  await appendRow(job);
  return job;
}

/** False once the hold expired or the export started — then the undo costs a re-export, and the UI
 *  has to say so. */
export async function releaseExportHold(name: string): Promise<{ dequeued: boolean; held: Job | null }> {
  checkName(name, "game name");
  const held = (await lastByStep()).get(`${name}|export`) ?? null;
  if (!held?.notBefore || Date.parse(held.notBefore) <= Date.now()) return { dequeued: false, held };
  await appendRow({
    ...held,
    state: "skipped",
    reason: "z — zurückgenommen, der Export lief nie",
    finishedAt: new Date().toISOString(),
  });
  return { dequeued: true, held };
}

/** End what is in the slot NOW. `alpha_worker` flushes per frame and export/label rewrite from
 *  scratch, so the kill costs the frame in flight. */
export async function stopRunning(): Promise<{ stopped: string } | { error: string }> {
  const live = queue.live;
  if (!live?.child.pid) return { error: "kein Prozess läuft" };
  queue.stopped.add(live.name);
  await killTree(live.child.pid);
  return { stopped: live.name };
}

/** "Not in THIS process's queue" turned every job of a SECOND server into a corpse; the pid is the
 *  honest test, and rows from before the key keep the old rule. */
function restarted(row: Job): boolean {
  if (row.state !== "running" && row.state !== "queued") return false;
  // A live child means the work is still happening whether or not its server survived it.
  if (row.childPid !== undefined && alive(row.childPid)) return false;
  if (row.pid === undefined) return !queue.jobs.has(row.name);
  return row.pid === process.pid ? !queue.jobs.has(row.name) : !alive(row.pid);
}

const asFailed = (row: Job): Job => ({
  ...row,
  state: "failed",
  reason: "the server restarted while this job was running — press the step again",
  finishedAt: row.finishedAt ?? row.startedAt ?? row.queuedAt,
});

/** Der Job EINER Aufnahme, ohne Liste: `jobs(n)` schneidet vor dem Filtern, und hinter genug
 *  neueren Zeilen las ein laufender Job als idle — die Seite bot ihren Knopf ein zweites Mal an. */
export async function jobOf(name: string): Promise<Job | null> {
  const live = queue.jobs.get(name);
  const row = (await readLedger((r) => r.name)).get(name) ?? null;
  if (live && supersedes(row ?? undefined, live)) return live;
  return row === null ? live ?? null : (restarted(row) ? asFailed(row) : row);
}

/**
 * Die Speicher-Zeile gewinnt nur, wenn sie nicht AELTER ist als die im Ledger: `holdExport`
 * schreibt am Slot vorbei, und ein fertiger Export im Speicher verdeckte den Halt.
 */
function supersedes(row: Job | undefined, job: Job): boolean {
  return row === undefined || row.queuedAt <= job.queuedAt;
}

/** In-memory state first, the ledger behind it — a job from before a restart is still a fact. */
export async function jobs(limit = 25): Promise<Job[]> {
  const seen = await readLedger((row) => row.name);
  for (const [name, row] of seen) if (restarted(row)) seen.set(name, asFailed(row));
  for (const [name, job] of queue.jobs) if (supersedes(seen.get(name), job)) seen.set(name, job);
  return [...seen.values()].sort((a, b) => (a.queuedAt < b.queuedAt ? 1 : -1)).slice(0, limit);
}

/**
 * The ledger's last row per `<name>|<kind>` — the no-retry marker, per STEP. Keyed per name, a
 * later job of another kind silently cleared a failed `export`, which then ran again all night.
 */
export async function lastByStep(): Promise<Map<string, Job>> {
  const seen = await readLedger((row) => `${row.name}|${row.kind ?? "job"}`);
  for (const [key, row] of seen) if (restarted(row)) seen.set(key, asFailed(row));
  for (const job of queue.jobs.values()) {
    const key = `${job.name}|${job.kind ?? "job"}`;
    if (supersedes(seen.get(key), job)) seen.set(key, job);
  }
  return seen;
}
