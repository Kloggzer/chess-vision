// Single door for every press; the lock is taken HERE, so no two heavy jobs can overlap.
import { chainState, type ChainState } from "@/lib/chain";
import { claimHeavyLock, releaseHeavyLock } from "@/lib/heavy-lock";
import { enqueueChain, enqueueLabel, enqueuePhoneRecord, modelReadRun, runningJob, type Job } from "@/lib/jobs";

export type StepRefusal = { error: string; state: ChainState; status: 400 | 409 };

export async function startStep(name: string, step: string, lens?: boolean): Promise<Job | StepRefusal> {
  const state = await chainState(name);
  // The flag is the whole reason there is no step; running one anyway would be the one thing the
  // user asked it to prevent.
  if (state.step === null) return { error: "als nutzlos markiert — kein Schritt läuft", state, status: 409 };
  // The replay answers a refused `phone-record`: the disk still says phone-record, so without this
  // the card's fallback button would be the one press the door never lets through.
  const fallback = step === "label" && !state.hasCandidate;
  if (step !== state.step && !fallback) return { error: `next step is "${state.step}", not "${step}"`, state, status: 409 };
  if (state.step !== "phone-record" && state.step !== "label" && state.step !== "export" && state.step !== "matte" && state.step !== "model-read") {
    return { error: `"${state.step}" is a page, not a job`, state, status: 400 };
  }
  // Refused here rather than after a spawn: the verb requires `--model` and rejects a run that
  // trained on this session, so a missing choice is a question for a human, not a failed job.
  if (state.step === "model-read" && !modelReadRun()) {
    return { error: "kein Modell gewählt — CHESSLAB_MODEL_READ_RUN auf ein Run-Verzeichnis setzen, das NICHT auf dieser Session trainiert hat", state, status: 409 };
  }

  // Refused, not queued: a press is a decision about what the panel shows RIGHT NOW, and a job
  // that starts minutes later, unwatched, is how three SAM workers ended up on one GPU (2026-08-19).
  const running = runningJob();
  if (running) {
    return { error: `es läuft schon ${running.kind ?? "ein Job"} ${running.name} — erst Stopp drücken oder abwarten`, state, status: 409 };
  }

  // What was PRESSED holds the lock and gets queued: on the fallback the two differ, and a lock
  // naming the step that refused would leave `phone-record` in `heavy.lock` while a replay runs.
  const requested = fallback ? "label" : state.step;
  const lock = await claimHeavyLock(requested, name);
  if ("foreign" in lock) {
    const { pid, job, name: holder } = lock.foreign;
    return { error: `heavy.lock: pid ${pid} arbeitet an ${job} ${holder}`, state, status: 409 };
  }
  try {
    if (requested === "label") return await enqueueLabel(name, lens);
    if (requested === "phone-record") return await enqueuePhoneRecord(name);
    return await enqueueChain(name, requested);
  } catch (error) {
    // Nothing was queued, so nothing will ever release it — the lock has to go back now.
    await releaseHeavyLock().catch(() => undefined);
    throw error;
  }
}

export function refused(result: Job | StepRefusal): result is StepRefusal {
  return "error" in result;
}
