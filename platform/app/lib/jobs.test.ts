import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, test, vi } from "vitest";
import { alive } from "@/lib/heavy-lock";
import { inboxDir, targetDir } from "@/lib/ingest";
import {
  chesslabArgs,
  DESKTOP_MODEL,
  enqueueChain,
  enqueueLabel,
  enqueuePhoneRecord,
  holdExport,
  jobHistory,
  jobLogTail,
  jobOf,
  jobs,
  jobsDir,
  killTree,
  labelArgs,
  lastByStep,
  lensFor,
  packArgs,
  packInputs,
  phoneArgs,
  positionFlagsArgs,
  refusalOf,
  releaseExportHold,
  retimeArgs,
  spawnTool,
  stopRunning,
  verifyPack,
  videoInput,
  whenIdle,
  type Job,
} from "@/lib/jobs";
import { tempDataRoot } from "@/lib/test-fixtures";

type Op = "stat" | "readFile" | "readdir" | "open";
const fail = vi.hoisted(() => ({ on: null as null | ((op: Op, file: string) => string | null) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
  const hop = (op: Op, file: string, rest: unknown[]) => {
    const code = fail.on?.(op, String(file)) ?? null;
    if (code) return Promise.reject(Object.assign(new Error(`${code}: ${file}`), { code }));
    return (real[op] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return {
    ...real,
    stat: (f: string, ...r: unknown[]) => hop("stat", f, r),
    readFile: (f: string, ...r: unknown[]) => hop("readFile", f, r),
    readdir: (f: string, ...r: unknown[]) => hop("readdir", f, r),
    open: (f: string, ...r: unknown[]) => hop("open", f, r),
  };
});

const ledger = vi.hoisted(() => {
  let done!: () => void;
  const late = new Promise<void>((r) => (done = r));
  return { failOnce: false, gated: false, late, done };
});

/** Der kurze Halt ist der zuerst abgeschickte, der lange der zweite — `holdExport(name, ms)`. */
const isEarly = (row: unknown) =>
  Date.parse(String((row as { notBefore?: string }).notBefore)) - Date.now() < 60_000;

vi.mock("@/lib/atomic", async (original) => {
  const real = await original<typeof import("@/lib/atomic")>();
  return {
    ...real,
    appendRows: async (file: string, rows: unknown[]) => {
      if (ledger.failOnce) {
        ledger.failOnce = false;
        throw Object.assign(new Error(`EMFILE: ${file}`), { code: "EMFILE" });
      }
      if (!ledger.gated) return real.appendRows(file, rows);
      // Der frueher abgeschickte Schreiber wartet auf den spaeteren; die Frist loest die Umklammerung.
      if (isEarly(rows[0])) await Promise.race([ledger.late, new Promise((r) => setTimeout(r, 300))]);
      const n = await real.appendRows(file, rows);
      if (!isEarly(rows[0])) ledger.done();
      return n;
    },
  };
});

const matte = vi.hoisted(() => ({ census: vi.fn() }));
vi.mock("@/lib/matte", async (original) => ({
  ...(await original<typeof import("@/lib/matte")>()),
  matteCensus: matte.census,
  matteTarget: () => 80,
}));

const released = vi.hoisted(() => ({ at: [] as (string | null)[] }));
vi.mock("@/lib/heavy-lock", async (original) => {
  const real = await original<typeof import("@/lib/heavy-lock")>();
  return { ...real, releaseHeavyLock: async () => {
    // Erst HIER laden: im Fabrikschritt haengt der Ringschluss jobs -> heavy-lock -> jobs.
    const { runningJob } = await import("@/lib/jobs");
    released.at.push(runningJob()?.name ?? null);
    await real.releaseHeavyLock();
  } };
});

const NO_UV = "chesslab-no-such-binary-2026-09-21.exe";
const win = process.platform === "win32";

let data: string;
let files: string;

beforeEach(async () => {
  fail.on = null;
  ledger.gated = false;
  released.at.length = 0;
  process.env.CHESSLAB_UV = NO_UV;
  for (const key of ["CHESSLAB_DESKTOP_BIN", "CHESSLAB_REPO_DIR", "CHESSLAB_MODEL_READ_RUN"]) delete process.env[key];
  data = await tempDataRoot("jobs");
  files = path.join(data, "recordings", "2026-08-13-19-34-23", "files");
  await mkdir(path.join(files, "sessions", "20260813-193423"), { recursive: true });
  await mkdir(path.join(files, "games"), { recursive: true });
});

const game = (id: string, sessionId: string | null) =>
  writeFile(
    path.join(files, "games", `${id}.json`),
    JSON.stringify({ id, sessionId, moves: [] }),
  );

/** Ein Werkzeug-Ersatz, der die Argumente ignoriert: `exit 0` oder ein Prozess, der nicht endet. */
async function shim(name: string, forever: boolean): Promise<string> {
  const body = forever ? `"${process.execPath}" -e "setInterval(()=>{},1000)"` : "";
  const file = path.join(data, win ? `${name}.bat` : name);
  await writeFile(file, win ? `@echo off\n${body}\n` : `#!/bin/sh\n${body || ":"}\n`, "utf8");
  if (!win) await chmod(file, 0o755);
  return file;
}

/** Aufnahme mit Video und `exit 0`-Label-Werkzeug; mit `candidate` liegt schon eine bestaetigte Datei da. */
async function labelable(name: string, candidate = false): Promise<string> {
  process.env.CHESSLAB_DESKTOP_BIN = await shim("desktop", false);
  // `desktopWorkDir()` haengt am Repo-Verzeichnis; ohne es scheitert der Spawn am fehlenden cwd.
  await mkdir(path.join(data, "android", "desktop"), { recursive: true });
  process.env.CHESSLAB_REPO_DIR = data;
  const session = path.join(data, "recordings", name, "files", "sessions", "20260923-100000");
  await mkdir(session, { recursive: true });
  await writeFile(path.join(session, "video.mp4"), "x");
  const file = path.join(data, "recordings", name, "candidate.json");
  if (candidate) await writeFile(file, '{"confirmed": true}\n', "utf8");
  return file;
}

describe("packInputs", () => {
  it("finds a recording for manual labeling without requiring a game", async () => {
    const video = path.join(files, "sessions", "20260813-193423", "video.mp4");
    await writeFile(video, "x");
    expect(await videoInput("2026-08-13-19-34-23")).toEqual({ video, sessionId: "20260813-193423" });
  });

  it("pairs the recording with the game that names its session", async () => {
    await writeFile(path.join(files, "sessions", "20260813-193423", "video.mp4"), "x");
    await game("2026-08-13_1200", "20260812-120000");
    await game("2026-08-13_1941", "20260813-193423");

    const inputs = await packInputs("2026-08-13-19-34-23");
    expect(inputs).toEqual({
      video: path.join(files, "sessions", "20260813-193423", "video.mp4"),
      game: path.join(files, "games", "2026-08-13_1941.json"),
    });
  });

  it("states why it cannot build a pack when no game names the session", async () => {
    await writeFile(path.join(files, "sessions", "20260813-193423", "video.mp4"), "x");
    await game("2026-08-13_1200", "20260812-120000");

    expect(await packInputs("2026-08-13-19-34-23")).toEqual({
      reason: "no game record names session 20260813-193423 — the game was not finished on the phone",
    });
  });

  it("states why it cannot build a pack from a recording without the QHD bundle", async () => {
    await game("2026-08-13_1941", "20260813-193423");
    expect(await packInputs("2026-08-13-19-34-23")).toMatchObject({
      reason: expect.stringContaining("no video.mp4"),
    });
  });

  test("ein EACCES auf games/ ist nicht „kein Spielstand im Transfer\"", async () => {
    const session = path.join(targetDir("g"), "sessions", "20260923-100000");
    await mkdir(session, { recursive: true });
    await writeFile(path.join(session, "video.mp4"), "x");
    fail.on = (op, file) => (op === "readdir" && file === path.join(targetDir("g"), "games") ? "EACCES" : null);
    await expect(packInputs("g")).rejects.toThrow(/EACCES/);
  });
});

describe("labelArgs", () => {
  it("fits barrel correction before writing UI review frames", () => {
    expect(labelArgs("C:/recordings/video.mp4", "2026-08-13-12-10-55")).toEqual([
      "replay",
      "C:/recordings/video.mp4",
      "label",
      "lens",
      "name=2026-08-13-12-10-55",
      `model=${DESKTOP_MODEL}`,
    ]);
  });
});

describe("phoneArgs", () => {
  it("names the verb and the recording dir", () => {
    expect(phoneArgs(path.join("C:/data/recordings", "2026-08-30-16-20-19"))).toEqual([
      "phone-candidate",
      path.join("C:/data/recordings", "2026-08-30-16-20-19"),
    ]);
  });
});

describe("refusalOf", () => {
  it("takes the last refused line and ignores everything else", () => {
    const log = [
      "$ desktop.bat phone-candidate C:/data/recordings/2026-08-30-16-20-19",
      "geometry: 10571 frames, sampled every 10 -> 1058",
      "refused: no video_sync rows",
      "Exception in thread \"main\" java.lang.IllegalStateException: nope",
      "refused: ply 25 is out of order",
      "exit 1",
    ].join("\r\n");
    expect(refusalOf(log)).toBe("ply 25 is out of order");
    expect(refusalOf("geometry: 471 frames\nexit 0\n")).toBeNull();
  });

  // `phone-record` starb 2026-09-15 an einer OpenCV-Meldung im Log, der Ledger trug nur `exit 1`.
  const TRACEBACK = [
    "  retime 9561/9593 frames read",
    "Traceback (most recent call last):",
    '  File "/repo/src/chesslab/retime.py", line 348, in _write_boards',
    "    if cv2.imwrite(str(tmp), padded, encode):",
    "cv2.error: OpenCV(4.13.0) loadsave.cpp:1072: error: (-2:Unspecified error) could not find a writer for the specified extension in function 'cv::imwrite_'",
    "",
  ].join("\n");

  test("die letzte Zeile eines Tracebacks ist der Grund", () => {
    expect(refusalOf(TRACEBACK)).toMatch(/could not find a writer/);
  });

  test("ein ausdrueckliches `refused:` schlaegt den Traceback", () => {
    expect(refusalOf(`${TRACEBACK}\nrefused: kein Modell gewaehlt`)).toBe("kein Modell gewaehlt");
  });

  test("die Rich-Rahmen der Typer-Ausgabe zaehlen nicht als Grund", () => {
    expect(refusalOf(`${TRACEBACK}\n└─────────────────────────────┘\n`)).toMatch(/could not find a writer/);
  });
});

const PACK_SIDE = 80;
const PACK_BYTES = PACK_SIDE * PACK_SIDE * 3;
type Row = Record<string, unknown>;

async function sink(
  out: string,
  name: string,
  rows: Row[],
  meta: Row = { n: 1, h: PACK_SIDE, w: PACK_SIDE },
  bytes = PACK_BYTES,
): Promise<void> {
  const dir = path.join(out, name);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "manifest.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  await writeFile(path.join(dir, "packed_meta.json"), JSON.stringify(meta));
  await writeFile(path.join(dir, "packed_images.u8"), Buffer.alloc(bytes));
}

const summary = (model: string, quarantine = 1) => JSON.stringify({
  model,
  accepted_frames: 1, accepted_crops: 1,
  quarantine_frames: quarantine, quarantine_crops: quarantine,
  occluded_proposal_frames: 1, occluded_proposal_crops: 1,
});

const QUARANTINED = { frame: "00000002", label: "unreviewed", proposed_label: "wP", review_status: "quarantine" };

async function safePack(model = DESKTOP_MODEL): Promise<string> {
  const out = path.join(data, "training-pack");
  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, "summary.json"), summary(model));
  await sink(out, "accepted", [{ frame: "00000001", label: "empty" }]);
  await sink(out, "quarantine", [QUARANTINED]);
  await sink(out, "occluded-proposals", [{
    frame: "00000003",
    label: "unreviewed",
    proposed_label: "occluded",
    review_status: "quarantine",
  }]);
  return out;
}

describe("verifyPack", () => {
  it("accepts the real14 fail-closed three-way pack", async () => {
    const out = await safePack();
    await expect(verifyPack(out)).resolves.toMatchObject({
      acceptedFrames: 1,
      quarantineFrames: 1,
      occludedProposalCrops: 1,
    });
  });

  it("rejects a review row that could poison accepted training data", async () => {
    const out = await safePack();
    await sink(out, "accepted", [{
      frame: "00000001",
      label: "unreviewed",
      proposed_label: "empty",
      review_status: "quarantine",
    }]);
    await expect(verifyPack(out)).rejects.toThrow("invalid training label");
  });

  it("rejects a pack made by the stale standard model", async () => {
    const out = await safePack("id35-98");
    await expect(verifyPack(out)).rejects.toThrow(`expected ${DESKTOP_MODEL}`);
  });

  // Ein halb geschriebener Pack hat die richtigen Etiketten und trotzdem zu wenig Bytes.
  test("zu wenige Zeilen im Manifest", async () => {
    const out = await safePack();
    await sink(out, "accepted", []);
    await expect(verifyPack(out)).rejects.toThrow("has 0 rows, expected 1");
  });

  test("ein Frame weniger als die Zusammenfassung behauptet", async () => {
    const out = await safePack();
    await sink(out, "quarantine", [QUARANTINED, QUARANTINED], { n: 2, h: PACK_SIDE, w: PACK_SIDE }, 2 * PACK_BYTES);
    await writeFile(path.join(out, "summary.json"), summary(DESKTOP_MODEL, 2));
    await expect(verifyPack(out)).rejects.toThrow("has 1 frames, expected 2");
  });

  test("ein anderes Crop-Mass als das, mit dem trainiert wird", async () => {
    const out = await safePack();
    await sink(out, "accepted", [{ frame: "00000001", label: "empty" }], { n: 1, h: 128, w: 128 }, 128 * 128 * 3);
    await expect(verifyPack(out)).rejects.toThrow(`expected ${PACK_SIDE}x${PACK_SIDE}`);
  });

  test("ein abgerissener Memmap — richtige Etiketten, zu wenig Bytes", async () => {
    const out = await safePack();
    await sink(out, "accepted", [{ frame: "00000001", label: "empty" }], undefined, PACK_BYTES - 1);
    await expect(verifyPack(out)).rejects.toThrow("unsafe size");
  });
});

describe("lensFor", () => {
  it("skips the lens gate for a recording that came off the phone", () => {
    expect(lensFor(String.raw`C:\data\recordings\2026-08-13-19-34-23\files\sessions\20260813-193423\video.mp4`)).toBe(false);
    expect(lensFor("/data/recordings/x/files/sessions/20260813-193423/video.mp4")).toBe(false);
  });

  it("keeps it for anything else — the rig camera really does have a barrel to remove", () => {
    expect(lensFor(String.raw`C:\data\videos\game\VID_20260802_222741.mp4`)).toBe(true);
  });
});

describe("packArgs", () => {
  it("keys the pack by the transfer name — every phone recording's video is video.mp4", () => {
    expect(packArgs("C:/x/files/sessions/20260813-193423/video.mp4", "C:/x/files/games/g.json", "C:/x/training-pack", "2026-08-13-19-34-23")).toEqual([
      "training-video-pack",
      "C:/x/files/sessions/20260813-193423/video.mp4",
      "C:/x/files/games/g.json",
      "C:/x/training-pack",
      "id=2026-08-13-19-34-23",
      `config=${path.join("C:/x/files/sessions/20260813-193423", "settings.json")}`,
    ]);
  });

  it("hands the pack the recording's own settings — alignEvery decides how the cells are cut", () => {
    const args = packArgs("C:/x/files/sessions/20260813-193423/video.mp4", "C:/x/g.json", "C:/x/out", "2026-08-13-19-34-23");
    expect(args[args.length - 1]).toBe(`config=${path.join("C:/x/files/sessions/20260813-193423", "settings.json")}`);
  });

  it("refuses an id that could walk out of the data directory", () => {
    expect(() => packArgs("v.mp4", "g.json", "out", "../etc")).toThrow();
  });
});

describe("the boundary commit's export hold (§4.1.1)", () => {
  const NAME = "2026-08-13-19-34-23";

  it("writes a row the picker can read, with notBefore and without taking the slot", async () => {
    const job = await holdExport(NAME, 90_000);
    expect(job).toMatchObject({ name: NAME, kind: "export", state: "skipped" });
    expect(Date.parse(job.notBefore ?? "")).toBeGreaterThan(Date.now());
    expect((await lastByStep()).get(`${NAME}|export`)?.notBefore).toBe(job.notBefore);
  });

  it("dequeues inside the window — nothing ran, and the ledger says so", async () => {
    await holdExport(NAME, 90_000);
    const taken = await releaseExportHold(NAME);
    expect(taken.dequeued).toBe(true);
    const last = (await lastByStep()).get(`${NAME}|export`);
    expect(last?.reason).toBe("z — zurückgenommen, der Export lief nie");
    // The row keeps its notBefore: to the picker a cancelled hold is still "nothing ever ran".
    expect(last?.notBefore).toBe(taken.held?.notBefore);
  });

  it("refuses once the hold has expired — then the undo costs a re-export", async () => {
    await holdExport(NAME, -1);
    expect(await releaseExportHold(NAME)).toMatchObject({ dequeued: false });
  });

  it("refuses when no hold was ever written", async () => {
    expect(await releaseExportHold(NAME)).toEqual({ dequeued: false, held: null });
  });

  it("keeps both rows in the recording's own job log, newest first", async () => {
    await holdExport(NAME, 90_000);
    await releaseExportHold(NAME);
    const history = await jobHistory(NAME);
    expect(history).toHaveLength(2);
    expect(history[0].reason).toBe("z — zurückgenommen, der Export lief nie");
  });

  // `holdExport` schreibt nur in den Ledger; die Zeile im Speicher gewann trotzdem (2026-09-21).
  test("ein frueherer Export im Speicher verdeckt den spaeteren Halt nicht", async () => {
    const name = "2026-09-21-10-00-00";
    await enqueueChain(name, "export");
    await whenIdle();
    expect((await lastByStep()).get(`${name}|export`)?.state).toBe("failed");

    const held = await holdExport(name, 90_000);

    expect((await lastByStep()).get(`${name}|export`)?.notBefore).toBe(held.notBefore);
    expect(await releaseExportHold(name)).toMatchObject({ dequeued: true });
  });
});

describe("jobLogTail — `/game/<name>`'s Job-Log", () => {
  const job = (log?: string) => ({ name: "2026-08-13-19-34-23", state: "done" as const, queuedAt: "", log });

  it("returns the last lines, blank ones dropped", async () => {
    const log = path.join(data, "run.log");
    await writeFile(log, ["$ replay", "state: a", "", "state: b", ""].join("\n"));
    expect(await jobLogTail(job(log), 2)).toEqual(["state: a", "state: b"]);
  });

  it("reads only the tail of a log a replay grew to megabytes", async () => {
    const log = path.join(data, "big.log");
    await writeFile(log, `${"x".repeat(200_000)}\nlast line\n`);
    const tail = await jobLogTail(job(log));
    expect(tail.at(-1)).toBe("last line");
    expect(tail[0].length).toBeLessThan(200_000);
  });

  it("is empty for a row that never had a log, and for one whose file is gone", async () => {
    expect(await jobLogTail(job())).toEqual([]);
    expect(await jobLogTail(job(path.join(data, "nope.log")))).toEqual([]);
  });

  test("ein EACCES auf den Job-Log ist kein leerer Log", async () => {
    const log = path.join(data, "job.log");
    await writeFile(log, "zeile\n", "utf8");
    fail.on = (op, file) => (op === "stat" && file === log ? "EACCES" : null);
    await expect(jobLogTail(job(log))).rejects.toThrow(/EACCES/);
  });
});

// Ein unbedingtes `catch` zeigte eine unlesbare Fehlerhistorie als "noch nichts gelaufen".
describe("ein unlesbares Ledger ist nicht 'nichts gelaufen'", () => {
  beforeEach(() => mkdir(path.join(data, "inbox", "jobs.jsonl"), { recursive: true }));

  test("jobHistory sagt nicht 'nichts gelaufen', wenn das Ledger unlesbar ist", async () => {
    await expect(jobHistory("2026-08-13-19-34-23")).rejects.toThrow();
  });

  test("jobs() sagt nicht 'nichts gelaufen', wenn das Ledger unlesbar ist", async () => {
    await expect(jobs()).rejects.toThrow();
  });

  test("jobOf() sagt nicht 'nichts gelaufen', wenn das Ledger unlesbar ist", async () => {
    await expect(jobOf("2026-08-13-19-34-23")).rejects.toThrow();
  });
});

describe("Ledger-Zeilen", () => {
  // `appendRows` hat vor dem Anhaengen einen `await`; ein `void record(running)` konnte so NACH `done` landen.
  test("die zuletzt abgeschickte Zeile steht auch zuletzt in jobs.jsonl", async () => {
    ledger.gated = true;
    const name = "2026-09-21-08-00-00";
    const [, second] = await Promise.all([holdExport(name, 1_000), holdExport(name, 600_000)]);

    const lines = (await readFile(path.join(inboxDir(), "jobs.jsonl"), "utf8")).trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[1]).notBefore).toBe(second.notBefore);
  });

  test("eine gescheiterte Ledger-Zeile vergiftet die folgenden nicht", async () => {
    ledger.failOnce = true;
    await expect(holdExport("2026-09-23-11-00-03", 1_000)).rejects.toThrow(/EMFILE/);
    const later = await holdExport("2026-09-23-11-00-04", 1_000);
    const lines = (await readFile(path.join(inboxDir(), "jobs.jsonl"), "utf8")).trim().split("\n");
    expect(lines.map((l) => JSON.parse(l).name)).toEqual([later.name]);
  });
});

