/**
 * `EPERM` heisst: den Prozess gibt es, er gehoert nur jemand anderem. Wer das als tot liest,
 * erklaert den Riegel eines FREMDEN Laufs fuer verwaist, raeumt ihn weg und setzt den zweiten
 * SAM-Worker auf dieselbe GPU. Die Mutation (`EPERM` -> tot) liess die Suite gruen.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

let dir: string;
const FOREIGN = 4242;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "lock-eperm-"));
  vi.resetModules();
  vi.doMock("@/lib/ingest", () => ({ inboxDir: () => dir }));
  vi.spyOn(process, "kill").mockImplementation(((pid: number) => {
    if (pid !== FOREIGN) throw Object.assign(new Error("ESRCH"), { code: "ESRCH" });
    throw Object.assign(new Error("EPERM"), { code: "EPERM" });
  }) as typeof process.kill);
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.doUnmock("@/lib/ingest");
  await rm(dir, { recursive: true, force: true });
});

test("ein Prozess eines anderen Nutzers haelt den Slot", async () => {
  const { alive, stale } = await import("@/lib/heavy-lock");

  expect(alive(FOREIGN)).toBe(true);
  expect(stale({ pid: 1, childPid: FOREIGN, job: "matte", name: "g", startedAt: "" })).toBe(false);
});

test("der fremde Riegel wird nicht weggeraeumt, der Slot bleibt zu", async () => {
  const { claimHeavyLock, readHeavyLock } = await import("@/lib/heavy-lock");
  const { writeFileSync } = await import("node:fs");
  const held = { pid: FOREIGN, job: "matte", name: "rec-1", startedAt: "2026-09-21T00:00:00Z" };
  writeFileSync(path.join(dir, "heavy.lock"), JSON.stringify(held), "utf8");

  const got = await claimHeavyLock("matte", "rec-2");

  expect(got, "der laufende SAM-Worker wurde verdraengt").toEqual({ foreign: held });
  expect((await readHeavyLock())?.name).toBe("rec-1");
});
