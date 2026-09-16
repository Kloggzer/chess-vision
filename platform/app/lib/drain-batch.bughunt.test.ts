// Ein SAM-Ladevorgang statt einer je Aufnahme. Nichts hier tickt: jeder Job startet auf einen Druck.
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
  await tempDataRoot("drain-batch");
  (globalThis as { __chesslabDrain?: { snapshot: unknown } }).__chesslabDrain!.snapshot = null;
  fake.rows = [];
  fake.start.mockReset();
  fake.start.mockImplementation((name: string) => job(name));
  fake.stop.mockReset();
  fake.stop.mockResolvedValue({ error: "kein Prozess läuft" });
});

test("Matten laeuft als EIN Job ueber alle wartenden Aufnahmen", async () => {
  // SAM zu laden kostet 7-9 min, die Arbeit danach Sekunden je Frame (gemessen 2026-09-15).
  // Eine Aufnahme nach der anderen zu starten zahlt den Ladevorgang je Aufnahme.
  fake.rows = [row("2026-08-14-09-23-19", "matte"), row("VID_20260726_233432", "matte"),
               row("2026-08-16-20-19-54", "matte")];

  await startDrain("matte");
  await idle();

  expect(fake.start.mock.calls.length, "ein Druck, ein Prozess").toBe(1);
  const [name, step, , also] = fake.start.mock.calls[0];
  expect([name, step]).toEqual(["VID_20260726_233432", "matte"]);
  expect(also, "die uebrigen reisen im selben Prozess mit")
    .toEqual(["2026-08-14-09-23-19", "2026-08-16-20-19-54"]);
});

test("jeder andere Schritt bleibt eine Aufnahme nach der anderen", async () => {
  // Nur SAM traegt diesen Ladeaufwand. Ein Export je Aufnahme ist richtig so — er haelt den
  // Heavy-Slot kuerzer, und Stopp trifft dann genau eine Aufnahme.
  fake.rows = [row("2026-08-14-09-23-19", "export"), row("VID_20260726_233432", "export")];

  await startDrain("export");
  await idle();

  expect(fake.start.mock.calls.map((c) => [c[0], c[1], c[3]])).toEqual([
    ["VID_20260726_233432", "export", []],
    ["2026-08-14-09-23-19", "export", []],
  ]);
});


const reportedRow = (name: string, open: number): QueueRow => ({
  ...row(name, "matte"),
  chain: { ...CHAIN, step: "matte", mattes: { ...CHAIN.mattes, reported: open, reportedOpen: open } },
});

test("gemeldete und Stapel-Aufnahmen reisen nicht im selben Prozess", async () => {
  // `runChesslab` waehlt `--reported` ODER `--limit` einmal fuer den Prozess. Beide Sorten
  // zusammen hiesse: die eine Haelfte wird uebersprungen, ohne dass es jemand sieht.
  fake.rows = [reportedRow("2026-08-14-09-23-19", 3), row("VID_20260726_233432", "matte"),
               reportedRow("2026-08-16-20-19-54", 7)];

  await startDrain("matte");
  await idle();

  const first = fake.start.mock.calls[0];
  expect([first[0], first[3]]).toEqual(["VID_20260726_233432", []]);
  const second = fake.start.mock.calls[1];
  expect([second[0], second[3]]).toEqual(["2026-08-14-09-23-19", ["2026-08-16-20-19-54"]]);
});
