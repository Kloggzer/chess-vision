// Tests memoization only, not timing — ~2880 retries/day without it (measured).
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import type { ChainState } from "@/lib/chain";
import type { QueueRow } from "@/lib/queues";

const fake = vi.hoisted(() => ({ adopt: vi.fn(), rows: [] as unknown[] }));

vi.mock("@/lib/chain", async (original) => ({
  ...(await original<typeof import("@/lib/chain")>()),
  adoptPgn: fake.adopt,
}));
vi.mock("@/lib/queues", async (original) => ({
  ...(await original<typeof import("@/lib/queues")>()),
  queueRows: async () => fake.rows,
}));

const { autopilotStatus, clearErrors, tick } = await import("@/lib/autopilot-engine");

/** A game the human still has to confirm: it offers a PGN and has no machine step to start. */
const CHAIN: ChainState = {
  step: "confirm",
  video: "files/sessions/x/video.mp4",
  videoBroken: null,
  offeredPgn: "game.pgn",
  hasReference: false,
  hasCandidate: true,
  confirmed: false,
  hasSession: false,
  hasProposals: false,
  useless: null,
};
const ROW: QueueRow = { name: "2026-08-14-09-23-19", title: null, plies: 0, frames: 0, archived: false, chain: CHAIN };

beforeEach(async () => {
  process.env.CHESSLAB_DATA_DIR = await mkdtemp(path.join(tmpdir(), "chesslab-engine-"));
  fake.rows = [ROW];
  fake.adopt.mockReset();
  clearErrors();
});

test("a refused adopt is remembered — asked once, reported until a human clears it", async () => {
  fake.adopt.mockResolvedValue({ reason: "the transfer carries no .pgn" });

  await tick();
  await tick();
  expect(fake.adopt).toHaveBeenCalledTimes(1);
  // The reason survives the second tick, which wiped the per-pass error list.
  expect((await autopilotStatus()).error).toContain("the transfer carries no .pgn");

  clearErrors();
  await tick();
  expect(fake.adopt).toHaveBeenCalledTimes(2);
});

test("every refusal is kept, not just the last one", async () => {
  fake.rows = [ROW, { ...ROW, name: "2026-08-14-20-35-52" }];
  fake.adopt
    .mockResolvedValueOnce({ reason: "kein .pgn" })
    .mockResolvedValueOnce({ reason: "reference.pgn liegt schon da" });

  await tick();
  const { error } = await autopilotStatus();
  expect(error).toContain("kein .pgn");
  expect(error).toContain("reference.pgn liegt schon da");
});

test("an adopt that works is not remembered at all", async () => {
  fake.adopt.mockResolvedValue({ adopted: "game.pgn" });
  await tick();
  expect((await autopilotStatus()).error).toBeNull();
});

// Pause stops heavy compute; copying the PGN the phone wrote for this is neither heavy nor a step.
test("a paused autopilot still adopts, because the reference is not a machine step", async () => {
  const { setPaused } = await import("@/lib/autopilot-state");
  await setPaused(true);
  fake.adopt.mockResolvedValue({ adopted: "game.pgn" });
  await tick();
  expect(fake.adopt).toHaveBeenCalledTimes(1);
  expect((await autopilotStatus()).paused).toBe(true);
});
