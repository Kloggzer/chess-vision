/** The lock has to name the JOB, or the server's own pid holds it forever. */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "lock-"));
  vi.resetModules();
  vi.doMock("@/lib/ingest", () => ({ inboxDir: () => dir }));
});

afterEach(async () => {
  vi.doUnmock("@/lib/ingest");
  await rm(dir, { recursive: true, force: true });
});

const load = () => import("@/lib/autopilot-state");

test("a lock whose job died is stale, even while the claimer lives", async () => {
  const { stale } = await load();
  const server = process.pid;

  expect(stale({ pid: server, childPid: 2 ** 30, job: "export", name: "g", startedAt: "" })).toBe(true);
  expect(stale({ pid: server, job: "export", name: "g", startedAt: "" })).toBe(false);
});

test("the child pid is stamped into our own lock", async () => {
  const { claimHeavyLock, stampHeavyLockChild, heavyLockPath, readHeavyLock } = await load();
  await claimHeavyLock("export", "g");

  await stampHeavyLockChild(4242);

  expect((await readHeavyLock())?.childPid).toBe(4242);
  expect(JSON.parse(await readFile(heavyLockPath(), "utf8")).job).toBe("export");
});

test("a foreign lock is never stamped — it is not ours to rewrite", async () => {
  const { stampHeavyLockChild, heavyLockPath, readHeavyLock } = await load();
  const foreign = { pid: process.pid + 1, job: "train", name: "xval-80", startedAt: "" };
  await writeFile(heavyLockPath(), JSON.stringify(foreign), "utf8");

  await stampHeavyLockChild(99);

  expect((await readHeavyLock())?.childPid).toBeUndefined();
});

test("a running training holds the slot against the Autopilot", async () => {
  const { claimHeavyLock, heavyLockPath } = await load();
  // The shape `training/train.py` writes — one file, one format, both sides. `ppid` is a pid that
  // is alive and is NOT us, which is exactly what a foreign holder looks like.
  const training = { pid: process.ppid, childPid: process.ppid, job: "train", name: "xval-80", startedAt: "" };
  await writeFile(heavyLockPath(), JSON.stringify(training), "utf8");

  const claim = await claimHeavyLock("export", "g");

  expect("foreign" in claim).toBe(true);
  expect("foreign" in claim && claim.foreign.job).toBe("train");
});