// Wessen Leiche eine `running`-Zeile ist, entscheidet die PID — nicht "steht sie in meiner Warteschlange".
describe("running-Zeilen nach einem Neustart", () => {
  /** Eine PID, die es sicher nicht gibt: die hoechste ist unter 2^22, und 0 ist kein Prozess. */
  const DEAD = 4_194_303;

  async function running(rows: Partial<Job>[]): Promise<void> {
    await mkdir(inboxDir(), { recursive: true });
    const text = rows.map((row) => JSON.stringify({ state: "running", queuedAt: "2026-09-21T06:00:00Z", ...row }));
    await writeFile(path.join(inboxDir(), "jobs.jsonl"), text.join("\n") + "\n", "utf8");
  }

  test("ein fremder Server, der noch lebt, hat keine Leiche hinterlassen", async () => {
    await running([{ name: "a", kind: "matte", pid: process.pid + 0 }]);
    // Dieselbe PID wie wir, aber kein Job im Speicher: die alte Regel, und sie gilt weiter.
    expect((await jobOf("a"))?.state).toBe("failed");

    await running([{ name: "b", kind: "matte", pid: DEAD, childPid: process.pid }]);
    expect((await jobOf("b"))?.state).toBe("running");
  });

  test("ein toter fremder Server ist eine Leiche, ein lebender nicht", async () => {
    await running([{ name: "c", kind: "matte", pid: DEAD }]);
    expect((await jobOf("c"))?.state).toBe("failed");
    expect((await jobOf("c"))?.reason).toContain("server restarted");

    await running([{ name: "d", kind: "matte", pid: process.ppid }]);
    expect((await jobOf("d"))?.state).toBe("running");
  });
});

