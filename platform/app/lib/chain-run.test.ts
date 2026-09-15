// The single door every press goes through — one heavy job at a time is the rule it enforces.
import { beforeEach, expect, test, vi } from "vitest";
import type { ChainState } from "@/lib/chain";
import type { Job } from "@/lib/jobs";
import { tempDataRoot } from "@/lib/test-fixtures";

const fake = vi.hoisted(() => ({ running: vi.fn(), enqueue: vi.fn(), phone: vi.fn(), state: {} as ChainState }));

vi.mock("@/lib/chain", () => ({ chainState: async () => fake.state }));
vi.mock("@/lib/jobs", () => ({
  runningJob: fake.running,
  enqueueChain: fake.enqueue,
  enqueueLabel: fake.enqueue,
  enqueuePhoneRecord: fake.phone,
  modelReadRun: () => "data/runs/other",
}));

const { refused, startStep } = await import("@/lib/chain-run");
const { readHeavyLock } = await import("@/lib/heavy-lock");

const MATTE: ChainState = {
  step: "matte",
  video: "files/sessions/x/video.mp4",
  videoBroken: null,
  offeredPgn: null,
  hasReference: true,
  hasPhoneRecord: false,
  hasCandidate: true,
  confirmed: true,
  hasSession: true,
  mattes: { done: 0, total: 394, target: 80 , reported: 0, reportedOpen: 0, reportedOrphan: 0 },
  hasSettle: true,
  outdated: {},
  reason: "",
  hasTemporalPass: false,
  hasModelReads: false,
  useless: null,
};

const RUNNING: Job = { name: "2026-08-14-14-32-33", kind: "matte", state: "running", queuedAt: "2026-08-19T06:00:00Z" };

beforeEach(async () => {
  await tempDataRoot("door");
  fake.state = MATTE;
  fake.running.mockReset().mockReturnValue(null);
  fake.enqueue.mockReset().mockResolvedValue({ name: "x", kind: "matte", state: "queued", queuedAt: "" });
  fake.phone.mockReset().mockResolvedValue({ name: "x", kind: "phone-record", state: "queued", queuedAt: "" });
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

  expect(fake.enqueue).toHaveBeenCalledWith("VID_20260726_233432", "matte", []);
});

test("label is admitted while the disk says phone-record, and claims the lock as label", async () => {
  fake.state = { ...MATTE, step: "phone-record", hasPhoneRecord: true, hasCandidate: false, confirmed: false, hasSession: false };

  const result = await startStep("VID_20260726_233432", "label");

  expect(refused(result)).toBe(false);
  expect(fake.enqueue).toHaveBeenCalledWith("VID_20260726_233432", undefined);
  expect(fake.phone).not.toHaveBeenCalled();
  expect((await readHeavyLock())?.job).toBe("label");
});
