import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { beforeEach, expect, test, vi } from "vitest";
import type { Job } from "@/lib/chain/slot";
import { tempDataRoot } from "@/lib/test-fixtures";

const fake = vi.hoisted(() => ({
  records: [] as { state: string; reason?: string }[],
  ends: [] as string[],
  spawn: vi.fn(),
  verify: vi.fn(),
}));

vi.mock("@/lib/chain/ledger", async (original) => ({
  ...(await original<typeof import("@/lib/chain/ledger")>()),
  record: async (job: { state: string; reason?: string }) => void fake.records.push(job),
}));
vi.mock("@/lib/chain/spawn", async (original) => ({
  ...(await original<typeof import("@/lib/chain/spawn")>()),
  spawnTool: fake.spawn,
}));
vi.mock("@/lib/chain/job-log", async (original) => ({
  ...(await original<typeof import("@/lib/chain/job-log")>()),
  logSink: () => ({ stream: new PassThrough(), end: (text: string) => void fake.ends.push(text) }),
}));
vi.mock("@/lib/chain/pack", async (original) => ({
  ...(await original<typeof import("@/lib/chain/pack")>()),
  packInputs: async () => ({ video: "v.mp4", game: "g.json" }),
  verifyPack: fake.verify,
}));
vi.mock("@/lib/measurement", async (original) => ({
  ...(await original<typeof import("@/lib/measurement")>()),
  exists: async () => true,
}));

const { guard, runChesslab, runPack } = await import("@/lib/chain/runners");

const NAME = "2026-08-14-09-23-19";
const job: Job = { name: NAME, state: "queued", queuedAt: "2026-09-26T00:00:00Z" };

function exitsZero() {
  const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough(), pid: undefined });
  setImmediate(() => child.emit("close", 0));
  return child;
}

beforeEach(async () => {
  await tempDataRoot("runners");
  fake.records = [];
  fake.ends = [];
  fake.spawn.mockReset();
  fake.verify.mockReset();
});

test.each([
  ["a plain string", "platte weg", "platte weg"],
  ["an Error", new Error("boom"), "boom"],
])("guard names what %s says", async (_what, thrown, said) => {
  await guard(job, () => Promise.reject(thrown));
  expect(fake.records.at(-1)).toMatchObject({ state: "failed", reason: `the job threw before it could report: ${said}` });
});

test("a spawn that throws a non-Error still says what it threw", async () => {
  fake.spawn.mockImplementation(() => {
    throw "kein uv";
  });
  await runChesslab(job, "export");
  expect(fake.ends).toContain("\nspawn threw: kein uv\n");
});

test("the appended position-flags spawn says what it threw", async () => {
  fake.spawn.mockImplementationOnce(exitsZero).mockImplementationOnce(() => {
    throw "kein uv";
  });
  await runChesslab(job, "model-read");
  expect(fake.ends).toContain("\nspawn threw: kein uv\n");
  expect(fake.records.at(-1)?.reason).toMatch(/position-flags" endete mit -1/);
});

test("a pack check rejecting with a string names it", async () => {
  fake.spawn.mockImplementation(exitsZero);
  fake.verify.mockRejectedValue("manifest fehlt");
  await runPack(job);
  expect(fake.records.at(-1)).toMatchObject({ state: "failed", reason: "unsafe or incomplete training pack: manifest fehlt" });
});
