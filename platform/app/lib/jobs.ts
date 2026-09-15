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
import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream } from "node:fs";
import { appendFile, mkdir, open, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { alive, releaseHeavyLock, stampHeavyLockChild } from "@/lib/heavy-lock";
import { checkName, dataDir, gameDir } from "@/lib/data";
import { inboxDir, targetDir } from "@/lib/ingest";
import { matteCensus, matteTarget } from "@/lib/matte";

type JobState = "queued" | "running" | "done" | "failed" | "skipped" | "stopped";
type JobKind = "pack" | "phone-record" | "label" | "export" | "adopt-dirty" | "settle-scan" | "matte" | "temporal" | "model-read";
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
  /** Label runs only: whether the barrel was removed. `false` crops differ from corrected ones
   * permanently (specs/52), so the record has to carry it — see `lensFor`. */
  lens?: boolean;
  /** The server process that wrote the row. Absent on every row written before this key existed. */
  pid?: number;
  /** The spawned tool's own pid: it outlives a killed server, and today's exports did (2026-08-15). */
  childPid?: number;
  /** Wall clock before which the picker must not start this step — the boundary commit's undo
   *  window (§4.1.1). Additive, declared in the §9.1 register; nothing in Python reads this file. */
  notBefore?: string;
  /** Weitere Aufnahmen, die IM SELBEN Prozess laufen. Nur beim Matten: SAM zu laden kostet
   *  7-9 min und die Arbeit danach Sekunden je Frame (gemessen 2026-09-15). Der Log nennt jede
   *  Aufnahme einzeln (`alpha_worker_all`), Stopp killt wie sonst auch den ganzen Prozess. */
  also?: string[];
};

/** The process in the slot right now — held so Stopp can kill it, not just decline the next. */
type Live = { name: string; child: ChildProcess };
type Queue = { jobs: Map<string, Job>; running: Promise<void>; live: Live | null; stopped: Set<string> };

/**
 * Survives the dev server's module reloads — a queue that resets on every hot reload would start a
 * second pack for a session the first one is still building.
 */
const queue: Queue = ((globalThis as { __chesslabJobs?: Queue }).__chesslabJobs ??= {
  jobs: new Map(),
  running: Promise.resolve(),
  live: null,
  stopped: new Set(),
});
// An object pinned by older code lacks the fields added since (see `drain`).
queue.live ??= null;
queue.stopped ??= new Set();

export function jobsDir(): string {
  return path.join(inboxDir(), "jobs");
}

/** Is the one slot taken? Every press asks first — nothing ever widens the queue (§5.5). */
export function busy(): boolean {
  return runningJob() !== null;
}

/** What the slot is chewing on, so a strip can name it instead of saying "etwas läuft". */
export function runningJob(): Job | null {
  for (const job of queue.jobs.values()) {
    if (job.state === "queued" || job.state === "running") return job;
  }
  return null;
}

/**
 * Resolves when everything queued right now has finished.
 *
 * A drain hangs off this: the next recording of the backlog starts the moment the last one is
 * done, and the heavy lock is released at the same moment.
 */
export function whenIdle(): Promise<void> {
  return queue.running.then(() => undefined);
}

export function repoDir(): string {
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
  if (summary.model !== DESKTOP_MODEL) throw new Error(`summary model is ${String(summary.model)}, expected ${DESKTOP_MODEL}`);
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
    /* kein sessions/ — die gespiegelte Kopie kann trotzdem daliegen */
  }
  const sessionId = sessions.sort().at(-1);
  if (sessionId) {
    const video = path.join(sessionsRoot, sessionId, "video.mp4");
    if (await exists(video)) return { video, sessionId };
  }
  // Derselbe Rueckfall wie `chain.ts`: die gespiegelte Kopie liegt neben dem Bundle. Ohne ihn bot
  // die Chain den Knopf an und die Reparatur verweigerte ihn — eine dauerhafte Sperre.
  const mirrored = path.join(path.dirname(files), "video.mp4");
  if (await exists(mirrored)) return { video: mirrored, sessionId: sessionId ?? name };
  return { reason: sessionId
    ? `no video.mp4 in sessions/${sessionId} — recording ran without the QHD bundle`
    : "no sessions/ and no mirrored video.mp4 in the transfer" };
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

