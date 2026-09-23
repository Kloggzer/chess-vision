/** Ein Lauf im Slot, von der Vorpruefung bis zur letzten Ledger-Zeile — je Job-Art eine Funktion,
 *  dazu die zwei Spawner, die den Prozess in `queue.live` halten, damit Stopp ihn findet. */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { stampHeavyLockChild } from "@/lib/chain/heavy-lock";
import {
  type ChesslabStep, chesslabArgs, desktopBinary, desktopWorkDir, labelArgs, lensFor, modelReadRun,
  packArgs, phoneArgs, positionFlagsArgs, repoDir, retimeArgs, uvBinary, VERB,
} from "@/lib/chain/cli-args";
import { lastWords, logSink, refusalOf } from "@/lib/chain/job-log";
import { jobsDir, record } from "@/lib/chain/ledger";
import { packInputs, type PackResult, verifyPack } from "@/lib/chain/pack";
import { type Job, type JobState, queue } from "@/lib/chain/slot";
import { spawnTool } from "@/lib/chain/spawn";
import { gameDir, hasCandidateFile } from "@/lib/session-store/recordings";
import { targetDir, videoInput } from "@/lib/ingest/ingest";
import { matteCensus } from "@/lib/session-store/matte";
import { exists } from "@/lib/measurement";

const STOPPED = "gestoppt — der Prozess wurde beendet; ein neuer Druck fängt wieder an";

/**
 * The queue's last line of defence: a run that throws is a FAILED job, not a silent one — a
 * `.catch(() => undefined)` left a synchronous `spawn` throw at "running" forever.
 */
export async function guard(job: Job, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    await record({
      ...job,
      state: "failed",
      reason: `the job threw before it could report: ${error instanceof Error ? error.message : String(error)}`,
      finishedAt: new Date().toISOString(),
    }).catch(() => undefined);
  }
}

/** The row a killed job writes: `stopped`, so it reads as a decision and stays retryable. */
function endState(name: string, code: number): { state: JobState; stopped: boolean } {
  const stopped = queue.stopped.delete(name);
  return { state: stopped ? "stopped" : code === 0 ? "done" : "failed", stopped };
}

async function runDesktop(binary: string, args: string[], running: Job, log: string,
                          cwd: string = desktopWorkDir()): Promise<number> {
  return new Promise<number>((resolve) => {
    const sink = logSink(log, `$ ${running.command}\n`);
    let child;
    try {
      child = spawnTool(binary, args, cwd);
    } catch (error) {
      // A job that cannot even start must say so.
      sink.end(`\nspawn threw: ${error instanceof Error ? error.message : String(error)}\n`);
      resolve(-1);
      return;
    }
    if (child.pid !== undefined) {
      running.childPid = child.pid;
      queue.live = { name: running.name, child };
      void record(running);
      // The lock must name the JOB, not the server: a killed job then frees the slot by dying.
      void stampHeavyLockChild(child.pid).catch(() => undefined);
    }
    child.stdout.pipe(sink.stream, { end: false });
    child.stderr.pipe(sink.stream, { end: false });
    child.on("error", (error) => {
      sink.end(`\nspawn failed: ${error.message}\n`);
      resolve(-1);
    });
    child.on("close", (value) => {
      if (queue.live?.child === child) queue.live = null;
      sink.end(`\nexit ${value}\n`);
      resolve(value ?? -1);
    });
  });
}

