import { describe, expect, it } from "vitest";
import { backlog, type BacklogInput } from "@/lib/chain/backlog";
import { nextStep } from "@/lib/chain/chain";
import type { ChainState } from "@/lib/chain/chain";
import type { Job } from "@/lib/chain/jobs";
import type { QueueRow } from "@/lib/chain/queues";

const CHAIN: ChainState = {
  step: "label",
  video: "files/sessions/x/video.mp4",
  videoBroken: null,
  offeredPgn: null,
  hasReference: true,
  hasPhoneRecord: false,
  hasCandidate: false,
  confirmed: false,
  hasSession: false,
  mattes: { done: 0, total: 0, target: 0 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 },
  hasSettle: true,
  outdated: {},
  reason: "",
  hasTemporalPass: false,
  hasModelReads: false,
  useless: null,
};

const row = (name: string, chain: Partial<ChainState> = {}, patch: Partial<QueueRow> = {}): QueueRow => ({
  name,
  title: null,
  plies: 0,
  frames: 0,
  archived: false,
  chain: { ...CHAIN, ...chain },
  ...patch,
});

const job = (name: string, kind: Job["kind"], state: Job["state"], reason?: string): Job => ({
  name,
  kind,
  state,
  reason,
  queuedAt: "2026-08-15T00:00:00Z",
});

/** The two views `jobs.ts` hands the pass, in ledger order — last row per name, per name|kind. */
const ledger = (...rows: Job[]): Pick<BacklogInput, "lastJobs" | "lastSteps"> => ({
  lastJobs: new Map(rows.map((row) => [row.name, row])),
  lastSteps: new Map(rows.map((row) => [`${row.name}|${row.kind}`, row])),
});

const run = (rows: QueueRow[], input: Partial<BacklogInput> = {}) =>
  backlog({ rows, lastJobs: new Map(), lastSteps: new Map(), ...input });

/** Nothing waits anywhere — the shape every "not my work" case has to have. */
const NONE = { "phone-record": [], label: [], export: [], "settle-scan": [], matte: [], temporal: [], "model-read": [] };

describe("backlog — what waits on which step", () => {
  it("takes the OLDEST recording, across both naming schemes", () => {
    const rows = [
      row("2026-08-14-20-35-52", { step: "export", hasCandidate: true, confirmed: true }),
      row("VID_20260726_233432", { step: "export", hasCandidate: true, confirmed: true }),
      row("2026-08-13-12-46-24", { step: "export", hasCandidate: true, confirmed: true }),
    ];
    expect(run(rows).waiting.export).toEqual([
      "VID_20260726_233432",
      "2026-08-13-12-46-24",
      "2026-08-14-20-35-52",
    ]);
  });

  it("counts every JOB step and no page — confirm and labeln are the screens", () => {
    const rows = [
      row("2026-08-13-00-00-01", { step: "confirm", hasCandidate: true }),
      row("2026-08-13-00-00-02", { step: "labeln", hasCandidate: true }),
      // `realgames model-read` requires `--model` and refuses a run trained on the session — the
      // press is that choice, which is why it has a button of its own.
      row("2026-08-13-00-00-03", { step: "model-read", hasCandidate: true, confirmed: true, hasSession: true }),
      // `occluders alpha-worker` holds the GPU for hours and the Python side takes no heavy lock:
      // a hand-started `--all` is invisible to us, so the press IS the interlock.
      row("2026-08-13-00-00-05", { step: "matte", hasCandidate: true, confirmed: true, hasSession: true }),
      // `session temporal-pass` runs SAM again over what the sensor adopted — GPU, so a press too.
      row("2026-08-13-00-00-06", { step: "temporal", hasCandidate: true, confirmed: true, hasSession: true }),
      row("2026-08-13-00-00-04", { step: "export", hasCandidate: true, confirmed: true }),
    ];
    expect(run(rows).waiting).toEqual({
      "phone-record": [],
      label: [],
      export: ["2026-08-13-00-00-04"],
      "settle-scan": [],
      matte: ["2026-08-13-00-00-05"],
      temporal: ["2026-08-13-00-00-06"],
      "model-read": ["2026-08-13-00-00-03"],
    });
  });

  it("leaves useless and archived games alone", () => {
    const rows = [
      row("2026-08-13-00-00-01", { step: null, useless: { at: "2026-08-14T20:00:00Z" } }),
      row("2026-08-13-00-00-02", {}, { archived: true }),
    ];
    expect(run(rows)).toEqual({ waiting: NONE, repair: [] });
  });

  it("never starts on a broken recording — it goes to Reparatur with the atom chain's words", () => {
    const rows = [row("2026-08-13-12-12-18", { videoBroken: "no moov" })];
    const { waiting, repair } = run(rows);
    expect(waiting).toEqual(NONE);
    expect(repair).toEqual([{ name: "2026-08-13-12-12-18", step: "label", reason: "no moov" }]);
  });

  it("phone-record is a job step — it waits, and the same two video rules apply to it", () => {
    const record = { step: "phone-record" as const, hasPhoneRecord: true };
    expect(run([row("2026-08-30-16-20-19", record)]).waiting["phone-record"]).toEqual(["2026-08-30-16-20-19"]);
    expect(run([row("2026-08-13-01-01-25", { ...record, video: null })]).waiting).toEqual(NONE);
    expect(run([row("2026-08-30-16-20-19", { ...record, videoBroken: "no moov" })]).repair).toEqual([
      { name: "2026-08-30-16-20-19", step: "phone-record", reason: "no moov" },
    ]);
  });

  it("says nothing about a bundle with no recording at all", () => {
    expect(run([row("2026-08-08-11-55-19", { video: null })])).toEqual({ waiting: NONE, repair: [] });
  });
});

