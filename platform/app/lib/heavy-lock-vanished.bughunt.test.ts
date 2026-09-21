/**
 * `claimHeavyLock` meldete `{held}`, wenn das zweite `wx` an EEXIST scheitert und die Datei
 * danach weg ist: der Anrufer faehrt dann einen schweren Lauf OHNE Sperrdatei, und der naechste
 * Halter bekommt sie per `O_EXCL` sofort — genau die zwei Laeufe, die die Sperre verhindert.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "lock-race-"));
  vi.resetModules();
  vi.doMock("@/lib/ingest", () => ({ inboxDir: () => dir }));
  vi.doMock("node:fs", async (original) => {
    const real = await original<typeof import("node:fs")>();
    const gone = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    const taken = Object.assign(new Error("EEXIST"), { code: "EEXIST" });
    return { ...real, default: real, writeFileSync: () => { throw taken; }, readFileSync: () => { throw gone; } };
  });
});

afterEach(async () => {
  vi.doUnmock("node:fs");
  vi.doUnmock("@/lib/ingest");
  vi.resetModules();
  await rm(dir, { recursive: true, force: true });
});

test("kein {held} ohne Sperrdatei", async () => {
  const { claimHeavyLock } = await import("@/lib/heavy-lock");

  const claim = await claimHeavyLock("matte", "g");

  expect("held" in claim).toBe(false);
  expect("blocked" in claim).toBe(true);
});
