/**
 * The chain a landed transfer triggers: `:desktop training-video-pack`, one at a time.
 *
 * ONE worker, deliberately. A replay JVM holds ~6 GB private memory, most of it native and beyond
 * any `-Xmx` (see `scripts/replay-batch.ps1`), and this queue runs unattended on the machine the
 * user is playing on — a second pack in parallel is exactly the situation that filled 32 GB on
 * 2026-08-08.
 *
 * The Kotlin binary is the only thing that may cut crops or read a board (docs/recordings.md, "Do
 * not rebuild the board geometry in Python") — this file never touches pixels, it spawns and
 * records. A failure is written down with its REASON and surfaced on the transfers page: silent
 * fallback is the defect, not the failure.
 */
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { appendFile, mkdir, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { checkName, dataDir } from "@/lib/data";
import { inboxDir, targetDir } from "@/lib/ingest";

export type JobState = "queued" | "running" | "done" | "failed" | "skipped";
export type JobKind = "pack" | "label" | "export" | "propose";
export type PackResult = {
  output: string;
  acceptedFrames: number;
  acceptedCrops: number;
  quarantineFrames: number;
  quarantineCrops: number;
  occludedProposalFrames: number;
  occludedProposalCrops: number;
};
export type Job = {
  name: string;
  kind?: JobKind;
  state: JobState;
  /** Why a job was skipped or failed, in the words the user needs to act on. */
  reason?: string;
  command?: string;
  log?: string;
  queuedAt: string;
  startedAt?: string;
  finishedAt?: string;
  code?: number;
  /** Present only after the fail-closed pack verification has succeeded. */
  pack?: PackResult;
  /** Candidate written by a manual replay label job, relative to the UI's real-game name. */
  candidate?: string;
};

type Queue = { jobs: Map<string, Job>; running: Promise<void> };

/**
 * Survives the dev server's module reloads — a queue that resets on every hot reload would start a
 * second pack for a session the first one is still building.
 */
const queue: Queue = ((globalThis as { __chesslabJobs?: Queue }).__chesslabJobs ??= {
  jobs: new Map(),
  running: Promise.resolve(),
});

export function jobsDir(): string {
  return path.join(inboxDir(), "jobs");
}

function repoDir(): string {
  return process.env.CHESSLAB_REPO_DIR ?? path.dirname(dataDir());
}

/**
 * The installed distribution, not Gradle: `scripts/replay-batch.ps1` builds it once and runs the
 * binary directly, and a job queue must not depend on a Gradle daemon that may be busy with a
 * build the user started.
 */
export function desktopBinary(): string {
  if (process.env.CHESSLAB_DESKTOP_BIN) return process.env.CHESSLAB_DESKTOP_BIN;
  const bin = process.platform === "win32" ? "desktop.bat" : "desktop";
  return path.join(repoDir(), "android", "desktop", "build", "install", "desktop", "bin", bin);
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

const TRAINING_LABELS = new Set([
  "empty",
  "wP", "wN", "wB", "wR", "wQ", "wK",
  "bP", "bN", "bB", "bR", "bQ", "bK",
  "occluded",
]);
const FEN_LABELS = new Set([...TRAINING_LABELS].filter((label) => label !== "occluded"));
const PACK_SIDE = 80;

function object(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${where} is not a JSON object`);
  return value as Record<string, unknown>;
}

function count(row: Record<string, unknown>, key: string, where: string): number {
  const value = row[key];
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${where}.${key} is not a non-negative integer`);
  return value as number;
}

async function manifestRows(file: string): Promise<Record<string, unknown>[]> {
  const text = await readFile(file, "utf8");
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line, index) => object(JSON.parse(line) as unknown, `${file}:${index + 1}`));
}

