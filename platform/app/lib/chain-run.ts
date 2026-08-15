/**
 * The one door into the chain, for the button and for the Autopilot.
 *
 * The step is checked against the DISK rather than trusted: a button can be stale and an autopilot
 * tick can be a second old, and running `export-session` on an unconfirmed candidate writes an
 * empty session that looks like a failure of the recording. Refusal is a 409 with the state.
 *
 * The heavy lock is taken HERE, not in the Autopilot: a lock only the loop respects is no lock at
 * all — the button starts the same 6 GB replay. It is released when the queue runs dry (`jobs.ts`).
 */
import { chainState, type ChainState } from "@/lib/chain";
import { claimHeavyLock, releaseHeavyLock } from "@/lib/autopilot-state";
import { enqueueChain, enqueueLabel, type Job } from "@/lib/jobs";

export type StepRefusal = { error: string; state: ChainState; status: 400 | 409 };

export async function startStep(name: string, step: string, lens?: boolean): Promise<Job | StepRefusal> {
  const state = await chainState(name);
  // The flag is the whole reason there is no step; running one anyway would be the one thing the
  // user asked it to prevent.
  if (state.step === null) return { error: "als nutzlos markiert — kein Schritt läuft", state, status: 409 };
  if (step !== state.step) return { error: `next step is "${state.step}", not "${step}"`, state, status: 409 };
  if (state.step !== "label" && state.step !== "export" && state.step !== "propose") {
    return { error: `"${state.step}" is a page, not a job`, state, status: 400 };
  }

  const lock = await claimHeavyLock(state.step, name);
  if ("foreign" in lock) {
    const { pid, job, name: holder } = lock.foreign;
    return { error: `heavy.lock: pid ${pid} arbeitet an ${job} ${holder}`, state, status: 409 };
  }
  try {
    return state.step === "label" ? await enqueueLabel(name, lens) : await enqueueChain(name, state.step);
  } catch (error) {
    // Nothing was queued, so nothing will ever release it — the lock has to go back now.
    await releaseHeavyLock().catch(() => undefined);
    throw error;
  }
}

export function refused(result: Job | StepRefusal): result is StepRefusal {
  return "error" in result;
}
