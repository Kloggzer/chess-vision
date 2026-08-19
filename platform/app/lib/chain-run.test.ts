// The single door every press goes through — one heavy job at a time is the rule it enforces.
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import type { ChainState } from "@/lib/chain";
import type { Job } from "@/lib/jobs";

const fake = vi.hoisted(() => ({ running: vi.fn(), enqueue: vi.fn(), state: {} as ChainState }));

vi.mock("@/lib/chain", () => ({ chainState: async () => fake.state }));
vi.mock("@/lib/jobs", () => ({
  runningJob: fake.running,
  enqueueChain: fake.enqueue,
  enqueueLabel: fake.enqueue,
  modelReadRun: () => "data/runs/other",
}));

const { refused, startStep } = await import("@/lib/chain-run");

const MATTE: ChainState = {
  step: "matte",
  video: "files/sessions/x/video.mp4",
  videoBroken: null,
  offeredPgn: null,
  hasReference: true,
  hasCandidate: true,
  confirmed: true,
  hasSession: true,
  mattes: { done: 0, total: 394, target: 80 },
  hasModelReads: false,
  useless: null,
};

const RUNNING: Job = { name: "2026-08-14-14-32-33", kind: "matte", state: "running", queuedAt: "2026-08-19T06:00:00Z" };

beforeEach(async () => {
  process.env.CHESSLAB_DATA_DIR = await mkdtemp(path.join(tmpdir(), "chesslab-door-"));
  fake.state = MATTE;
  fake.running.mockReset().mockReturnValue(null);
  fake.enqueue.mockReset().mockResolvedValue({ name: "x", kind: "matte", state: "queued", queuedAt: "" });
});

test("a second press is refused while a job runs — never queued behind it", async () => {
  fake.running.mockReturnValue(RUNNING);

  const result = await startStep("VID_20260726_233432", "matte");

  expect(refused(result) && result.status).toBe(409);
  expect(refused(result) && result.error).toContain("2026-08-14-14-32-33");
  expect(fake.enqueue).not.toHaveBeenCalled();
});

test("with the slot free the step is enqueued as before", async () => {
  await startStep("VID_20260726_233432", "matte");

  expect(fake.enqueue).toHaveBeenCalledWith("VID_20260726_233432", "matte");
});
