/**
 * Ein Drain, der der KETTE folgt statt einer Sprosse — bis zum naechsten Menschen-Tor.
 *
 * Sieben der neun Sprossen sind Jobs; verkettet war bisher nichts: ein Druck zog EINE Sprosse
 * ueber den Korpus und hoerte auf. Nach "Export" drueckte niemand "Messen". `confirm` und
 * `labeln` sind Seiten, keine Jobs — dort haelt der Drain an, und das ist Absicht: auf der
 * Bestaetigung ruht jedes Label danach, und das PGN des Handys ist kein unabhaengiger Zeuge.
 */
import { beforeEach, expect, test, vi } from "vitest";
import type { ChainState } from "@/lib/chain";
import type { QueueRow } from "@/lib/queues";
import { tempDataRoot } from "@/lib/test-fixtures";

const fake = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(), rows: [] as unknown[] }));

vi.mock("@/lib/chain-run", async (original) => ({
  ...(await original<typeof import("@/lib/chain-run")>()),
  startStep: fake.start,
}));
vi.mock("@/lib/jobs", async (original) => ({
  ...(await original<typeof import("@/lib/jobs")>()),
  stopRunning: fake.stop,
}));
vi.mock("@/lib/queues", async (original) => ({
  ...(await original<typeof import("@/lib/queues")>()),
  queueRows: async () => fake.rows,
}));

const { drainStatus, startDrain } = await import("@/lib/drain");

const CHAIN: ChainState = {
  step: "matte",
  video: "files/sessions/x/video.mp4",
  videoBroken: null,
  offeredPgn: null,
  hasReference: true,
  hasPhoneRecord: false,
  hasCandidate: true,
  confirmed: true,
  hasSession: true,
  mattes: { done: 0, total: 394, target: 80, reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 },
  hasSettle: true,
  outdated: {},
  reason: "",
  hasTemporalPass: false,
  hasModelReads: false,
  useless: null,
};

const row = (name: string, step: ChainState["step"]): QueueRow => ({
  name, title: null, plies: 0, frames: 0, archived: false, chain: { ...CHAIN, step },
});

const job = (name: string) => ({ name, kind: "matte", state: "queued", queuedAt: "2026-08-18T00:00:00Z" });
const idle = () => vi.waitFor(async () => expect((await drainStatus()).drain).toBeNull());

beforeEach(async () => {
  await tempDataRoot("drain-chain");
  (globalThis as { __chesslabDrain?: { snapshot: unknown } }).__chesslabDrain!.snapshot = null;
  fake.rows = [];
  fake.start.mockReset();
  fake.start.mockImplementation((name: string) => job(name));
  fake.stop.mockReset();
  fake.stop.mockResolvedValue({ error: "kein Prozess läuft" });
});

test("ein Druck zieht jede Aufnahme auf ihrer eigenen Sprosse weiter", async () => {
  fake.rows = [row("2026-08-14-09-23-19", "export"), row("VID_20260726_233432", "settle-scan"),
               row("2026-08-16-20-19-54", "model-read")];

  await startDrain("chain");
  await idle();

  expect(fake.start.mock.calls.map((c) => [c[0], c[1]])).toEqual([
    ["2026-08-14-09-23-19", "export"],
    ["VID_20260726_233432", "settle-scan"],
    ["2026-08-16-20-19-54", "model-read"],
  ]);
});

test("an einem Menschen-Tor haelt er an", async () => {
  // `confirm` und `labeln` sind Seiten. Ein Drain, der sie ueberspringt, wuerde Bretter
  // schneiden, die niemand bestaetigt hat.
  fake.rows = [row("2026-08-14-09-23-19", "confirm"), row("VID_20260726_233432", "labeln")];

  const first = await startDrain("chain");

  expect(first).toEqual({ error: "nichts wartet auf diesen Schritt" });
  expect(fake.start).not.toHaveBeenCalled();
});

test("die Kette buendelt das Matten weiterhin", async () => {
  fake.rows = [row("2026-08-14-09-23-19", "matte"), row("VID_20260726_233432", "matte")];

  await startDrain("chain");
  await idle();

  expect(fake.start.mock.calls.length).toBe(1);
  expect(fake.start.mock.calls[0][3]).toEqual(["2026-08-14-09-23-19"]);
});
