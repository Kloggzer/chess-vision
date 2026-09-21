/**
 * Der schwere Riegel gehoert dem SLOT, nicht einem Job: er geht erst zurueck, wenn nichts mehr
 * wartet. Je Job zurueckgegeben gibt er die Maschine frei, waehrend der naechste Schritt derselben
 * Kette noch arbeitet — genau der Zustand, den er unmoeglich machen soll.
 */
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const seen = vi.hoisted(() => ({ at: [] as (string | null)[] }));
vi.mock("@/lib/heavy-lock", async (original) => {
  const real = await original<typeof import("@/lib/heavy-lock")>();
  return { ...real, releaseHeavyLock: async () => {
    // Erst HIER laden: im Fabrikschritt haengt der Ringschluss jobs -> heavy-lock -> jobs.
    const { runningJob } = await import("@/lib/jobs");
    seen.at.push(runningJob()?.name ?? null);
  } };
});

const { enqueueChain, whenIdle } = await import("@/lib/jobs");

beforeEach(async () => {
  await tempDataRoot("job-slot");
  process.env.CHESSLAB_UV = "chesslab-no-such-binary-2026-09-21.exe";
  seen.at.length = 0;
});

test("zwei Sprossen hintereinander geben den Riegel EINMAL zurueck, ganz am Ende", async () => {
  await enqueueChain("2026-09-21-12-00-00", "export");
  await enqueueChain("2026-09-21-12-30-00", "export");
  await whenIdle();

  expect(seen.at).toEqual([null]);
});
