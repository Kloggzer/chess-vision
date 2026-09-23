/** The lock has to name the JOB, or the server's own pid holds it forever. Disk, not mock — the point is file semantics. */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  alive,
  claimHeavyLock,
  heavyLockPath,
  readHeavyLock,
  releaseHeavyLock,
  stale,
  stampHeavyLockChild,
} from "@/lib/chain/heavy-lock";
import { tempDataRoot } from "@/lib/test-fixtures";

let dir: string;

beforeEach(async () => {
  await tempDataRoot("lock");
  dir = path.dirname(heavyLockPath());
  await mkdir(dir, { recursive: true });
});

/** A pid nothing can be running under — `alive` has to say no without guessing. */
const DEAD = 2 ** 22 - 1;

test("a lock whose job died is stale, even while the claimer lives", () => {
  const server = process.pid;

  expect(stale({ pid: server, childPid: 2 ** 30, job: "export", name: "g", startedAt: "" })).toBe(true);
  expect(stale({ pid: server, job: "export", name: "g", startedAt: "" })).toBe(false);
});

test("the child pid is stamped into our own lock", async () => {
  await claimHeavyLock("export", "g");

  await stampHeavyLockChild(4242);

  expect((await readHeavyLock())?.childPid).toBe(4242);
  expect(JSON.parse(await readFile(heavyLockPath(), "utf8")).job).toBe("export");
});

test("a foreign lock is never stamped — it is not ours to rewrite", async () => {
  const foreign = { pid: process.pid + 1, job: "train", name: "xval-80", startedAt: "" };
  await writeFile(heavyLockPath(), JSON.stringify(foreign), "utf8");

  await stampHeavyLockChild(99);

  expect((await readHeavyLock())?.childPid).toBeUndefined();
});

test("a running training holds the slot against the Autopilot", async () => {
  // The shape `training/train.py` writes — one file, one format, both sides. `ppid` is a pid that
  // is alive and is NOT us, which is exactly what a foreign holder looks like.
  const training = { pid: process.ppid, childPid: process.ppid, job: "train", name: "xval-80", startedAt: "" };
  await writeFile(heavyLockPath(), JSON.stringify(training), "utf8");

  const claim = await claimHeavyLock("export", "g");

  expect("foreign" in claim).toBe(true);
  expect("foreign" in claim && claim.foreign.job).toBe("train");
});

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

// Pythons `locks._claim` legt die Datei per `O_EXCL` LEER an; unlesbar galt als verwaist (drei SAM-Worker, 2026-08-19).
describe.each([
  ["die leer angelegte Datei im O_EXCL-Fenster", ""],
  ["eine halb geschriebene Zeile", '{"pid": 4242, "job": "ma'],
  ["etwas, das kein Lock-Objekt ist", "[1, 2, 3]"],
])("%s", (_what, content) => {
  test("haelt den Slot und wird nicht weggeraeumt", async () => {
    await writeFile(heavyLockPath(), content, "utf8");

    const claim = await claimHeavyLock("matte", "meine-partie");

    expect("held" in claim).toBe(false);
    // Der Grund gehoert in die Absage: ohne ihn steht der Nutzer vor einem 409 ohne Datei-Namen.
    expect("blocked" in claim && claim.blocked).toContain("heavy.lock");
    expect(await readFile(heavyLockPath(), "utf8")).toBe(content);
  });

  test("release raeumt nur weg, was es zuordnen kann", async () => {
    await writeFile(heavyLockPath(), content, "utf8");
    await releaseHeavyLock();
    expect(existsSync(heavyLockPath())).toBe(true);
  });
});

// `EPERM` heisst: den Prozess gibt es, er gehoert nur jemand anderem. Die Mutation liess die Suite gruen.
describe("EPERM", () => {
  const FOREIGN = 4242;

  beforeEach(() => {
    vi.spyOn(process, "kill").mockImplementation(((pid: number) => {
      if (pid !== FOREIGN) throw Object.assign(new Error("ESRCH"), { code: "ESRCH" });
      throw Object.assign(new Error("EPERM"), { code: "EPERM" });
    }) as typeof process.kill);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("ein Prozess eines anderen Nutzers haelt den Slot", () => {
    expect(alive(FOREIGN)).toBe(true);
    expect(stale({ pid: 1, childPid: FOREIGN, job: "matte", name: "g", startedAt: "" })).toBe(false);
  });

  test("der fremde Riegel wird nicht weggeraeumt, der Slot bleibt zu", async () => {
    const held = { pid: FOREIGN, job: "matte", name: "rec-1", startedAt: "2026-09-21T00:00:00Z" };
    await writeFile(heavyLockPath(), JSON.stringify(held), "utf8");

    const got = await claimHeavyLock("matte", "rec-2");

    expect(got, "der laufende SAM-Worker wurde verdraengt").toEqual({ foreign: held });
    expect((await readHeavyLock())?.name).toBe("rec-1");
  });
});

// Scheitert das zweite `wx` an EEXIST und ist die Datei danach weg, meldete der Claim `{held}` ohne Sperrdatei.
describe("die Sperrdatei verschwindet zwischen zwei Versuchen", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/lib/ingest/ingest", () => ({ inboxDir: () => dir }));
    vi.doMock("node:fs", async (original) => {
      const real = await original<typeof import("node:fs")>();
      const gone = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      const taken = Object.assign(new Error("EEXIST"), { code: "EEXIST" });
      return { ...real, default: real, writeFileSync: () => { throw taken; }, readFileSync: () => { throw gone; } };
    });
  });

  afterEach(() => {
    vi.doUnmock("node:fs");
    vi.doUnmock("@/lib/ingest/ingest");
    vi.resetModules();
  });

  test("kein {held} ohne Sperrdatei", async () => {
    const { claimHeavyLock: claim } = await import("@/lib/chain/heavy-lock");

    const result = await claim("matte", "g");

    expect("held" in result).toBe(false);
    expect("blocked" in result).toBe(true);
  });
});