// Die Zeile, die der Slot wirklich baut — `job.command` aus dem Ledger, nicht die reine Funktion.
describe("job.command", () => {
  const NAME = "2026-09-21-09-00-00";
  const OTHER = "2026-09-21-09-30-00";

  beforeEach(() => {
    matte.census.mockReset().mockResolvedValue({ reportedOpen: 0, wanted: 0 });
  });

  async function commandOf(name: string, step: "settle-scan" | "matte" | "model-read", also: string[] = []): Promise<string> {
    await enqueueChain(name, step, also);
    await whenIdle();
    return (await lastByStep()).get(`${name}|${step}`)?.command ?? "";
  }

  test("settle-scan bekommt die SESSION-Id, nicht den Verzeichnisnamen", async () => {
    expect(await commandOf(NAME, "settle-scan")).toContain(`session settle-scan rg-${NAME}`);
  });

  test("die Mitfahrer des Matte-Stapels stehen mit auf der Zeile", async () => {
    expect(await commandOf(NAME, "matte", [OTHER])).toContain(`alpha-worker ${NAME} ${OTHER} --limit 80`);
  });

  test("eine offene Meldung schlaegt den Wunsch und der Wunsch den Stapel", async () => {
    matte.census.mockResolvedValue({ reportedOpen: 2, wanted: 5 });
    expect(await commandOf(NAME, "matte")).toMatch(/--reported$/);

    matte.census.mockResolvedValue({ reportedOpen: 0, wanted: 5 });
    expect(await commandOf(OTHER, "matte")).toMatch(/--wanted$/);
  });

  test("das Modell steht auf der Zeile, sobald eines gewaehlt ist", async () => {
    process.env.CHESSLAB_MODEL_READ_RUN = "data/runs/p4a-80-clahe";
    expect(await commandOf(NAME, "model-read")).toContain("--model data/runs/p4a-80-clahe");
  });

  test("wirft der Vorflug, ist der Job FAILED und nicht fuer immer running", async () => {
    matte.census.mockRejectedValue(new Error("matte.jsonl kaputt"));
    await enqueueChain(OTHER, "matte");
    await whenIdle();
    const row = (await lastByStep()).get(`${OTHER}|matte`);
    expect(row?.state).toBe("failed");
    expect(row?.reason).toContain("matte.jsonl kaputt");
  });
});

