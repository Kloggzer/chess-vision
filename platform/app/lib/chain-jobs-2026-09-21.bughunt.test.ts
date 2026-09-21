/**
 * Kettenlauf und Auftragsriegel, 2026-09-21. Jeder Test haengt an einer Stelle, an der ein
 * Erfolg gemeldet wurde, den der Server nicht hatte.
 */
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const lock = vi.hoisted(() => ({ result: null as unknown, claims: 0 }));
vi.mock("@/lib/heavy-lock", async (original) => ({
  ...(await original<typeof import("@/lib/heavy-lock")>()),
  claimHeavyLock: async (job: string, name: string) => {
    lock.claims += 1;
    return lock.result ?? { held: { pid: process.pid, job, name, startedAt: "" } };
  },
}));

const enqueued = vi.hoisted(() => ({ calls: [] as string[] }));
vi.mock("@/lib/jobs", async (original) => ({
  ...(await original<typeof import("@/lib/jobs")>()),
  enqueueChain: async (name: string, step: string) => {
    enqueued.calls.push(`${name}|${step}`);
    return { name, kind: step, state: "queued", queuedAt: "" };
  },
  enqueueLabel: async (name: string) => {
    enqueued.calls.push(`${name}|label`);
    return { name, kind: "label", state: "queued", queuedAt: "" };
  },
}));

const { POST: zuegePost } = await import("@/app/api/zuege/[name]/route");
const { POST: labelPost } = await import("@/app/api/ingest/session/[name]/label/route");

beforeEach(async () => {
  await tempDataRoot("chain-jobs-bughunt");
  lock.result = null;
  lock.claims = 0;
  enqueued.calls = [];
});

const params = <T>(value: T) => ({ params: Promise.resolve(value) });

/**
 * 1) `app/api/zuege/[name]/route.ts::reexport` prueft nur `"foreign" in lock`. Eine unlesbare
 * `heavy.lock` — das Fenster, in dem Pythons `locks._claim` sie gerade schreibt — kommt als
 * `{blocked}` zurueck und fiel durch: der Re-Export reihte sich neben einem laufenden Prozess ein.
 */
test("api/zuege reexport: eine blockierte heavy.lock haelt den Re-Export auf", async () => {
  lock.result = { blocked: "heavy.lock ist da, aber nicht deutbar" };

  const answer = await zuegePost(
    new Request("http://h/api/zuege/g", { method: "POST", body: JSON.stringify({ action: "reexport" }) }),
    params({ name: "g" }),
  );

  expect(enqueued.calls).toEqual([]);
  expect(answer.status).toBe(409);
});

/**
 * 2) `app/api/ingest/session/[name]/label/route.ts` reihte den Ersatz-Replay ein, ohne den
 * Heavy-Lock zu nehmen — der Knopf auf `/transfers` startete also eine 6-GB-JVM neben einem
 * laufenden Python-Lauf, was `chain-run.ts` an seiner eigenen Tuer ausdruecklich verhindert.
 */
test("api/ingest label: ein fremder Halter haelt den Ersatz-Replay auf", async () => {
  lock.result = { foreign: { pid: process.pid + 1, job: "train", name: "xval-80", startedAt: "" } };

  const answer = await labelPost(new Request("http://h/x", { method: "POST" }), params({ name: "g" }));

  expect(enqueued.calls).toEqual([]);
  expect(answer.status).toBe(409);
});
