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
    const session = path.join(data, "realgames", "x", "files", "sessions", "20260813-013915");
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
