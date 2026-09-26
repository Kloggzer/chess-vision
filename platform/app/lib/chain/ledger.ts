/** Das Ledger `inbox/jobs.jsonl`: jede Zeile eines Jobs, einer nach dem anderen angehaengt, und
 *  zurueckgelesen — ein Job von vor dem Neustart ist weiter eine Tatsache. */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { appendRows } from "@/lib/atomic";
import { queue, type Job } from "@/lib/chain/slot";
import { inboxDir } from "@/lib/ingest/ingest";
import { checkName } from "@/lib/session-store/recordings";
import { jsonlRows } from "@/lib/jsonl";
import { absentOnly } from "@/lib/measurement";

export function jobsDir(): string {
  return path.join(inboxDir(), "jobs");
}

/** The ledger line alone — a row that names no slot (`holdExport`) never enters the queue. */
export async function appendRow(job: Job): Promise<void> {
  // Einer nach dem anderen: `appendRows` prueft erst den Schwanz und haengt DANACH an. Gleichzeitig
  // landete die `running`-Zeile hinter `done`, und `restarted()` las den Schritt als Leiche.
  const mine = queue.ledger.then(async () => {
    await mkdir(jobsDir(), { recursive: true });
    // `pid` is what lets a SECOND server tell "a job died with its process" from "another process
    // is running this right now" — without it every foreign row read as a corpse (`restarted`).
    await appendRows(path.join(inboxDir(), "jobs.jsonl"), [{ ...job, pid: process.pid }]);
  });
  // Ein Fehler darf die Reihe nicht vergiften — der naechste Schreiber kommt trotzdem dran.
  queue.ledger = mine.catch(() => undefined);
  return mine;
}

/** Ein fertiger Lauf NEBEN dem Slot (`adopt-dirty`): nur Endzustaende, sonst laese `restarted` ihn als Leiche. */
export async function recordOffSlot(job: Job & { state: "done" | "failed" }): Promise<void> {
  await appendRow(job);
}

export async function record(job: Job): Promise<void> {
  queue.jobs.set(job.name, job);
  await appendRow(job);
}

/** NUR "nicht da" heisst "noch nichts gelaufen": geschluckt zeigte eine unlesbare `jobs.jsonl`
 *  die ganze Fehlerhistorie als erfolgsfoermige Leere. */
async function ledgerRows(): Promise<Job[]> {
  const text = await readFile(path.join(inboxDir(), "jobs.jsonl"), "utf8").catch(absentOnly);
  return text === null ? [] : (jsonlRows(text) as unknown as Job[]);
}

/** Every ledger row of ONE recording, newest first — the job log of `/game/<name>` (§3.1). */
export async function jobHistory(name: string, limit = 20): Promise<Job[]> {
  checkName(name, "game name");
  return (await ledgerRows()).filter((row) => row.name === name).reverse().slice(0, limit);
}

/** The ledger, last row per [key]. `pid` survives it — it decides whose corpse a row is. */
export async function readLedger(key: (row: Job) => string): Promise<Map<string, Job>> {
  return new Map((await ledgerRows()).map((row) => [key(row), row]));
}
