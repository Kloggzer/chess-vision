/**
 * Die letzte Route ohne Test: der ausdrueckliche Rueckfall fuer eine Aufnahme, die ohne
 * Partie-Aufzeichnung ankam. Sie liegt unter `ingest/`, prueft aber bewusst KEIN Token — der
 * Browser drueckt sie (`app/transfers/board.tsx`), nicht das Handy. Den Heavy-Lock nimmt sie
 * seit 2026-09-21 trotzdem — hier gemockt, gemessen in `chain-jobs-2026-09-21.bughunt.test.ts`.
 */
import { beforeEach, expect, test, vi } from "vitest";

const jobs = vi.hoisted(() => ({ names: [] as string[], fail: null as string | null }));
vi.mock("@/lib/jobs", () => ({
  enqueueLabel: async (name: string) => {
    if (jobs.fail !== null) throw new Error(jobs.fail);
    jobs.names.push(name);
    return { name, kind: "label", state: "queued" };
  },
}));

vi.mock("@/lib/heavy-lock", () => ({
  claimHeavyLock: async (job: string, name: string) => ({ held: { pid: process.pid, job, name, startedAt: "" } }),
  releaseHeavyLock: async () => undefined,
}));

const { POST } = await import("@/app/api/ingest/session/[name]/label/route");

beforeEach(() => {
  jobs.names = [];
  jobs.fail = null;
});

const ctx = (name: string) =>
  ({ params: Promise.resolve({ name }) }) as unknown as Parameters<typeof POST>[1];

test("202, nicht 200: der Auftrag ist eingereiht, nicht erledigt", async () => {
  const res = await POST(new Request("http://x", { method: "POST" }), ctx("2026-08-13-12-10-55"));

  expect(res.status).toBe(202);
  expect(jobs.names).toEqual(["2026-08-13-12-10-55"]);
});

test("eine Absage der Warteschlange kommt als 400 mit Grund, nicht als nackte 500", async () => {
  jobs.fail = "kein Video in dieser Aufnahme";
  const res = await POST(new Request("http://x", { method: "POST" }), ctx("2026-08-13-12-10-55"));

  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ error: "Error: kein Video in dieser Aufnahme" });
});