describe("der Slot", () => {
  // Je Job zurueckgegeben gaebe der Riegel die Maschine frei, waehrend die Kette weiterarbeitet.
  test("zwei Sprossen hintereinander geben den Riegel EINMAL zurueck, ganz am Ende", async () => {
    await enqueueChain("2026-09-21-12-00-00", "export");
    await enqueueChain("2026-09-21-12-30-00", "export");
    await whenIdle();

    expect(released.at).toEqual([null]);
  });

  // Ein gescheiterter Spawn feuert `error` UND `close`; das zweite `end` warf ein `uncaughtException`.
  test("ein Werkzeug, das gar nicht startet, reisst den Server nicht mit", async () => {
    const name = "2026-09-21-11-00-00";
    const seen: unknown[] = [];
    const catcher = (error: unknown) => seen.push(error);
    process.on("uncaughtException", catcher);
    try {
      await enqueueChain(name, "export");
      await whenIdle();
      await new Promise((resolve) => setTimeout(resolve, 50));
    } finally {
      process.off("uncaughtException", catcher);
    }

    expect(seen).toEqual([]);
    const row = (await lastByStep()).get(`${name}|export`);
    expect(row?.state).toBe("failed");
    expect(row?.reason).toContain("CHESSLAB_UV");
    expect(await readFile(path.join(jobsDir(), `${name}.export.log`), "utf8")).toContain("spawn failed");
  });

  test("ein gestoppter Lauf steht als Entscheidung im Ledger, nicht als Werkzeugfehler", async () => {
    process.env.CHESSLAB_UV = await shim("uv", true);
    const name = "2026-09-21-14-00-00";

    void enqueueChain(name, "export");
    await vi.waitFor(async () => expect(await stopRunning()).toMatchObject({ stopped: name }), { timeout: 15_000 });
    await whenIdle();

    const row = await jobOf(name);
    expect(row?.state).toBe("stopped");
    expect(row?.reason).toContain("gestoppt");
  }, 30_000);

  test("ein zweiter Druck auf Handy-Record reiht keinen zweiten Lauf ein", async () => {
    process.env.CHESSLAB_DESKTOP_BIN = path.join(data, "missing-tool");
    const name = "2026-09-23-11-00-02";
    const first = await enqueuePhoneRecord(name);
    expect(await enqueuePhoneRecord(name)).toBe(first);
    await whenIdle();
  }, 30_000);
});

