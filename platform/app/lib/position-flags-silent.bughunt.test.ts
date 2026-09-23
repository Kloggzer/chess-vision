/** `position-flags` legt am Ende von `model-read` die Strittig-Karten; sein Exit-Code fiel auf den Boden. */
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const fake = vi.hoisted(() => ({ calls: [] as string[][], code: (() => 0) as (args: string[]) => number }));

vi.mock("node:child_process", async (original) => ({
  ...(await original<typeof import("node:child_process")>()),
  spawn: (_bin: string, args: string[]) => {
    fake.calls.push(args);
    const child = new EventEmitter() as EventEmitter & Record<string, unknown>;
    child.pid = process.pid;
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    setTimeout(() => {
      (child.stdout as PassThrough).end();
      (child.stderr as PassThrough).end();
      child.emit("close", fake.code(args));
    }, 0);
    return child;
  },
}));

const { enqueueChain } = await import("@/lib/chain/jobs");
const { jobHistory } = await import("@/lib/chain/ledger");
const { whenIdle } = await import("@/lib/chain/slot");

beforeEach(async () => {
  await tempDataRoot("position-flags");
  fake.calls = [];
});

test("ein gescheitertes position-flags steht im Ledger, statt still durchzugehen", async () => {
  fake.code = (args) => (args.includes("position-flags") ? 3 : 0);

  await enqueueChain("2026-09-20-10-00-00", "model-read");
  await whenIdle();

  expect(fake.calls.some((a) => a.includes("position-flags"))).toBe(true);
  // Suchen statt die neueste nehmen: der naechste Schritt stand je nach Last schon obenauf (Flackern).
  const rows = await jobHistory("2026-09-20-10-00-00");
  const read = rows.find((r) => r.kind === "model-read");
  // Der Schritt ist gelungen, nur die Karten fehlen: `done` mit Grund, nicht rot.
  expect(read?.state).toBe("done");
  expect(read?.reason).toMatch(/position-flags/);
});

test("ein gelungenes position-flags haengt der Sprosse keinen Grund an", async () => {
  fake.code = () => 0;

  await enqueueChain("2026-09-20-11-00-00", "model-read");
  await whenIdle();

  const [last] = await jobHistory("2026-09-20-11-00-00");
  expect(last.state).toBe("done");
  expect(last.reason).toBeUndefined();
});