async function verifySink(
  out: string,
  directory: string,
  expectedCrops: number,
  expectedFrames: number,
  review: "accepted" | "quarantine" | "occluded-proposal",
): Promise<void> {
  const dir = path.join(out, directory);
  const rows = await manifestRows(path.join(dir, "manifest.jsonl"));
  if (rows.length !== expectedCrops) throw new Error(`${directory}/manifest.jsonl has ${rows.length} rows, expected ${expectedCrops}`);

  const frames = new Set<string>();
  for (const [index, row] of rows.entries()) {
    const where = `${directory}/manifest.jsonl:${index + 1}`;
    if (typeof row.frame !== "string") throw new Error(`${where} has no frame`);
    frames.add(row.frame);
    if (review === "accepted") {
      if (typeof row.label !== "string" || !FEN_LABELS.has(row.label)) throw new Error(`${where} contains invalid training label`);
      if ("review_status" in row || "proposed_label" in row) throw new Error(`${where} contains review data in accepted`);
    } else {
      if (row.label !== "unreviewed" || row.review_status !== "quarantine") throw new Error(`${where} is not quarantined`);
      if (typeof row.proposed_label !== "string" || !TRAINING_LABELS.has(row.proposed_label)) {
        throw new Error(`${where} contains invalid proposed_label`);
      }
      if (review === "occluded-proposal" && row.proposed_label !== "occluded") {
        throw new Error(`${where} is not an occluded proposal`);
      }
    }
  }
  if (frames.size !== expectedFrames) throw new Error(`${directory} has ${frames.size} frames, expected ${expectedFrames}`);

  const meta = object(JSON.parse(await readFile(path.join(dir, "packed_meta.json"), "utf8")) as unknown, `${directory}/packed_meta.json`);
  if (count(meta, "n", `${directory}/packed_meta.json`) !== expectedCrops) throw new Error(`${directory}/packed_meta.json count disagrees with summary`);
  const height = count(meta, "h", `${directory}/packed_meta.json`);
  const width = count(meta, "w", `${directory}/packed_meta.json`);
  if (height !== PACK_SIDE || width !== PACK_SIDE) throw new Error(`${directory} is ${width}x${height}, expected ${PACK_SIDE}x${PACK_SIDE}`);
  const image = await stat(path.join(dir, "packed_images.u8"));
  if (image.size !== expectedCrops * height * width * 3) throw new Error(`${directory}/packed_images.u8 has an unsafe size`);
}

/** A zero exit code is not enough: reject legacy or partially written packs fail-closed. */
export async function verifyPack(out: string): Promise<PackResult> {
  const summary = object(JSON.parse(await readFile(path.join(out, "summary.json"), "utf8")) as unknown, "summary.json");
  if (summary.model !== "real14-80") throw new Error(`summary model is ${String(summary.model)}, expected real14-80`);
  const result: PackResult = {
    output: out,
    acceptedFrames: count(summary, "accepted_frames", "summary.json"),
    acceptedCrops: count(summary, "accepted_crops", "summary.json"),
    quarantineFrames: count(summary, "quarantine_frames", "summary.json"),
    quarantineCrops: count(summary, "quarantine_crops", "summary.json"),
    occludedProposalFrames: count(summary, "occluded_proposal_frames", "summary.json"),
    occludedProposalCrops: count(summary, "occluded_proposal_crops", "summary.json"),
  };
  await verifySink(out, "accepted", result.acceptedCrops, result.acceptedFrames, "accepted");
  await verifySink(out, "quarantine", result.quarantineCrops, result.quarantineFrames, "quarantine");
  await verifySink(
    out,
    "occluded-proposals",
    result.occludedProposalCrops,
    result.occludedProposalFrames,
    "occluded-proposal",
  );
  return result;
}

/**
 * The two inputs of a pack: the recording and the game it was played in.
 *
 * The link is `StoredGame.sessionId`, which the phone writes into the game record — matching by
 * timestamp would be a guess, and a pack built against the wrong game labels every crop wrongly.
 */
export async function packInputs(name: string): Promise<{ video: string; game: string } | { reason: string }> {
  const recording = await videoInput(name);
  if ("reason" in recording) return recording;
  const { video, sessionId } = recording;
  const files = targetDir(checkName(name, "transfer name"));
  
  let games: string[] = [];
  try {
    games = (await readdir(path.join(files, "games"))).filter((f) => f.endsWith(".json"));
  } catch {
    return { reason: "no games/ in the transfer — nothing states what was played" };
  }
  for (const file of games.sort()) {
    const full = path.join(files, "games", file);
    const text = await readFile(full, "utf8").catch(() => "");
    if (text.includes(`"sessionId":"${sessionId}"`) || text.includes(`"sessionId": "${sessionId}"`)) return { video, game: full };
  }
  return { reason: `no game record names session ${sessionId} — the game was not finished on the phone` };
}