describe("Label-Lauf", () => {
  test("Exit 0 ohne candidate.json ist kein erledigter Schritt", async () => {
    const name = "2026-09-21-15-00-00";
    await labelable(name);

    await enqueueLabel(name);
    await whenIdle();

    const row = await jobOf(name);
    expect(row?.code).toBe(0);
    expect(row?.state).toBe("failed");
    expect(row?.candidate).toBeUndefined();
  }, 30_000);

  test("eine vorhandene candidate.json startet das Label-Werkzeug nicht", async () => {
    const name = "2026-09-23-11-00-00";
    const candidate = await labelable(name, true);
    await enqueueLabel(name);
    await whenIdle();
    const row = await jobOf(name);
    expect(row?.command).toBeUndefined();
    expect(row?.reason).toMatch(/nothing was overwritten/);
    expect(await readFile(candidate, "utf8")).toBe('{"confirmed": true}\n');
  }, 30_000);

  // `jobs.exists` las jeden `stat`-Fehler als „nicht da" — das Werkzeug haette die Bestaetigungen ueberschrieben.
  test("ein EACCES auf candidate.json startet das Label-Werkzeug nicht", async () => {
    const name = "2026-09-23-10-00-00";
    const candidate = await labelable(name, true);
    fail.on = (op, file) => (op === "stat" && file === candidate ? "EACCES" : null);

    await enqueueLabel(name);
    await whenIdle();

    const row = await jobOf(name);
    expect(row?.command).toBeUndefined();
    expect(row?.reason).toMatch(/EACCES/);
    expect(await readFile(candidate, "utf8")).toBe('{"confirmed": true}\n');
  }, 30_000);

  test("ein zweiter Druck auf Label reiht keinen zweiten Lauf ein", async () => {
    const name = "2026-09-23-11-00-01";
    await labelable(name, true);
    const first = await enqueueLabel(name);
    expect(await enqueueLabel(name)).toBe(first);
    await whenIdle();
  }, 30_000);
});

