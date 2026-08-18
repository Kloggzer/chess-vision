// Test against disk, not mock — the whole point is file semantics.
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import {
  claimHeavyLock,
  heavyLockPath,
  isPaused,
  readHeavyLock,
  releaseHeavyLock,
  setPaused,
  stale,
} from "@/lib/autopilot-state";

beforeEach(async () => {
  process.env.CHESSLAB_DATA_DIR = await mkdtemp(path.join(tmpdir(), "chesslab-lock-"));
  await mkdir(path.dirname(heavyLockPath()), { recursive: true });
});

/** A pid nothing can be running under — `alive` has to say no without guessing. */
const DEAD = 2 ** 22 - 1;

test("the claim creates the file and names this process", async () => {
  const lock = await claimHeavyLock("export", "2026-08-14-09-23-19");
  expect(lock).toMatchObject({ held: { pid: process.pid, job: "export", name: "2026-08-14-09-23-19" } });
  expect(await readHeavyLock()).toMatchObject({ pid: process.pid });
});

test("a foreign LIVE lock refuses the claim and is left untouched", async () => {
  // `process.ppid` is a process that exists and is not us — the exact case the lock is for.
  const foreign = { pid: process.ppid, job: "label", name: "andere-partie", startedAt: "2026-08-15T00:00:00Z" };
  await writeFile(heavyLockPath(), JSON.stringify(foreign), "utf8");

  expect(await claimHeavyLock("export", "meine-partie")).toEqual({ foreign });
  expect(JSON.parse(await readFile(heavyLockPath(), "utf8"))).toEqual(foreign);
});

test("a stale lock is taken over — a killed replay must not block the queue forever", async () => {
  const dead = { pid: DEAD, job: "label", name: "abgeschossen", startedAt: "2026-08-15T00:00:00Z" };
  await writeFile(heavyLockPath(), JSON.stringify(dead), "utf8");
  expect(stale(dead)).toBe(true);

  expect(await claimHeavyLock("model-read", "meine-partie")).toMatchObject({ held: { pid: process.pid, job: "model-read" } });
  expect(await readHeavyLock()).toMatchObject({ pid: process.pid, name: "meine-partie" });
});

test("our own lock is held, not re-stamped: the slot is serialized", async () => {
  const first = await claimHeavyLock("label", "erste");
  const second = await claimHeavyLock("export", "zweite");
  expect(second).toEqual(first); // same row, same startedAt — nothing about the holder changed
});

test("release removes OUR lock and never a foreign one", async () => {
  await claimHeavyLock("export", "meine-partie");
  await releaseHeavyLock();
  expect(existsSync(heavyLockPath())).toBe(false);

  const foreign = { pid: process.ppid, job: "label", name: "andere", startedAt: "2026-08-15T00:00:00Z" };
  await writeFile(heavyLockPath(), JSON.stringify(foreign), "utf8");
  await releaseHeavyLock();
  expect(existsSync(heavyLockPath())).toBe(true);
});

test("the pause outlives the process that set it — it is a file, not a flag", async () => {
  expect(await isPaused()).toBe(false);
  await setPaused(true);
  // "Restart": nothing in memory is reused, the next process reads the same directory.
  expect(await isPaused()).toBe(true);
  await setPaused(false);
  expect(await isPaused()).toBe(false);
});
