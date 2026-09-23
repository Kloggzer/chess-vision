/**
 * Der Rueckfall-Replay unter `ingest/` prueft bewusst KEIN Token — der Browser drueckt ihn, nicht das
 * Handy — nimmt aber seit 2026-09-21 den Heavy-Lock, wie der Re-Export von `api/zuege`.
 */
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const lock = vi.hoisted(() => ({ result: null as unknown }));
vi.mock("@/lib/chain/heavy-lock", async (original) => ({
  ...(await original<typeof import("@/lib/chain/heavy-lock")>()),
  claimHeavyLock: async (job: string, name: string) => lock.result ?? { held: { pid: process.pid, job, name, startedAt: "" } },
  releaseHeavyLock: async () => undefined,
}));

const jobs = vi.hoisted(() => ({ calls: [] as string[], fail: null as string | null }));
vi.mock("@/lib/chain/jobs", async (original) => ({
  ...(await original<typeof import("@/lib/chain/jobs")>()),
  enqueueChain: async (name: string, step: string) => {
    jobs.calls.push(`${name}|${step}`);
    return { name, kind: step, state: "queued", queuedAt: "" };
  },
  enqueueLabel: async (name: string) => {
    if (jobs.fail !== null) throw new Error(jobs.fail);
    jobs.calls.push(`${name}|label`);
    return { name, kind: "label", state: "queued", queuedAt: "" };
  },
}));

const { POST } = await import("@/app/api/ingest/session/[name]/label/route");
const { POST: zuegePost } = await import("@/app/api/zuege/[name]/route");

beforeEach(async () => {
  await tempDataRoot("route-ingest-label");
  lock.result = null;
  jobs.calls = [];
  jobs.fail = null;
});

const ctx = (name: string) =>
  ({ params: Promise.resolve({ name }) }) as unknown as Parameters<typeof POST>[1];

test("202, nicht 200: der Auftrag ist eingereiht, nicht erledigt", async () => {
  const res = await POST(new Request("http://x", { method: "POST" }), ctx("2026-08-13-12-10-55"));

  expect(res.status).toBe(202);
  expect(jobs.calls).toEqual(["2026-08-13-12-10-55|label"]);
});

test("eine Absage der Warteschlange kommt als 400 mit Grund, nicht als nackte 500", async () => {
  jobs.fail = "kein Video in dieser Aufnahme";
  const res = await POST(new Request("http://x", { method: "POST" }), ctx("2026-08-13-12-10-55"));

  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ error: "Error: kein Video in dieser Aufnahme" });
});

// Ohne Riegel startete der Knopf auf `/transfers` eine 6-GB-JVM neben einem laufenden Python-Lauf.
test("api/ingest label: ein fremder Halter haelt den Ersatz-Replay auf", async () => {
  lock.result = { foreign: { pid: process.pid + 1, job: "train", name: "xval-80", startedAt: "" } };

  const answer = await POST(new Request("http://h/x", { method: "POST" }), ctx("g"));

  expect(jobs.calls).toEqual([]);
  expect(answer.status).toBe(409);
});

// `reexport` pruefte nur `"foreign" in lock`; eine unlesbare `heavy.lock` (`{blocked}`) fiel durch.
test("api/zuege reexport: eine blockierte heavy.lock haelt den Re-Export auf", async () => {
  lock.result = { blocked: "heavy.lock ist da, aber nicht deutbar" };

  const answer = await zuegePost(
    new Request("http://h/api/zuege/g", { method: "POST", body: JSON.stringify({ action: "reexport" }) }),
    ctx("g") as never,
  );

  expect(jobs.calls).toEqual([]);
  expect(answer.status).toBe(409);
});
