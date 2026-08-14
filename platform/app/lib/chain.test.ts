import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { adoptPgn, chainState, nextStep } from "@/lib/chain";

let data: string;
const NAME = "2026-08-13-12-10-55";

beforeEach(async () => {
  data = await mkdtemp(path.join(tmpdir(), "chesslab-chain-"));
  process.env.CHESSLAB_DATA_DIR = data;
  await mkdir(path.join(data, "realgames", NAME), { recursive: true });
});

const game = (...parts: string[]) => path.join(data, "realgames", NAME, ...parts);

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
    hasProposals: false,
    useless: null,
  };

  it("offers nothing at all for a game the human called useless", () => {
    expect(nextStep({ ...base, useless: { at: "2026-08-14T20:00:00Z" } })).toBeNull();
    expect(nextStep({ ...base, hasCandidate: true, useless: { at: "2026-08-14T20:00:00Z" } })).toBeNull();
  });

  it("walks the chain in order", () => {
    expect(nextStep(base)).toBe("label");
    expect(nextStep({ ...base, hasCandidate: true })).toBe("confirm");
    expect(nextStep({ ...base, hasCandidate: true, confirmed: true })).toBe("export");
    expect(nextStep({ ...base, hasCandidate: true, confirmed: true, hasSession: true })).toBe("propose");
    expect(nextStep({ ...base, hasCandidate: true, confirmed: true, hasSession: true, hasProposals: true })).toBe("relabel");
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

  it("moves to relabel once the session and the proposals exist", async () => {
    await video();
    await candidate(true);
    await mkdir(path.join(data, "sessions", `rg-${NAME}`), { recursive: true });
    await writeFile(game("occluded-proposals.jsonl"), "{}\n");
    expect((await chainState(NAME)).step).toBe("relabel");
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
