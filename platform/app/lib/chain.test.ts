import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { adoptPgn, chainState, nextStep, referenceOrigin } from "@/lib/chain";

let data: string;
const NAME = "2026-08-13-12-10-55";

beforeEach(async () => {
  data = await mkdtemp(path.join(tmpdir(), "chesslab-chain-"));
  process.env.CHESSLAB_DATA_DIR = data;
  await mkdir(path.join(data, "recordings", NAME), { recursive: true });
});

const game = (...parts: string[]) => path.join(data, "recordings", NAME, ...parts);

async function video(): Promise<void> {
  await mkdir(game("files", "sessions", "20260813-121055"), { recursive: true });
  await writeFile(game("files", "sessions", "20260813-121055", "video.mp4"), "x");
}

async function candidate(confirmed: boolean): Promise<void> {
  await writeFile(game("candidate.json"), JSON.stringify({ moves: [], confirmed }));
}

describe("nextStep", () => {
  const base = {
    video: "v",
    videoBroken: null,
    offeredPgn: null,
    hasReference: false,
    hasCandidate: false,
    confirmed: false,
    hasSession: false,
    mattes: { done: 0, total: 0, target: 0 },
    hasModelReads: false,
    useless: null,
  };

  it("offers nothing at all for a game the human called useless", () => {
    expect(nextStep({ ...base, useless: { at: "2026-08-14T20:00:00Z" } })).toBeNull();
    expect(nextStep({ ...base, hasCandidate: true, useless: { at: "2026-08-14T20:00:00Z" } })).toBeNull();
  });

  it("walks the chain in order", () => {
    const exported = { ...base, hasCandidate: true, confirmed: true, hasSession: true };
    expect(nextStep(base)).toBe("label");
    expect(nextStep({ ...base, hasCandidate: true })).toBe("confirm");
    expect(nextStep({ ...base, hasCandidate: true, confirmed: true })).toBe("export");
    expect(nextStep({ ...exported, mattes: { done: 0, total: 12, target: 12 } })).toBe("matte");
    expect(nextStep(exported)).toBe("model-read");
    expect(nextStep({ ...exported, hasModelReads: true })).toBe("labeln");
  });

  it("mattes until the RUN'S TARGET is reached, not until the pile is empty", () => {
    const exported = { ...base, hasCandidate: true, confirmed: true, hasSession: true };
    expect(nextStep({ ...exported, mattes: { done: 40, total: 80, target: 80 } })).toBe("matte");
    expect(nextStep({ ...exported, mattes: { done: 80, total: 80, target: 80 } })).toBe("model-read");
    // 80 of 394 is the instruction carried out (`--all --limit 80`): the biggest sessions must
    // leave this rung, or the chain strands exactly the material it is here for.
    expect(nextStep({ ...exported, mattes: { done: 80, total: 394, target: 80 } })).toBe("model-read");
    expect(nextStep({ ...exported, mattes: { done: 79, total: 394, target: 80 } })).toBe("matte");
    // A session whose frames are all clean has no pile at all; it must not stall on an empty one.
    expect(nextStep({ ...exported, mattes: { done: 0, total: 0, target: 0 } })).toBe("model-read");
  });

  it("never offers export before a human confirmed — an unconfirmed candidate exports nothing", () => {
    expect(nextStep({ ...base, hasCandidate: true, hasSession: false })).toBe("confirm");
  });
});

describe("chainState", () => {
  it("reads a freshly transferred bundle as 'label', with its video", async () => {
    await video();
    const state = await chainState(NAME);
    expect(state.step).toBe("label");
    expect(state.video).toContain("video.mp4");
  });

  it("says a bundle without a video has nothing to label", async () => {
    expect((await chainState(NAME)).video).toBeNull();
  });

  it("offers the phone's PGN only while no reference exists", async () => {
    await mkdir(game("files", "games"), { recursive: true });
    await writeFile(game("files", "games", "2026-08-13_1941.pgn"), "1. e4 e5");
    expect((await chainState(NAME)).offeredPgn).toContain("2026-08-13_1941.pgn");

    await writeFile(game("reference.pgn"), "1. d4");
    expect((await chainState(NAME)).offeredPgn).toBeNull();
  });

  it("moves to labeln once the session and the model reads exist", async () => {
    await video();
    await candidate(true);
    await mkdir(path.join(data, "recordings", NAME), { recursive: true });
    await writeFile(path.join(data, "recordings", NAME, "log.jsonl"), "{}\n");
    await writeFile(game("model-reads.jsonl"), "{}\n");
    expect((await chainState(NAME)).step).toBe("labeln");
  });

  it("counts the alphas against the session's own occluded pile", async () => {
    await video();
    await candidate(true);
    const dir = path.join(data, "recordings", NAME);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "log.jsonl"), [
      JSON.stringify({ frame: "1.png", dirty: true, dirty_reason: "occluded" }),
      JSON.stringify({ frame: "2.png", dirty: true, dirty_reason: "occluded" }),
      JSON.stringify({ frame: "3.png", dirty: true, dirty_reason: "grid-late" }),
      JSON.stringify({ frame: "4.png" }),
    ].join("\n") + "\n");
    await writeFile(path.join(dir, "matte.jsonl"), JSON.stringify({ frame: "1", coverage: {} }) + "\n");
    const state = await chainState(NAME);
    expect(state.mattes).toEqual({ done: 1, total: 2, target: 2 });
    expect(state.step).toBe("matte");
  });

  it("a session directory without log.jsonl is NOT an export — the killed-export case", async () => {
    await video();
    await candidate(true);
    await mkdir(path.join(data, "recordings", NAME, "frames"), { recursive: true });
    expect((await chainState(NAME)).step).toBe("export");
  });
});

