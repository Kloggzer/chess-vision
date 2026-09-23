import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, test, vi } from "vitest";
import { GET as progressRoute } from "@/app/api/chain/[name]/progress/route";
import { progressOf } from "@/lib/chain/progress";
import { tempDataRoot } from "@/lib/test-fixtures";

type Op = "stat" | "readdir";
const fail = vi.hoisted(() => ({ on: null as null | ((op: Op, file: string) => boolean) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
  const hop = (op: Op, file: string, rest: unknown[]) =>
    fail.on?.(op, String(file))
      ? Promise.reject(Object.assign(new Error(`EACCES: ${file}`), { code: "EACCES" }))
      : (real[op] as (...a: unknown[]) => unknown)(file, ...rest);
  return {
    ...real,
    stat: (f: string, ...r: unknown[]) => hop("stat", f, r),
    readdir: (f: string, ...r: unknown[]) => hop("readdir", f, r),
  };
});

let data: string;
let log: string;

beforeEach(async () => {
  fail.on = null;
  data = await tempDataRoot("progress");
  log = path.join(data, "job.log");
});

/** The shape a real replay writes on this machine — including the JVM's locale-formatted clock. */
const REPLAY = [
  "$ desktop.bat replay video.mp4 label",
  "board located from its markers: 800 px warp",
  "state: moving -> waiting at 7,24s",
  "decision: ply=1 e4 decider=cnn_occupancy",
  "state: waiting -> moving at 30,38s",
  "decision: ply=0 - decider=rejected",
  "tracked 1553 frames of video.mp4 at 29,83 fps",
].join("\n");

describe("progressOf", () => {
  it("reads a German-formatted clock — the JVM prints the system locale", async () => {
    await writeFile(log, REPLAY);
    const p = await progressOf("2026-08-13-01-39-15", log);
    expect(p.atSeconds).toBe(30.38);
  });

  it("counts committed plies only, never a rejected decision row", async () => {
    await writeFile(log, REPLAY);
    expect((await progressOf("2026-08-13-01-39-15", log)).plies).toBe(1);
  });

  it("has no position and no crash when the job has not printed anything", async () => {
    await writeFile(log, "");
    const p = await progressOf("2026-08-13-01-39-15", log);
    expect(p).toMatchObject({ atSeconds: null, plies: 0, bytes: 0, tail: [] });
  });

  it("reads the recording's own duration as the denominator", async () => {
    const session = path.join(data, "recordings", "x", "files", "sessions", "20260813-013915");
    await mkdir(session, { recursive: true });
    await writeFile(path.join(session, "session.yaml"), "video_duration_ns: 52000000000\n");
    await writeFile(log, REPLAY);
    expect((await progressOf("x", log)).totalSeconds).toBe(52);
  });

  it("has no denominator without a phone session, and takes the newest session that states one", async () => {
    await writeFile(log, REPLAY);
    expect((await progressOf("y", log)).totalSeconds).toBeNull();
    const sessions = path.join(data, "recordings", "y", "files", "sessions");
    await mkdir(path.join(sessions, "20260813-100000"), { recursive: true });
    await mkdir(path.join(sessions, "20260813-110000"), { recursive: true });
    await writeFile(path.join(sessions, "20260813-100000", "session.yaml"), "video_duration_ns: 10000000000\n");
    await writeFile(path.join(sessions, "20260813-110000", "session.yaml"), "video_duration_ns: 0\n");
    expect((await progressOf("y", log)).totalSeconds).toBe(10);
  });

  it("reads only the CURRENT run — an appended log still holds the last one's clock", async () => {
    const older = [
      "$ desktop.bat replay video.mp4 label lens",
      "state: moving -> waiting at 300,00s",
      "decision: ply=9 Nf3 decider=cnn_occupancy",
      "Exception in thread \"main\" java.lang.IllegalStateException: no accepted lens fit",
      "exit 1",
    ].join("\n");
    await writeFile(log, `${older}\n${REPLAY}`);
    const p = await progressOf("2026-08-13-19-34-23", log);
    expect(p.atSeconds).toBe(30.38);
    expect(p.plies).toBe(1);
  });
});

// `board cut`/`straighten` seit 2026-09-08: stumm sah "Bretter ausschneiden" minutenlang wie ein haengender Job aus.
describe("progressOf liest die Schritte des Exports", () => {
  const cases: [string, string, number, number][] = [
    ["decode", "  decode 300/1200 frames", 300, 1200],
    ["grid fit", "  grid fit 500/1200 frames, hands on 12", 500, 1200],
    ["board cut", "  board cut 700/1200 frames", 700, 1200],
    ["straighten", "  straighten 900/1200 frames", 900, 1200],
  ];
  for (const [name, line, at, total] of cases) {
    it(`${name} landet als Balken, nicht als Spinner`, async () => {
      await writeFile(log, `$ uv run chesslab realgames export-session x\n${line}\n`);
      const p = await progressOf("2026-08-13-01-39-15", log);
      expect(p.frames).toEqual({ at, total });
    });
  }

  it("nimmt die LETZTE Zahl, damit der Balken nicht zurueckspringt", async () => {
    await writeFile(log, ["$ uv run chesslab realgames export-session x",
                          "  board cut 100/1200 frames",
                          "  board cut 700/1200 frames"].join("\n"));
    expect((await progressOf("2026-08-13-01-39-15", log)).frames).toEqual({ at: 700, total: 1200 });
  });
});

// Gezaehlt wird der BEGANGENE Zug; `decider=rejected` mitzuzaehlen meldete "3 Zuege" bei leerer Zugliste.
describe("progressOf zaehlt und teilt nur, was es gibt", () => {
  const replay = async (lines: string[]) => {
    await writeFile(log, ["$ desktop.bat replay", ...lines].join("\n") + "\n", "utf8");
    return log;
  };

  test("verworfene Entscheidungen sind keine Zuege", async () => {
    const file = await replay([
      "decision: ply=1 decider=commit",
      "decision: ply=7 decider=rejected",
    ]);
    expect((await progressOf("g", file)).plies).toBe(1);
  });

  test("ein Nenner von 0 ergibt keinen Balken", async () => {
    expect((await progressOf("g", await replay(["0/0 frames"]))).frames).toBeNull();
    expect((await progressOf("g", await replay(["12/40 frames"]))).frames).toEqual({ at: 12, total: 40 });
  });
});

describe("ein EACCES ist kein „nichts da\"", () => {
  test("ein EACCES auf sessions/ ist keine unbekannte Dauer", async () => {
    await mkdir(path.join(data, "recordings", "g", "files", "sessions"), { recursive: true });
    fail.on = (op, file) => op === "readdir" && file.endsWith(path.join("files", "sessions"));
    await expect(progressOf("g", undefined)).rejects.toThrow(/EACCES/);
  });

  test("ein EACCES auf den Log ist kein leerer Log", async () => {
    await mkdir(path.join(data, "recordings", "g"), { recursive: true });
    await writeFile(log, "$ run\n", "utf8");
    fail.on = (op, file) => op === "stat" && file === log;
    await expect(progressOf("g", log)).rejects.toThrow(/EACCES/);
  });
});

// `jobs(limit)` schnitt VOR dem Namensfilter der Route: eine alte Aufnahme pollte als idle, waehrend ihr Job lief.
it("finds the running job of an old recording behind 120 newer ledger rows", async () => {
  const oldLog = path.join(data, "inbox", "jobs", "old-one.export.log");
  await mkdir(path.dirname(oldLog), { recursive: true });
  const rows = [JSON.stringify({
    name: "old-one", kind: "export", state: "running",
    queuedAt: "2020-01-01T00:00:00.000Z", startedAt: "2020-01-01T00:00:00.000Z",
    log: oldLog, pid: process.pid,
  })];
  for (let i = 0; i < 120; i++) {
    rows.push(JSON.stringify({
      name: `filler-${i}`, kind: "export", state: "done",
      queuedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
    }));
  }
  await writeFile(path.join(data, "inbox", "jobs.jsonl"), rows.join("\n") + "\n", "utf8");
  await writeFile(oldLog, "state: cutting at 12.34s\n", "utf8");

  const answer = await progressRoute(new Request("http://local/api/chain/old-one/progress"), {
    params: Promise.resolve({ name: "old-one" }),
  } as never);
  const body = (await answer.json()) as { job: { name: string } | null };
  expect(body.job, "BUG: jobs(100) slices before the route filters by name").not.toBeNull();
});