/** The newest complete QHD recording in one transferred bundle, with no game requirement. */
export async function videoInput(name: string): Promise<{ video: string; sessionId: string } | { reason: string }> {
  const files = targetDir(checkName(name, "transfer name"));
  const sessionsRoot = path.join(files, "sessions");
  let sessions: string[] = [];
  try {
    sessions = (await readdir(sessionsRoot, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return { reason: "no sessions/ in the transfer" };
  }
  const sessionId = sessions.sort().at(-1);
  if (!sessionId) return { reason: "no session directory" };
  const video = path.join(sessionsRoot, sessionId, "video.mp4");
  if (!(await exists(video))) return { reason: `no video.mp4 in sessions/${sessionId} — recording ran without the QHD bundle` };
  return { video, sessionId };
}

/**
 * The queue's last line of defence: a run that throws is a FAILED job, not a silent one.
 *
 * The chain used to be `.catch(() => undefined)`, which is why a synchronous `spawn` throw left the
 * job at "running" forever — the one state a user cannot tell from "still working".
 */
async function guard(job: Job, run: () => Promise<void>): Promise<void> {
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

async function record(job: Job): Promise<void> {
  queue.jobs.set(job.name, job);
  await mkdir(jobsDir(), { recursive: true });
  await appendFile(path.join(inboxDir(), "jobs.jsonl"), JSON.stringify(job) + "\n", "utf8");
}

/**
 * Queue the pack for a landed transfer. Returns immediately — the caller is an upload that must
 * not wait for a job measured in minutes.
 */
export async function enqueuePack(name: string): Promise<Job> {
  const known = queue.jobs.get(name);
  if (known && (known.state === "queued" || known.state === "running")) return known;
  const job: Job = { name, kind: "pack", state: "queued", queuedAt: new Date().toISOString() };
  queue.jobs.set(name, job);
  queue.running = queue.running.then(() => guard(job, () => runPack(job)));
  return job;
}

/** Queue the manual tracker proposal used by the UI when no phone game record exists. */
export async function enqueueLabel(name: string, lens?: boolean): Promise<Job> {
  checkName(name, "transfer name");
  const known = queue.jobs.get(name);
  if (known && (known.state === "queued" || known.state === "running")) return known;
  const job: Job = { name, kind: "label", state: "queued", queuedAt: new Date().toISOString() };
  queue.jobs.set(name, job);
  queue.running = queue.running.then(() => guard(job, () => runLabel(job, lens)));  // lens: see lensFor
  return job;
}

/**
 * The UI fallback is always visually reviewable: fit and remove this recording's barrel first.
 *
 * [lens] is a decision, not a flag to flip casually. WITH it the verb refuses a label whose optics
 * could not be established (specs/52: lens-corrected inference against a distorted corpus took
 * 003957 from 67 plies to 15) — right for the rig camera. The PHONE camera corrects itself: its
 * grid fit is refused every time, k1 ~ 0, measured on four videos on 2026-08-10 (TODO.md), so
 * fail-closed makes the step impossible for exactly the recordings the LAN transfer delivers.
 * The UI therefore asks with the refusal in hand instead of choosing for the user.
 */
export function labelArgs(video: string, name: string, lens = true): string[] {
  const args = ["replay", video, "label", `name=${checkName(name, "transfer name")}`, "model=real14-80"];
  return lens ? [args[0], args[1], args[2], "lens", ...args.slice(3)] : args;
}

/**
 * The pack's command line, with the one argument that carries IDENTITY.
 *
 * `id=` is not decoration: the pack keys every manifest row with it, and `corrections.jsonl` dedups
 * on `(session_id, frame, square)` with last line winning. The verb's default is the video's stem,
 * which was unique while videos came off a camera roll — every LAN-transferred recording is
 * `files/sessions/<id>/video.mp4`, so without this all of them would share the id "video" and one
 * human's verdict would silently rule on another recording's crop.
 */
export function packArgs(video: string, game: string, out: string, id: string): string[] {
  return ["training-video-pack", video, game, out, `id=${checkName(id, "transfer name")}`];
}

function desktopWorkDir(): string {
  return path.join(repoDir(), "android", "desktop");
}

/**
 * Windows quoting for one argument of a `cmd /s /c "..."` line.
 *
 * `windowsVerbatimArguments` hands the string to CreateProcess untouched, so the quoting is ours to
 * get right — and these are paths under a directory a user may rename to one with a space in it.
 */
const quoteArg = (value: string): string => (/[\s"^&|<>]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value);

/**
 * Spawn a tool, including a Windows `.bat`.
 *
 * Node has REFUSED `spawn("x.bat")` since 18.20 / 20.12 (the CVE-2024-27980 fix): it throws EINVAL
 * **synchronously**, which inside a Promise executor rejects the promise instead of firing the
 * `error` event the code was watching for — and the queue's `.catch()` then dropped the job at
 * "running", with no exit line and no reason. Measured 2026-08-13 on Node 26: not one pack or label
 * job had ever started, while every one of them looked like it was working.
 */
function spawnTool(binary: string, args: string[], cwd: string) {
  if (process.platform !== "win32" || !/\.(bat|cmd)$/i.test(binary)) {
    return spawn(binary, args, { cwd, windowsHide: true });
  }
  const line = [quoteArg(binary), ...args.map(quoteArg)].join(" ");
  return spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `"${line}"`], {
    cwd,
    windowsHide: true,
    windowsVerbatimArguments: true,
  });
}

async function runDesktop(binary: string, args: string[], running: Job, log: string): Promise<number> {
  return new Promise<number>((resolve) => {
    const sink = createWriteStream(log, { flags: "a" });
    sink.write(`$ ${running.command}\n`);
    let child;
    try {
      child = spawnTool(binary, args, desktopWorkDir());
    } catch (error) {
      // A job that cannot even start must say so — this is the exact failure that hid all day.
      sink.end(`\nspawn threw: ${error instanceof Error ? error.message : String(error)}\n`);
      resolve(-1);
      return;
    }
    child.stdout.pipe(sink, { end: false });
    child.stderr.pipe(sink, { end: false });
    child.on("error", (error) => {
      sink.end(`\nspawn failed: ${error.message}\n`);
      resolve(-1);
    });
    child.on("close", (value) => {
      sink.end(`\nexit ${value}\n`);
      resolve(value ?? -1);
    });
  });
}

async function runPack(job: Job): Promise<void> {
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

  await record({
    ...running,
    state: code === 0 ? "done" : "failed",
    code,
    pack,
    reason: code === 0 ? undefined : `training-video-pack exited ${code} — see ${log}`,
    finishedAt: new Date().toISOString(),
  });
}

/**
 * The most informative line a failed run printed.
 *
 * FFmpeg narrates its container probe over dozens of lines, so the LAST line is usually metadata
 * and the useful one is an exception or a refusal a few lines above it.
 */
/**
 * Only the CURRENT run's lines.
 *
 * A job appends to `<name>.<kind>.log`, which is right — the history of what a recording was put
 * through is worth keeping. But reading the whole file for "what went wrong" finds the previous
 * run's exception: on 2026-08-13 the card blamed a lens refusal for a run that never asked for a
 * lens fit, while the real refusal (a quad spread of 23 px — the board moved) sat unread below it.
 * Each run starts with its own `$ <command>` line, and that line is the boundary.
 */
export function lastRunOf(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const start = lines.map((l, i) => (l.startsWith("$ ") ? i : -1)).filter((i) => i >= 0).at(-1);
  return start === undefined ? lines : lines.slice(start);
}

async function lastWords(log: string): Promise<string> {
  const text = await readFile(log, "utf8").catch(() => "");
  const lines = lastRunOf(text).map((l) => l.trim()).filter(Boolean);
  const meaty = lines.filter(
    (l) => !/^(Metadata|creation_time|handler_name|vendor_id|major_brand|minor_version|compatible_brands|com\.android|Side data|displaymatrix|Stream #|Duration:|Input #|\[mov|encoder|at [a-z]|frame \d)/i.test(l),
  );
  const refusal = meaty.findLast((l) => /exception|refus|no accepted|error|failed|not found/i.test(l));
  return (refusal ?? meaty.findLast((l) => !/^exit \d/.test(l)) ?? "the tool printed nothing").slice(0, 240);
}

/**
 * Whether to make the label fail-closed on optics, decided by the CAMERA rather than by a click.
 *
 * A video inside `files/sessions/` came off the phone, and the phone corrects its own barrel: the
 * grid fit refuses it every single time (k1 ~ 0, four videos on 2026-08-10 and five more on
 * 2026-08-13). Asking a human to answer a refusal that is guaranteed for this source is busywork —
 * "warum muss ich das manuell klicken" (the user, 2026-08-13). Everything else keeps specs/52's
 * fail-closed rule, where an unfitted lens really does mean an uncorrected preview.
 */
export function lensFor(video: string): boolean {
  return !/[\\/]files[\\/]sessions[\\/]/.test(video);
}


async function runLabel(job: Job, lens?: boolean): Promise<void> {
  const recording = await videoInput(job.name);
  if ("reason" in recording) {
    await record({ ...job, state: "skipped", reason: recording.reason, finishedAt: new Date().toISOString() });
    return;
  }
  const candidate = path.join(path.dirname(targetDir(job.name)), "candidate.json");
  if (await exists(candidate)) {
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
  const args = labelArgs(recording.video, job.name, lens ?? lensFor(recording.video));
  const log = path.join(jobsDir(), `${job.name}.label.log`);
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
  const madeCandidate = code === 0 && (await exists(candidate));
  await record({
    ...running,
    state: madeCandidate ? "done" : "failed",
    code,
    candidate: madeCandidate ? job.name : undefined,
    // The tool's own last words, not just a path: "see the log" is what a user reads instead of
    // the sentence that would have told them what to do.
    reason: madeCandidate ? undefined : `${await lastWords(log)} (exit ${code}, ${log})`,
    finishedAt: new Date().toISOString(),
  });
}

/**
 * The two chesslab steps of the chain, as jobs: `export-session` and `propose-occluded`.
 *
 * Spawned, never imported — the platform's rule is that the file formats are the only bridge to the
 * Python side (`README.md`), and a CLI in its own process keeps that true while still giving the UI
 * one button instead of a paragraph of instructions. They run in the SAME single-slot queue as the
 * packs, because they are the same machine's CPU.
 */
export async function enqueueChain(
  name: string,
  step: "export" | "propose",
): Promise<Job> {
  checkName(name, "game name");
  const known = queue.jobs.get(name);
  if (known && (known.state === "queued" || known.state === "running")) return known;
  const job: Job = { name, kind: step, state: "queued", queuedAt: new Date().toISOString() };
  queue.jobs.set(name, job);
  queue.running = queue.running.then(() => guard(job, () => runChesslab(job, step)));
  return job;
}

/** `uv` by default, because that is what `README.md` tells a human to type. */
function uvBinary(): string {
  return process.env.CHESSLAB_UV ?? "uv";
}

async function runChesslab(
  job: Job,
  step: "export" | "propose",
): Promise<void> {
  const verb = step === "export" ? "export-session" : "propose-occluded";
  const binary = uvBinary();
  const args = ["run", "chesslab", "realgames", verb, job.name];
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

  const code = await new Promise<number>((resolve) => {
    const sink = createWriteStream(log, { flags: "a" });
    sink.write(`$ ${running.command}
`);
    const child = spawnTool(binary, args, repoDir());
    child.stdout.pipe(sink, { end: false });
    child.stderr.pipe(sink, { end: false });
    child.on("error", (error) => {
      sink.end(`
spawn failed: ${error.message}
`);
      resolve(-1);
    });
    child.on("close", (value) => {
      sink.end(`
exit ${value}
`);
      resolve(value ?? -1);
    });
  });

  await record({
    ...running,
    state: code === 0 ? "done" : "failed",
    code,
    reason:
      code === 0
        ? undefined
        : code === -1
          ? `could not start "${binary}" — is uv on PATH? Set CHESSLAB_UV to its full path.`
          : `chesslab realgames ${verb} exited ${code} — see ${log}`,
    finishedAt: new Date().toISOString(),
  });
}

/** In-memory state first, the ledger behind it — a job from before a restart is still a fact. */
export async function jobs(limit = 25): Promise<Job[]> {
  const seen = new Map<string, Job>();
  try {
    const text = await readFile(path.join(inboxDir(), "jobs.jsonl"), "utf8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      const row = JSON.parse(line) as Job;
      seen.set(row.name, row);
    }
  } catch {
    /* no job has ever run */
  }
  // A ledger row that says "running" but is not in THIS process's queue belongs to a previous one:
  // the queue is the only thing that runs jobs, so the server was restarted (or killed) underneath
  // it. Reporting that as still running is the lie this whole page exists to avoid.
  for (const [name, row] of seen) {
    if (!queue.jobs.has(name) && (row.state === "running" || row.state === "queued")) {
      seen.set(name, {
        ...row,
        state: "failed",
        reason: "the server restarted while this job was running — press the step again",
        finishedAt: row.finishedAt ?? row.startedAt ?? row.queuedAt,
      });
    }
  }
  for (const [name, job] of queue.jobs) seen.set(name, job);
  return [...seen.values()].sort((a, b) => (a.queuedAt < b.queuedAt ? 1 : -1)).slice(0, limit);
}
