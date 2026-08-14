import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { labelArgs, lensFor, packArgs, packInputs, verifyPack, videoInput } from "@/lib/jobs";

let data: string;
let files: string;

beforeEach(async () => {
  data = await mkdtemp(path.join(tmpdir(), "chesslab-jobs-"));
  process.env.CHESSLAB_DATA_DIR = data;
  files = path.join(data, "realgames", "2026-08-13-19-34-23", "files");
  await mkdir(path.join(files, "sessions", "20260813-193423"), { recursive: true });
  await mkdir(path.join(files, "games"), { recursive: true });
});

const game = (id: string, sessionId: string | null) =>
  writeFile(
    path.join(files, "games", `${id}.json`),
    JSON.stringify({ id, sessionId, moves: [] }),
  );

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
});

describe("labelArgs", () => {
  it("fits barrel correction before writing UI review frames", () => {
    expect(labelArgs("C:/recordings/video.mp4", "2026-08-13-12-10-55")).toEqual([
      "replay",
      "C:/recordings/video.mp4",
      "label",
      "lens",
      "name=2026-08-13-12-10-55",
      "model=real14-80",
    ]);
  });
});

const PACK_SIDE = 80;
const PACK_BYTES = PACK_SIDE * PACK_SIDE * 3;

async function sink(
  out: string,
  name: string,
  row: Record<string, unknown>,
): Promise<void> {
  const dir = path.join(out, name);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "manifest.jsonl"), `${JSON.stringify(row)}\n`);
  await writeFile(path.join(dir, "packed_meta.json"), JSON.stringify({ n: 1, h: PACK_SIDE, w: PACK_SIDE }));
  await writeFile(path.join(dir, "packed_images.u8"), Buffer.alloc(PACK_BYTES));
}

async function safePack(model = "real14-80"): Promise<string> {
  const out = path.join(data, "training-pack");
  await mkdir(out, { recursive: true });
  await writeFile(
    path.join(out, "summary.json"),
    JSON.stringify({
      model,
      accepted_frames: 1,
      accepted_crops: 1,
      quarantine_frames: 1,
      quarantine_crops: 1,
      occluded_proposal_frames: 1,
      occluded_proposal_crops: 1,
    }),
  );
  await sink(out, "accepted", { frame: "00000001", label: "empty" });
  await sink(out, "quarantine", {
    frame: "00000002",
    label: "unreviewed",
    proposed_label: "wP",
    review_status: "quarantine",
  });
  await sink(out, "occluded-proposals", {
    frame: "00000003",
    label: "unreviewed",
    proposed_label: "occluded",
    review_status: "quarantine",
  });
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
    await sink(out, "accepted", {
      frame: "00000001",
      label: "unreviewed",
      proposed_label: "empty",
      review_status: "quarantine",
    });
    await expect(verifyPack(out)).rejects.toThrow("invalid training label");
  });

  it("rejects a pack made by the stale standard model", async () => {
    const out = await safePack("id35-98");
    await expect(verifyPack(out)).rejects.toThrow("expected real14-80");
  });
});

describe("lensFor", () => {
  it("skips the lens gate for a recording that came off the phone", () => {
    expect(lensFor(String.raw`C:\data\realgames\2026-08-13-19-34-23\files\sessions\20260813-193423\video.mp4`)).toBe(false);
    expect(lensFor("/data/realgames/x/files/sessions/20260813-193423/video.mp4")).toBe(false);
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
    ]);
  });

  it("refuses an id that could walk out of the data directory", () => {
    expect(() => packArgs("v.mp4", "g.json", "out", "../etc")).toThrow();
  });
});