/** The ledger line alone — a row that names no slot (`holdExport`) never enters the queue. */
async function appendRow(job: Job): Promise<void> {
  await mkdir(jobsDir(), { recursive: true });
  // `pid` is what lets a SECOND server tell "a job died with its process" from "another process is
  // running this right now" — without it every foreign row read as a corpse (see `restartedRows`).
  await appendFile(path.join(inboxDir(), "jobs.jsonl"), JSON.stringify({ ...job, pid: process.pid }) + "\n", "utf8");
}

async function record(job: Job): Promise<void> {
  queue.jobs.set(job.name, job);
  await appendRow(job);
}

/**
 * The heavy lock belongs to the SLOT, not to one job.
 *
 * `startStep` takes it when a step is enqueued and it is dropped here, once the queue holds nothing
 * queued or running any more — releasing per job would unlock the machine while the next job of the
 * same chain is still working, which is the state the lock exists to make impossible.
 */
async function releaseWhenIdle(): Promise<void> {
  if (runningJob()) return;
  await releaseHeavyLock().catch(() => undefined);
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
  // lens: see lensFor
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
/** The one model name the chain speaks — the bundled default; `real14-80` left the APK on 292838ec. */
export const DESKTOP_MODEL = "p4a-80-clahe";

export function labelArgs(video: string, name: string, lens = true): string[] {
  const args = ["replay", video, "label", `name=${checkName(name, "transfer name")}`, `model=${DESKTOP_MODEL}`];
  return lens ? [args[0], args[1], args[2], "lens", ...args.slice(3)] : args;
}

/**
 * The phone's own record instead of the replay: seconds, and the whole bundle is the argument.
 *
 * No `model=`, no `force=1` — the verb defaults to the bundled model like `labelArgs`, and an existing
 * candidate is a refusal a human answers, never something a press overwrites.
 */
export function phoneArgs(recordingDir: string): string[] {
  return ["phone-candidate", recordingDir];
}

/** The verb's one refusal line, LAST wins — a retry appends to the same log. */
export function refusalOf(log: string): string | null {
  const line = log.split(/\r?\n/).findLast((l) => l.startsWith("refused: "));
  return line === undefined ? null : line.slice("refused: ".length);
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
  const args = ["training-video-pack", video, game, out, `id=${checkName(id, "transfer name")}`];
  // The recording's own knobs, for the PACK only. `alignEvery` is a crop-geometry knob — it decides
  // how often the quad is re-measured, i.e. how straight the training cells are cut — and the
  // desktop default of 3 cuts them at a cadence the phone never recorded at. Tracking does not get
  // this file: which moves a replay finds is not supposed to depend on a recording's settings.
  const settings = path.join(path.dirname(video), "settings.json");
  return [...args, `config=${settings}`];
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
export function spawnTool(binary: string, args: string[], cwd: string) {
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

/**
 * Kill the whole tree, not our child: the chain is `uv` → `chesslab.exe` → python, so a `.kill()`
 * on the shim leaves the worker on the GPU — measured 2026-08-19, three SAM 3 processes at once.
 */
export function killTree(pid: number): Promise<void> {
  if (process.platform !== "win32") {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* already gone */
    }
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
    killer.on("error", () => resolve());
    killer.on("close", () => resolve());
  });
}

/**
 * Stopp: end what is in the slot NOW. The user watched an 11-second-per-frame job keep going after
 * pressing stop (2026-08-19) — "alles stehen und liegen lassen". `alpha_worker` appends to
 * `matte.jsonl` and flushes per frame, and export/label rewrite their output from scratch, so the
 * kill costs the frame in flight and nothing else.
 */
export async function stopRunning(): Promise<{ stopped: string } | { error: string }> {
  const live = queue.live;
  if (!live?.child.pid) return { error: "kein Prozess läuft" };
  queue.stopped.add(live.name);
  await killTree(live.child.pid);
  return { stopped: live.name };
}

/** The row a killed job writes: `stopped`, so it reads as a decision and stays retryable. */
function endState(name: string, code: number): { state: JobState; stopped: boolean } {
  const stopped = queue.stopped.delete(name);
  return { state: stopped ? "stopped" : code === 0 ? "done" : "failed", stopped };
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
    if (child.pid !== undefined) {
      running.childPid = child.pid;
      queue.live = { name: running.name, child };
      void record(running);
      // The lock must name the JOB, not the server: a killed job then frees the slot by dying.
      void stampHeavyLockChild(child.pid).catch(() => undefined);
    }
    child.stdout.pipe(sink, { end: false });
    child.stderr.pipe(sink, { end: false });
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

/** Only the CURRENT run's lines — on 2026-08-13 the card blamed a previous run's exception
 * because the whole file was read. Each run starts with `$ <command>`, the boundary. */
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
  const madeCandidate = code === 0 && (await exists(candidate));
  const end = endState(job.name, madeCandidate ? 0 : 1);
  await record({
    ...running,
    state: end.state,
    code,
    candidate: madeCandidate ? job.name : undefined,
    // The tool's own last words, not just a path: "see the log" is what a user reads instead of
    // the sentence that would have told them what to do. Ein GESTOPPTER Lauf hat keine — sein
    // Log bricht mitten im Satz ab, und `exit -1` daneben las sich als Werkzeugfehler.
    reason: end.stopped ? STOPPED : madeCandidate ? undefined : `${await lastWords(log)} (exit ${code}, ${log})`,
    finishedAt: new Date().toISOString(),
  });
}

/**
 * `phone-candidate` over the whole bundle: the record's plies, timed against the video.
 *
 * The verb states its own refusal on one line, so `lastWords` heuristics are not needed here —
 * a refusal is the sentence the user acts on, and everything else is an exit code.
 */
async function runPhoneRecord(job: Job): Promise<void> {
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
  return appended(["run", "chesslab", "realgames", "retime", name], running, log);
}

/**
 * Die Karten der Strittig-Lane neu rechnen, angehaengt an das Log des Schritts davor.
 *
 * Der Producer ist korpusweit und DERIVED, kostet also Sekunden und ueberschreibt sich selbst.
 * Er laeuft am Ende von `model-read`, weil der naechste Schritt `labeln` ist: dort muessen die
 * Karten liegen, sonst labelt der Mensch an den zweifelhaften Zellen vorbei. Sein Exit-Code
 * zaehlt NICHT als der des Schritts - eine fehlende Matte darf `model-read` nicht rot faerben.
 */
async function runPositionFlags(running: Job, log: string): Promise<void> {
  await appended(["run", "chesslab", "realgames", "position-flags"], running, log);
}

function appended(args: string[], running: Job, log: string): Promise<number> {
  return new Promise<number>((resolve) => {
    const sink = createWriteStream(log, { flags: "a" });
    sink.write(`$ ${uvBinary()} ${args.join(" ")}
`);
    const child = spawnTool(uvBinary(), args, repoDir());
    if (child.pid !== undefined) {
      running.childPid = child.pid;
      queue.live = { name: running.name, child };
      void record(running);
    }
    child.stdout?.pipe(sink, { end: false });
    child.stderr?.pipe(sink, { end: false });
    child.on("error", (error) => {
      sink.end(`
spawn failed: ${error.message}
`);
      resolve(-1);
    });
    child.on("close", (exit) => {
      if (queue.live?.child === child) queue.live = null;
      sink.end();
      resolve(exit ?? 1);
    });
  });
}

/**
 * The chesslab steps of the chain, as jobs: `export-session`, `alpha-worker`, `model-read`.
 *
 * Spawned, never imported — the platform's rule is that the file formats are the only bridge to the
 * Python side (`README.md`), and a CLI in its own process keeps that true while still giving the UI
 * one button instead of a paragraph of instructions. They run in the SAME single-slot queue as the
 * packs, because they are the same machine's CPU.
 */
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

/**
 * The boundary commit's own export row: enqueued, but not before `notBefore` (§4.1.1).
 *
 * It is a LEDGER row and no slot: the picker is what starts it once the hold expires, so the
 * export still passes the pause, the heavy lock and the 409 step check a timer here would jump.
 * `skipped` is the honest state for a row that has not run — `queued` would read as a corpse to
 * `restarted()` and would make the recording look busy on every card.
 */
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

/**
 * `z` inside the window: take the held export back. False = there is nothing to take back, either
 * because the hold expired or because the export has since started — then the undo costs a
 * re-export and the UI has to say so instead of claiming nothing happened.
 */
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

const STOPPED = "gestoppt — der Prozess wurde beendet; ein neuer Druck fängt wieder an";

const TAIL_BYTES = 64 * 1024;

/** A replay writes megabytes into one log; `/game/<name>` shows its last words, not the file. */
export async function jobLogTail(job: Job, lines = 30): Promise<string[]> {
  if (!job.log) return [];
  const info = await stat(job.log).catch(() => null);
  if (!info || info.size === 0) return [];
  const handle = await open(job.log, "r");
  try {
    const length = Math.min(TAIL_BYTES, info.size);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, info.size - length);
    return buffer.toString("utf8").split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean).slice(-lines);
  } finally {
    await handle.close();
  }
}