describe("backlog — the no-retry marker", () => {
  const rows = [row("2026-08-14-09-23-19")];

  it("never repeats a step the ledger says failed", () => {
    const { waiting, repair } = run(rows, ledger(job("2026-08-14-09-23-19", "label", "failed", "kein lens fit (exit 1)")));
    expect(waiting).toEqual(NONE);
    expect(repair).toEqual([{ name: "2026-08-14-09-23-19", step: "label", reason: "kein lens fit (exit 1)" }]);
  });

  it("treats a skipped job the same — it could not run, so pressing it again is a human's call", () => {
    const marked = ledger(job("2026-08-14-09-23-19", "label", "skipped", "no sessions/ in the transfer"));
    expect(run(rows, marked).waiting).toEqual(NONE);
  });

  it("blocks only the step that failed: a failed pack does not stop the label", () => {
    const marked = ledger(job("2026-08-14-09-23-19", "pack", "failed", "no desktop distribution"));
    expect(run(rows, marked).waiting.label).toEqual(["2026-08-14-09-23-19"]);
  });

  it("a later job of ANOTHER kind does not clear the failed step's marker", () => {
    // Keyed per recording, a later `pack` became "the last row" and the failed export looped again.
    const confirmed = [row("2026-08-14-09-23-19", { step: "export", hasCandidate: true, confirmed: true })];
    const marked = ledger(
      job("2026-08-14-09-23-19", "export", "failed", "export-session exited 1"),
      job("2026-08-14-09-23-19", "pack", "done"),
    );
    const { waiting, repair } = run(confirmed, marked);
    expect(waiting).toEqual(NONE);
    expect(repair).toEqual([{ name: "2026-08-14-09-23-19", step: "export", reason: "export-session exited 1" }]);
  });

  it("runs the NEXT step after a step that succeeded", () => {
    const confirmed = [row("2026-08-14-09-23-19", { step: "export", hasCandidate: true, confirmed: true })];
    const marked = ledger(job("2026-08-14-09-23-19", "label", "done"));
    expect(run(confirmed, marked).waiting.export).toEqual(["2026-08-14-09-23-19"]);
  });

  it("stays out of the way while a job of its own is queued or running", () => {
    expect(run(rows, ledger(job("2026-08-14-09-23-19", "label", "running")))).toEqual({ waiting: NONE, repair: [] });
  });

  // A killed job is a decision, not a defect: the press that stopped it may press again.
  it("a stopped job is no marker at all — Stopp does not send a recording to Reparatur", () => {
    const marked = ledger(job("2026-08-14-09-23-19", "label", "stopped", "gestoppt"));
    expect(run(rows, marked)).toEqual({ waiting: { ...NONE, label: ["2026-08-14-09-23-19"] }, repair: [] });
  });

  it("lets a repaired step run again — the marker is that STEP's last row, not a scar", () => {
    const marked = ledger(job("2026-08-14-09-23-19", "label", "failed", "x"), job("2026-08-14-09-23-19", "label", "done"));
    expect(run(rows, marked).waiting.label).toEqual(["2026-08-14-09-23-19"]);
  });
});

