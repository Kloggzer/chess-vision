// Nothing here ticks: every job in these tests starts because a press asked for it.
import { beforeEach, expect, test, vi } from "vitest";
import type { ChainState } from "@/lib/chain/chain";
import type { QueueRow } from "@/lib/chain/queues";
import { tempDataRoot } from "@/lib/test-fixtures";

const fake = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(), rows: [] as unknown[] }));

vi.mock("@/lib/chain/run", async (original) => ({
  ...(await original<typeof import("@/lib/chain/run")>()),
  startStep: fake.start,
}));
vi.mock("@/lib/chain/jobs", async (original) => ({
  ...(await original<typeof import("@/lib/chain/jobs")>()),
  stopRunning: fake.stop,
}));
vi.mock("@/lib/chain/queues", async (original) => ({
  ...(await original<typeof import("@/lib/chain/queues")>()),
  queueRows: async () => fake.rows,
}));

const { drainStatus, startDrain, stopDrain } = await import("@/lib/chain/drain");

/** Exported and matted — a recording sitting on one of the two steps no loop was ever allowed. */
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
  mattes: { done: 0, total: 394, target: 80 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 },
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
  await tempDataRoot("drain");
  // The 10 s snapshot is pinned on globalThis and would hand the next test this one's corpus.
  (globalThis as { __chesslabDrain?: { snapshot: unknown } }).__chesslabDrain!.snapshot = null;
  fake.rows = [];
  fake.start.mockReset();
  fake.start.mockImplementation((name: string) => job(name));
  fake.stop.mockReset();
  fake.stop.mockResolvedValue({ error: "kein Prozess läuft" });
});

// Auf `export`: das Matten faehrt als EIN Prozess (siehe unten).
test("a press drains the whole step, oldest recording first — and nothing else", async () => {
  fake.rows = [row("2026-08-14-09-23-19", "export"), row("VID_20260726_233432", "export"), row("2026-08-13-12-46-24", "model-read")];

  expect(await startDrain("export")).toEqual({ started: "VID_20260726_233432" });
  await idle();
  expect(fake.start.mock.calls.map((call: unknown[]) => [call[0], call[1]])).toEqual([
    ["VID_20260726_233432", "export"],
    ["2026-08-14-09-23-19", "export"],
  ]);
});

test("nothing starts without a press: reading the status starts no job", async () => {
  fake.rows = [row("2026-08-14-09-23-19", "matte")];

  const status = await drainStatus();

  expect(fake.start).not.toHaveBeenCalled();
  expect(status.waiting).toEqual({ "phone-record": 0, label: 0, export: 0, "settle-scan": 0, matte: 1, temporal: 0, "model-read": 0 });
  expect(status.drain).toBeNull();
});

// Not a pause: it kills.
test("Stopp kills the running process AND takes no further recording", async () => {
  fake.rows = [row("2026-08-14-09-23-19", "matte"), row("VID_20260726_233432", "matte")];
  fake.start.mockImplementationOnce(async (name: string) => {
    fake.stop.mockResolvedValue({ stopped: name });
    expect(await stopDrain()).toEqual({ stopped: name });
    return job(name);
  });

  expect(await startDrain("matte")).toEqual({ started: "VID_20260726_233432" });
  expect(fake.stop).toHaveBeenCalledTimes(1);
  await idle();
  expect(fake.start).toHaveBeenCalledTimes(1);
});

// A job a card started has no drain around it, and stop still has to reach it.
test("Stopp kills a job nobody drained, and says so when nothing runs", async () => {
  fake.stop.mockResolvedValue({ stopped: "2026-08-14-09-23-19" });
  expect(await stopDrain()).toEqual({ stopped: "2026-08-14-09-23-19" });

  fake.stop.mockResolvedValue({ error: "kein Prozess läuft" });
  expect(await stopDrain()).toEqual({ error: "kein Prozess läuft" });
});

// `model-read` without CHESSLAB_MODEL_READ_RUN is the refusal the button exists to show.
test("a refused step comes back to the press, and the drain ends there", async () => {
  fake.rows = [row("2026-08-14-09-23-19", "model-read"), row("VID_20260726_233432", "model-read")];
  fake.start.mockResolvedValue({ error: "kein Modell gewählt", state: CHAIN, status: 409 });

  expect(await startDrain("model-read")).toEqual({ error: "VID_20260726_233432: kein Modell gewählt" });
  expect(fake.start).toHaveBeenCalledTimes(1);
  expect((await drainStatus()).drain).toBeNull();
});

test("an empty step is not a drain — the press says nothing waits", async () => {
  expect(await startDrain("label")).toEqual({ error: "nichts wartet auf diesen Schritt" });
  expect(fake.start).not.toHaveBeenCalled();
});

test("one drain at a time — the second press is told which one is running", async () => {
  fake.rows = [row("2026-08-14-09-23-19", "matte")];
  let release: (job: unknown) => void = () => undefined;
  fake.start.mockImplementation(() => new Promise((resolve) => (release = resolve)));

  const first = startDrain("matte");
  await vi.waitFor(() => expect(fake.start).toHaveBeenCalled());
  expect(await startDrain("export")).toEqual({ error: expect.stringContaining("matte") });

  release(job("2026-08-14-09-23-19"));
  await first;
  await idle();
});

// SAM zu laden kostet 7-9 min, die Arbeit danach Sekunden je Frame.
test("Matten laeuft als EIN Job ueber alle wartenden Aufnahmen", async () => {
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

// Nur SAM traegt diesen Ladeaufwand; ein Export je Aufnahme haelt den Heavy-Slot kuerzer.
test("jeder andere Schritt bleibt eine Aufnahme nach der anderen", async () => {
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

// `runChesslab` waehlt `--reported` ODER `--limit` je Prozess; gemischt fiele eine Haelfte still weg.
test("gemeldete und Stapel-Aufnahmen reisen nicht im selben Prozess", async () => {
  fake.rows = [reportedRow("2026-08-14-09-23-19", 3), row("VID_20260726_233432", "matte"),
               reportedRow("2026-08-16-20-19-54", 7)];

  await startDrain("matte");
  await idle();

  const first = fake.start.mock.calls[0];
  expect([first[0], first[3]]).toEqual(["VID_20260726_233432", []]);
  const second = fake.start.mock.calls[1];
  expect([second[0], second[3]]).toEqual(["2026-08-14-09-23-19", ["2026-08-16-20-19-54"]]);
});

// Der Ketten-Drain folgt jeder Aufnahme bis zum naechsten Menschen-Tor (`confirm`, `labeln`).
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
  fake.rows = [row("2026-08-14-09-23-19", "confirm"), row("VID_20260726_233432", "labeln")];

  expect(await startDrain("chain")).toEqual({ error: "nichts wartet auf diesen Schritt" });
  expect(fake.start).not.toHaveBeenCalled();
});

test("die Kette buendelt das Matten weiterhin", async () => {
  fake.rows = [row("2026-08-14-09-23-19", "matte"), row("VID_20260726_233432", "matte")];

  await startDrain("chain");
  await idle();

  expect(fake.start.mock.calls.length).toBe(1);
  expect(fake.start.mock.calls[0][3]).toEqual(["2026-08-14-09-23-19"]);
});