/** Every ledger row of ONE recording, newest first — the job log of `/game/<name>` (§3.1). */
export async function jobHistory(name: string, limit = 20): Promise<Job[]> {
  checkName(name, "game name");
  const rows: Job[] = [];
  try {
    const text = await readFile(path.join(inboxDir(), "jobs.jsonl"), "utf8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as Job;
        if (row.name === name) rows.push(row);
      } catch {
        /* a half-written line is not a job */
      }
    }
  } catch (e) {
    // NUR "nicht da" heisst "noch nichts gelaufen". Unbedingt geschluckt rendert eine gesperrte
    // oder unlesbare `jobs.jsonl` die GESAMTE Fehlerhistorie als erfolgsfoermige Leere.
    if ((e as { code?: string })?.code !== "ENOENT") throw e;
  }
  return rows.reverse().slice(0, limit);
}

/**
 * The run dir `realgames model-read` is given, from `CHESSLAB_MODEL_READ_RUN`. No default: the
 * verb REFUSES a model that trained on the session, so which run is right is a per-session choice
 * a human makes, and a hardcoded one would mark half the corpus failed-for-good in the ledger.
 */
export function modelReadRun(): string | null {
  return process.env.CHESSLAB_MODEL_READ_RUN?.trim() || null;
}

/** `uv` by default, because that is what `README.md` tells a human to type. */
export function uvBinary(): string {
  return process.env.CHESSLAB_UV ?? "uv";
}