describe("backlog — the boundary commit's 90-second export hold (§4.1.1)", () => {
  const NOW = Date.parse("2026-08-15T12:00:00Z");
  const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();
  const confirmed = (name: string, at: string | null) =>
    row(name, { step: "export", hasCandidate: true, confirmed: true }, { confirmedAt: at });
  const hold = (name: string, notBefore: string): Job => ({
    name,
    kind: "export",
    state: "skipped",
    reason: "Export gehalten",
    queuedAt: iso(-1000),
    notBefore,
  });

  it("skips an export whose hold row is still in the future — the undo is free until then", () => {
    const rows = [confirmed("2026-08-13-19-34-23", iso(-5 * 60_000))];
    const held = run(rows, { ...ledger(hold("2026-08-13-19-34-23", iso(60_000))), now: NOW });
    expect(held).toEqual({ waiting: NONE, repair: [] });
  });

  it("runs it once the hold has passed — an expired row is neither busy nor a failure", () => {
    const rows = [confirmed("2026-08-13-19-34-23", iso(-5 * 60_000))];
    const due = run(rows, { ...ledger(hold("2026-08-13-19-34-23", iso(-1000))), now: NOW });
    expect(due.waiting.export).toEqual(["2026-08-13-19-34-23"]);
    expect(due.repair).toEqual([]);
  });

  it("skips a game confirmed seconds ago even with NO hold row — another client committed it", () => {
    const fresh = run([confirmed("2026-08-13-19-34-23", iso(-30_000))], { now: NOW });
    expect(fresh).toEqual({ waiting: NONE, repair: [] });
    const aged = run([confirmed("2026-08-13-19-34-23", iso(-91_000))], { now: NOW });
    expect(aged.waiting.export).toEqual(["2026-08-13-19-34-23"]);
  });

  it("holds only the export: the same game's other steps are not this rule's business", () => {
    const rows = [row("2026-08-13-19-34-23", { step: "label", video: "v.mp4" }, { confirmedAt: iso(-1000) })];
    expect(run(rows, { now: NOW }).waiting.label).toEqual(["2026-08-13-19-34-23"]);
  });

  it("a taken-back hold does not become a no-retry marker — nothing ever ran", () => {
    // Once its `notBefore` passes the cancelled row must say nothing, or one undo means Reparatur.
    const cancelled: Job = { ...hold("2026-08-13-19-34-23", iso(-1000)), reason: "z — zurückgenommen" };
    const rows = [confirmed("2026-08-13-19-34-23", iso(-5 * 60_000))];
    expect(run(rows, { ...ledger(cancelled), now: NOW }).repair).toEqual([]);
  });
});

describe("waiting — what the step buttons's count and drain", () => {
  const exported = { hasCandidate: true, confirmed: true, hasSession: true };

  it("counts per job step, oldest recording first, and never a page step", () => {
    const rows = [
      row("2026-08-13-00-00-09", { step: "matte", ...exported }),
      row("2026-08-13-00-00-01", { step: "matte", ...exported }),
      row("2026-08-13-00-00-05", { step: "confirm", hasCandidate: true }),
      row("2026-08-13-00-00-06", { step: "model-read", ...exported }),
      row("2026-08-13-00-00-07", { step: "labeln", ...exported }),
      row("2026-08-13-00-00-08", { step: "export", hasCandidate: true, confirmed: true }),
    ];
    const { waiting } = run(rows);
    expect(waiting.matte).toEqual(["2026-08-13-00-00-01", "2026-08-13-00-00-09"]);
    expect(waiting["model-read"]).toEqual(["2026-08-13-00-00-06"]);
    expect(waiting.export).toEqual(["2026-08-13-00-00-08"]);
    expect(waiting.label).toEqual([]);
  });

  // The bar is the run's TARGET, not the pile — 80 of 394 is the instruction carried out.
  it("a matte session at its target waits on nothing; one below it waits", () => {
    const settled: ChainState = { ...CHAIN, ...exported, hasTemporalPass: true, hasModelReads: true, mattes: { done: 80, total: 394, target: 80 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 } };
    const open: ChainState = { ...settled, mattes: { done: 12, total: 394, target: 80 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 } };
    expect(nextStep(settled).step).toBe("labeln");
    expect(nextStep(open).step).toBe("matte");
    const { waiting } = run([
      row("2026-08-13-00-00-02", { ...settled, ...nextStep(settled) }),
      row("2026-08-13-00-00-03", { ...open, ...nextStep(open) }),
    ]);
    expect(waiting.matte).toEqual(["2026-08-13-00-00-03"]);
  });

  it("the same blockers as the loop: a failed step and a busy recording are not waiting", () => {
    const rows = [
      row("2026-08-13-00-00-04", { step: "matte", ...exported }),
      row("2026-08-13-00-00-05", { step: "matte", ...exported }),
    ];
    const waiting = run(rows, ledger(
      job("2026-08-13-00-00-04", "matte", "failed", "SAM 3 hat abgelehnt"),
      job("2026-08-13-00-00-05", "pack", "running"),
    )).waiting;
    expect(waiting.matte).toEqual([]);
  });
});