export async function runPack(job: Job): Promise<void> {
  const inputs = await packInputs(job.name);
  if ("reason" in inputs) {
    await record({ ...job, state: "skipped", reason: inputs.reason, finishedAt: new Date().toISOString() });
    return;
  }
  const binary = desktopBinary();
  if (!(await exists(binary))) {
    await record({
      ...job,
      state: "failed",
      reason: `no desktop distribution at ${binary} — run "gradlew.bat :desktop:installDist" in android/`,
      finishedAt: new Date().toISOString(),
    });
    return;
  }

  const out = path.join(path.dirname(targetDir(job.name)), "training-pack");
  const args = packArgs(inputs.video, inputs.game, out, job.name);
  const log = path.join(jobsDir(), `${job.name}.log`);
  await mkdir(jobsDir(), { recursive: true });
  const running: Job = {
    ...job,
    state: "running",
    startedAt: new Date().toISOString(),
    command: `${binary} ${args.join(" ")}`,
    log,
  };
  await record(running);

  const code = await runDesktop(binary, args, running, log);

  let pack: PackResult | undefined;
  if (code === 0) {
    try {
      pack = await verifyPack(out);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await record({
        ...running,
        state: "failed",
        code,
        reason: `unsafe or incomplete training pack: ${detail}`,
        finishedAt: new Date().toISOString(),
      });
      return;
    }
  }

  const end = endState(job.name, code);
  await record({
    ...running,
    state: end.state,
    code,
    pack,
    reason: end.stopped ? STOPPED : code === 0 ? undefined : `training-video-pack exited ${code} — see ${log}`,
    finishedAt: new Date().toISOString(),
  });
}

export async function runLabel(job: Job, lens?: boolean): Promise<void> {
  const recording = await videoInput(job.name);
  if ("reason" in recording) {
    await record({ ...job, state: "skipped", reason: recording.reason, finishedAt: new Date().toISOString() });
    return;
  }
  if (await hasCandidateFile(job.name)) {
    await record({
      ...job,
      state: "done",
      candidate: job.name,
      reason: "candidate already exists — nothing was overwritten",
      finishedAt: new Date().toISOString(),
    });
    return;
  }
  const binary = desktopBinary();
  if (!(await exists(binary))) {
    await record({
      ...job,
      state: "failed",
      reason: `no desktop distribution at ${binary} — run "gradlew.bat :desktop:installDist" in android/`,
      finishedAt: new Date().toISOString(),
    });
    return;
  }
  // Decided ONCE, before the run, never by retry: the source picks it and the record keeps it.
  const corrected = lens ?? lensFor(recording.video);
  const args = labelArgs(recording.video, job.name, corrected);
  const log = path.join(jobsDir(), `${job.name}.label.log`);
  await mkdir(jobsDir(), { recursive: true });
  const running: Job = {
    ...job,
    state: "running",
    startedAt: new Date().toISOString(),
    command: `${binary} ${args.join(" ")}`,
    log,
    lens: corrected,
  };
  await record(running);
  const code = await runDesktop(binary, args, running, log);
  const madeCandidate = code === 0 && (await hasCandidateFile(job.name));
  const end = endState(job.name, madeCandidate ? 0 : 1);
  await record({
    ...running,
    state: end.state,
    code,
    candidate: madeCandidate ? job.name : undefined,
    // The tool's own last words, not just a path. Ein GESTOPPTER Lauf hat keine — sein Log bricht
    // mitten im Satz ab, und `exit -1` las sich als Werkzeugfehler.
    reason: end.stopped ? STOPPED : madeCandidate ? undefined : `${await lastWords(log)} (exit ${code}, ${log})`,
    finishedAt: new Date().toISOString(),
  });
}

/**
 * `phone-candidate` over the whole bundle: the record's plies, timed against the video. The verb
 * states its own refusal on one line (`refusalOf`) — everything else is an exit code.
 */
export async function runPhoneRecord(job: Job): Promise<void> {
  const binary = desktopBinary();
  if (!(await exists(binary))) {
    await record({
      ...job,
      state: "failed",
      reason: `no desktop distribution at ${binary} — run "gradlew.bat :desktop:installDist" in android/`,
      finishedAt: new Date().toISOString(),
    });
    return;
  }
  const args = phoneArgs(gameDir(job.name));
  const log = path.join(jobsDir(), `${job.name}.phone-record.log`);
  await mkdir(jobsDir(), { recursive: true });
  const running: Job = {
    ...job,
    state: "running",
    startedAt: new Date().toISOString(),
    command: `${binary} ${args.join(" ")}`,
    log,
  };
  await record(running);
  let code = await runDesktop(binary, args, running, log);
  // The phone's commits lag fast hands; the board itself times the plies (`docs/retime.md`).
  // Same job, same log: a refusal there fails the step with its own sentence.
  if (code === 0) code = await runRetime(job.name, running, log);
  const end = endState(job.name, code);
  await record({
    ...running,
    state: end.state,
    code,
    candidate: code === 0 ? job.name : undefined,
    reason: end.stopped
      ? STOPPED
      : code === 0
        ? undefined
        : (refusalOf(await readFile(log, "utf8").catch(() => "")) ?? `exit ${code}`),
    finishedAt: new Date().toISOString(),
  });
}

