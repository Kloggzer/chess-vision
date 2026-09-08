import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { progressOf } from "@/lib/progress";

let data: string;
let log: string;

beforeEach(async () => {
  data = await mkdtemp(path.join(tmpdir(), "chesslab-progress-"));
  process.env.CHESSLAB_DATA_DIR = data;
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
    await import("node:fs/promises").then((fs) => fs.mkdir(session, { recursive: true }));
    await writeFile(path.join(session, "session.yaml"), "video_duration_ns: 52000000000\n");
    await writeFile(log, REPLAY);
    expect((await progressOf("x", log)).totalSeconds).toBe(52);
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

/**
 * Die Zeilen, die der Export selbst schreibt. `board cut` und `straighten` kamen 2026-09-08 dazu:
 * `rewarp_boards` und `straighten_boards` liefen stumm, und "Bretter ausschneiden" sah minutenlang
 * aus wie ein haengender Job — genau die Verwechslung, gegen die dieser Balken existiert.
 */
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