export type ToolRun = { code: number; stdout: string; stderr: string; command: string };

/**
 * `uv run chesslab …` with stdout handed BACK, for the short verbs a request waits on.
 *
 * The queue above answers "started" and writes a log file, which is no answer for a dry run whose
 * whole product is the line it prints. Same binary, same cwd, same `spawnTool` — deliberately NOT
 * a second way to run Python. Uninterruptible on purpose: killing a half-rewritten manifest is
 * worse than a slow request, so there is no timeout here.
 */
export async function runChesslabCapture(args: string[]): Promise<ToolRun> {
  const binary = uvBinary();
  const argv = ["run", "chesslab", ...args];
  const command = `${binary} ${argv.join(" ")}`;
  return new Promise<ToolRun>((resolve) => {
    let stdout = "";
    let stderr = "";
    const child = spawnTool(binary, argv, repoDir());
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));
    child.on("error", (error) => resolve({ code: -1, stdout, stderr: error.message, command }));
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr, command }));
  });
}

async function runChesslab(
  job: Job,
  step: "export" | "adopt-dirty" | "settle-scan" | "matte" | "temporal" | "model-read",
): Promise<void> {
  const verb = step === "export" ? "realgames export-session"
    : step === "adopt-dirty" ? "realgames adopt-dirty"
    : step === "settle-scan" ? "session settle-scan"
    : step === "matte" ? "occluders alpha-worker"
    : step === "temporal" ? "session temporal-pass" : "realgames model-read";
  const binary = uvBinary();
  // `session` verbs take the SESSION id, and a recording keeps the `rg-` the directory dropped.
  const names = [job.name, ...(job.also ?? [])];
  const args = ["run", "chesslab", ...verb.split(" "),
                ...(step === "settle-scan" ? [`rg-${job.name}`] : names)];
  const run = modelReadRun();
  if (step === "model-read" && run) args.push("--model", run);
  // The same target the overnight `--all` is given, counted against the rows already there: one
  // press costs at most those frames, not the hour a 394-frame pile would be.
  // `--reported` nimmt genau die gemeldeten Frames und ignoriert Stapel wie `--limit`: ein
  // `stale`-Frame, auf dem ein Mensch Finger gesehen hat, ist sonst unerreichbar.
  if (step === "matte") {
    // `reportedOpen`, nicht `reported`: eine Meldung auf einen Frame, den dieser Export nicht mehr
    // fuehrt, ist unerreichbar. Auf `reported` gestuetzt liefe `--reported` ins Leere und die
    // Aufnahme bekaeme ihren Stapel nie.
    const census = await matteCensus(job.name);
    if (census.reportedOpen > 0) args.push("--reported");
    else args.push("--limit", String(matteTarget()));
  }
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
    if (child.pid !== undefined) {
      running.childPid = child.pid;
      queue.live = { name: running.name, child };
      void record(running);
      // The lock must name the JOB, not the server: a killed job then frees the slot by dying.
      void stampHeavyLockChild(child.pid).catch(() => undefined);
    }
    child.stdout.pipe(sink, { end: false });
    child.stderr.pipe(sink, { end: false });
    child.on("error", (error) => {
      sink.end(`
spawn failed: ${error.message}
`);
      resolve(-1);
    });
    child.on("close", (value) => {
      if (queue.live?.child === child) queue.live = null;
      sink.end(`
exit ${value}
`);
      resolve(value ?? -1);
    });
  });

  if (step === "model-read" && code === 0) await runPositionFlags(running, log);

  const end = endState(job.name, code);
  await record({
    ...running,
    state: end.state,
    code,
    reason: end.stopped
      ? STOPPED
      : code === 0
        ? undefined
        : code === -1
          ? `could not start "${binary}" — is uv on PATH? Set CHESSLAB_UV to its full path.`
          : `chesslab ${verb} exited ${code} — see ${log}`,
    finishedAt: new Date().toISOString(),
  });
}