/** `chesslab realgames retime <name>` appended to a running job's log; its exit code is the step's. */
async function runRetime(name: string, running: Job, log: string): Promise<number> {
  return appended(retimeArgs(name), running, log);
}

/** Die Karten der Strittig-Lane neu rechnen, am Ende von `model-read`. Sein Exit-Code zaehlt NICHT
 *  als der des Schritts — eine fehlende Matte darf `model-read` nicht rot faerben. */
function runPositionFlags(running: Job, log: string): Promise<number> {
  return appended(positionFlagsArgs(), running, log);
}

function appended(args: string[], running: Job, log: string): Promise<number> {
  return new Promise<number>((resolve) => {
    const sink = logSink(log, `$ ${uvBinary()} ${args.join(" ")}\n`);
    let child;
    try {
      child = spawnTool(uvBinary(), args, repoDir());
    } catch (error) {
      sink.end(`\nspawn threw: ${error instanceof Error ? error.message : String(error)}\n`);
      resolve(-1);
      return;
    }
    if (child.pid !== undefined) {
      running.childPid = child.pid;
      queue.live = { name: running.name, child };
      void record(running);
    }
    child.stdout?.pipe(sink.stream, { end: false });
    child.stderr?.pipe(sink.stream, { end: false });
    child.on("error", (error) => {
      sink.end(`\nspawn failed: ${error.message}\n`);
      resolve(-1);
    });
    child.on("close", (exit) => {
      if (queue.live?.child === child) queue.live = null;
      sink.end(`\nexit ${exit}\n`);
      resolve(exit ?? 1);
    });
  });
}

export async function runChesslab(job: Job, step: ChesslabStep): Promise<void> {
  const verb = VERB[step];
  const binary = uvBinary();
  const names = [job.name, ...(job.also ?? [])];
  // One press costs at most the overnight target, not the whole pile. `reportedOpen`, nicht
  // `reported`: eine Meldung auf einen Frame, den dieser Export nicht fuehrt, ist unerreichbar.
  // `--wanted` ist der dritte Modus: ausdruecklich geschickt, aber nicht `occluded`.
  const census = step === "matte" ? await matteCensus(job.name) : null;
  const args = chesslabArgs(step, names, {
    model: modelReadRun(),
    matte: !census ? undefined : census.reportedOpen > 0 ? "reported" : census.wanted > 0 ? "wanted" : "limit",
  });
  const log = path.join(jobsDir(), `${job.name}.${step}.log`);
  await mkdir(jobsDir(), { recursive: true });
  const running: Job = {
    ...job,
    state: "running",
    startedAt: new Date().toISOString(),
    command: `${binary} ${args.join(" ")}`,
    log,
  };
  await record(running);

  const code = await runDesktop(binary, args, running, log, repoDir());

  // Gelaufen ist gelaufen, aber nicht gelungen: der Exit fiel hier auf den Boden, und die
  // Sprosse meldete `done` ohne ein Wort — der naechste Schritt ist `labeln`.
  let flags: number | null = null;
  if (step === "model-read" && code === 0) flags = await runPositionFlags(running, log);

  const end = endState(job.name, code);
  await record({
    ...running,
    state: end.state,
    code,
    reason: end.stopped
      ? STOPPED
      : code === 0
        ? (flags !== null && flags !== 0
            ? `die Lesarten stehen, aber "chesslab realgames position-flags" endete mit ${flags} — die Strittig-Lane liegt noch auf den alten Karten, siehe ${log}`
            : undefined)
        : code === -1
          ? `could not start "${binary}" — is uv on PATH? Set CHESSLAB_UV to its full path.`
          : `chesslab ${verb} exited ${code} — see ${log}`,
    finishedAt: new Date().toISOString(),
  });
}