describe("Prozesse", () => {
  const FOREVER = "setInterval(()=>{},1000)";

  // Der Fehler war, dass `.kill()` auf unser Kind den Worker auf der GPU liess.
  test("the kill reaches the GRANDchild — uv → chesslab.exe → python is three deep", async () => {
    const spawner = [
      'const {spawn}=require("node:child_process");',
      `const c=spawn(process.execPath,["-e","${FOREVER}"],{stdio:"ignore"});`,
      "console.log(c.pid);",
      FOREVER,
    ].join("");
    const parent = spawn(process.execPath, ["-e", spawner], { stdio: ["ignore", "pipe", "ignore"] });
    const grandchild = await new Promise<number>((resolve) => {
      parent.stdout.on("data", (chunk) => resolve(Number(String(chunk).trim())));
    });
    expect(alive(parent.pid!)).toBe(true);
    expect(alive(grandchild)).toBe(true);

    await killTree(parent.pid!);

    await vi.waitFor(
      () => {
        expect(alive(parent.pid!)).toBe(false);
        expect(alive(grandchild)).toBe(false);
      },
      { timeout: 15_000 },
    );
  }, 30_000);

  // `windowsVerbatimArguments` reicht die Zeile unveraendert an CreateProcess — das Quoting ist unseres.
  test.runIf(win)("ein Leerzeichen im Pfad UND im Argument ueberlebt den Weg durch cmd", async () => {
    const root = path.join(data, "with space");
    await mkdir(root, { recursive: true });
    const bat = path.join(root, "echo.bat");
    await writeFile(bat, "@echo off\r\n> \"%~1\" echo %~2\r\n", "utf8");
    const out = path.join(root, "out file.txt");

    // Auf das Ende warten: sonst haelt cmd sein cwd noch, und das Aufraeumen stirbt an EBUSY.
    const child = spawnTool(bat, [out, "hallo welt"], root);
    await new Promise((resolve) => child.once("close", resolve));
    expect((await readFile(out, "utf8")).trim()).toBe("hallo welt");
  }, 30_000);
});