/** The ledger, last row per [key]. `pid` survives it — it decides whose corpse a row is. */
async function ledger(key: (row: Job) => string): Promise<Map<string, Job>> {
  const seen = new Map<string, Job>();
  try {
    const text = await readFile(path.join(inboxDir(), "jobs.jsonl"), "utf8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as Job;
        seen.set(key(row), row);
      } catch {
        /* a half-written line is not a job */
      }
    }
  } catch (e) {
    // NUR "nicht da" heisst "noch nichts gelaufen". Unbedingt geschluckt rendert eine gesperrte
    // oder unlesbare `jobs.jsonl` die GESAMTE Fehlerhistorie als erfolgsfoermige Leere.
    if ((e as { code?: string })?.code !== "ENOENT") throw e;
  }
  return seen;
}

/**
 * A ledger row that claims to be working, from a process that no longer is.
 *
 * The old rule was "not in THIS process's queue" — which turns every job of a SECOND server into a
 * corpse, and `/reparatur` then offers its start button while the first server is mid-replay. The
 * pid is the honest test; rows written before the key existed keep the old rule, since nothing else
 * can be said about them.
 */
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

/**
 * Der Job EINER Aufnahme, ohne Liste.
 *
 * `jobs(n)` schneidet vor dem Filtern: hinter genug neueren Zeilen las ein laufender Job als
 * idle, und die Seite bot ihren Knopf ein zweites Mal an.
 */
export async function jobOf(name: string): Promise<Job | null> {
  const live = queue.jobs.get(name);
  if (live) return live;
  const row = (await ledger((r) => r.name)).get(name) ?? null;
  return row === null ? null : (restarted(row) ? asFailed(row) : row);
}

/** In-memory state first, the ledger behind it — a job from before a restart is still a fact. */
export async function jobs(limit = 25): Promise<Job[]> {
  const seen = await ledger((row) => row.name);
  for (const [name, row] of seen) if (restarted(row)) seen.set(name, asFailed(row));
  for (const [name, job] of queue.jobs) seen.set(name, job);
  return [...seen.values()].sort((a, b) => (a.queuedAt < b.queuedAt ? 1 : -1)).slice(0, limit);
}

/**
 * The ledger's last row per `<name>|<kind>` — the no-retry marker, per STEP.
 *
 * Keyed per name it was not a marker at all: any later job of another kind (a `pack` after a second
 * transfer) became "the last row" and silently cleared a failed `export`, which then ran again all
 * night. A step's own history is the only thing that can answer "did THIS step fail".
 */
export async function lastByStep(): Promise<Map<string, Job>> {
  const seen = await ledger((row) => `${row.name}|${row.kind ?? "job"}`);
  for (const [key, row] of seen) if (restarted(row)) seen.set(key, asFailed(row));
  for (const job of queue.jobs.values()) seen.set(`${job.name}|${job.kind ?? "job"}`, job);
  return seen;
}