describe("adoptPgn", () => {
  it("copies the phone's PGN in", async () => {
    await mkdir(game("files", "games"), { recursive: true });
    await writeFile(game("files", "games", "2026-08-13_1941.pgn"), "1. e4 e5");
    expect(await adoptPgn(NAME)).toEqual({ adopted: "2026-08-13_1941.pgn" });
    expect((await chainState(NAME)).hasReference).toBe(true);
  });

  it("never overwrites a reference somebody put there", async () => {
    await mkdir(game("files", "games"), { recursive: true });
    await writeFile(game("files", "games", "2026-08-13_1941.pgn"), "1. e4 e5");
    await writeFile(game("reference.pgn"), "1. d4 d5");
    expect(await adoptPgn(NAME)).toMatchObject({ reason: expect.stringContaining("already exists") });
  });

  it("says plainly when the transfer carries no PGN at all", async () => {
    expect(await adoptPgn(NAME)).toMatchObject({ reason: expect.stringContaining("no .pgn") });
  });
});

describe("referenceOrigin", () => {
  it("calls an adopted reference the phone's own — the confirm screen has to say so", async () => {
    await mkdir(game("files", "games"), { recursive: true });
    await writeFile(game("files", "games", "2026-08-13_1941.pgn"), "1. e4 e5");
    expect(await referenceOrigin(NAME)).toBe("none");
    await adoptPgn(NAME);
    expect(await referenceOrigin(NAME)).toBe("phone");
  });

  it("calls a notation that matches no bundle PGN an outside one", async () => {
    await mkdir(game("files", "games"), { recursive: true });
    await writeFile(game("files", "games", "2026-08-13_1941.pgn"), "1. e4 e5");
    await writeFile(game("reference.pgn"), "1. d4 d5");
    expect(await referenceOrigin(NAME)).toBe("outside");
  });

  it("is outside, not phone, when the bundle carries no games directory to have written it", async () => {
    await writeFile(game("reference.pgn"), "1. d4 d5");
    expect(await referenceOrigin(NAME)).toBe("outside");
  });

  // Byte-for-byte, like `realgames.reference_is_the_phones_own`: an edited copy is a human's word.
  it("stops calling it the phone's once a human has edited it", async () => {
    await mkdir(game("files", "games"), { recursive: true });
    await writeFile(game("files", "games", "2026-08-13_1941.pgn"), "1. e4 e5");
    await adoptPgn(NAME);
    await writeFile(game("reference.pgn"), "1. e4 e5 2. Nf3");
    expect(await referenceOrigin(NAME)).toBe("outside");
  });
});

describe("an interrupted recording", () => {
  it("is named before the button is offered — no moov, no ten-minute replay", async () => {
    const dir = game("files", "sessions", "20260813-121218");
    await mkdir(dir, { recursive: true });
    // `ftyp` then a 64-bit `mdat` that runs to the end: what a killed recorder leaves behind.
    const head = Buffer.alloc(32);
    head.writeUInt32BE(16, 0);
    head.write("ftyp", 4);
    head.writeUInt32BE(1, 16);
    head.write("mdat", 20);
    head.writeBigUInt64BE(BigInt(16), 24);
    await writeFile(path.join(dir, "video.mp4"), head);

    const state = await chainState(NAME);
    expect(state.video).toContain("video.mp4");
    expect(state.videoBroken).toContain("moov");
  });

  it("says nothing about a finalized one", async () => {
    const dir = game("files", "sessions", "20260813-193423");
    await mkdir(dir, { recursive: true });
    const head = Buffer.alloc(24);
    head.writeUInt32BE(16, 0);
    head.write("ftyp", 4);
    head.writeUInt32BE(8, 16);
    head.write("moov", 20);
    await writeFile(path.join(dir, "video.mp4"), head);

    expect((await chainState(NAME)).videoBroken).toBeNull();
  });
});