// Jede Kommandozeile der Web-App gegen die Quelle von `src/chesslab/cli.py` — der Test startet nichts.
describe("cli-parity", () => {
  const CLI = readFileSync(path.join(__dirname, "../../../src/chesslab/cli.py"), "utf8");

  /** `app.add_typer(session_app, name="session")` — das Praefix, unter dem die Verben haengen. */
  function groups(): Map<string, string> {
    const found = new Map<string, string>([["app", ""]]);
    for (const m of CLI.matchAll(/app\.add_typer\((\w+),\s*name="([^"]+)"/g)) found.set(m[1], m[2]);
    return found;
  }

  /** Verb -> die Flags, die seine Signatur deklariert. */
  function commands(): Map<string, Set<string>> {
    const prefix = groups();
    const lines = CLI.split(/\r?\n/);
    const out = new Map<string, Set<string>>();
    for (const [index, line] of lines.entries()) {
      const dec = /^@(\w+)\.command\((?:"([^"]+)")?\)/.exec(line);
      if (!dec) continue;
      const group = prefix.get(dec[1]);
      if (group === undefined) continue;
      const def = /^def (\w+)\(/.exec(lines[index + 1] ?? "");
      const verb = dec[2] ?? (def ? def[1].replace(/_/g, "-") : null);
      if (verb === null) continue;
      const flags = new Set<string>();
      for (let i = index + 1; i < lines.length && !/^\) ->/.test(lines[i]); i++) {
        for (const f of lines[i].matchAll(/"(--[a-z0-9][a-z0-9-]*)"/g)) flags.add(f[1]);
      }
      out.set(group ? `${group} ${verb}` : verb, flags);
    }
    return out;
  }

  const CMDS = commands();

  /** `["run", "chesslab", "realgames", "model-read", name, "--model", run]` -> Verb + Flags. */
  function parse(args: string[]): { verb: string; flags: string[] } {
    expect(args.slice(0, 2)).toEqual(["run", "chesslab"]);
    const rest = args.slice(2);
    const words = rest.filter((a) => !a.startsWith("--"));
    const known = [2, 1].map((n) => words.slice(0, n).join(" ")).find((v) => CMDS.has(v));
    return { verb: known ?? words.slice(0, 2).join(" "), flags: rest.filter((a) => a.startsWith("--")) };
  }

  const NAME = "2026-09-21-08-00-00";
  const LINES: string[][] = [
    chesslabArgs("export", [NAME]),
    chesslabArgs("adopt-dirty", [NAME]),
    chesslabArgs("settle-scan", [NAME]),
    chesslabArgs("temporal", [NAME]),
    chesslabArgs("model-read", [NAME], { model: "data/runs/p4a-80-clahe" }),
    chesslabArgs("matte", [NAME, "b"], { matte: "reported" }),
    chesslabArgs("matte", [NAME], { matte: "wanted" }),
    chesslabArgs("matte", [NAME], { matte: "limit", limit: 80 }),
    retimeArgs(NAME),
    positionFlagsArgs(),
    // `runChesslabCapture`s eigene Aufrufer — dieselbe CLI, derselbe Preis fuer einen Tippfehler.
    ["run", "chesslab", "occluders", "recut", NAME],
    ["run", "chesslab", "session", "delete", `rg-${NAME}`, "--dry-run"],
    ["run", "chesslab", "session", "delete", `rg-${NAME}`, "--yes"],
  ];

  test("die CLI-Quelle wurde wirklich gelesen", () => {
    expect(CMDS.size).toBeGreaterThan(40);
    expect(CMDS.get("occluders alpha-worker")).toContain("--reported");
  });

  test("jedes Verb und jedes Flag der Web-App existiert in cli.py", () => {
    for (const args of LINES) {
      const { verb, flags } = parse(args);
      expect(CMDS.has(verb), `${verb} fehlt in cli.py`).toBe(true);
      for (const flag of flags) expect([...(CMDS.get(verb) ?? [])], `${verb} ${flag}`).toContain(flag);
    }
  });

  test("Gegenprobe: erfundenes Verb und erfundenes Flag fallen durch", () => {
    expect(CMDS.has("realgames export-sessions")).toBe(false);
    expect([...(CMDS.get("occluders alpha-worker") ?? [])]).not.toContain("--report");
  });
});
