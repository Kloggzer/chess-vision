import { describe, expect, it } from "vitest";
import { plan, type PlanInput } from "@/lib/autopilot";
import type { ChainState } from "@/lib/chain";
import type { Job } from "@/lib/jobs";
import type { QueueRow } from "@/lib/queues";

const CHAIN: ChainState = {
  step: "label",
  video: "files/sessions/x/video.mp4",
  videoBroken: null,
  offeredPgn: null,
  hasReference: true,
  hasCandidate: false,
  confirmed: false,
  hasSession: false,
  mattes: { done: 0, total: 0, target: 0 },
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

/** The two views `jobs.ts` hands the planner, in ledger order — last row per name, per name|kind. */
const ledger = (...rows: Job[]): Pick<PlanInput, "lastJobs" | "lastSteps"> => ({
  lastJobs: new Map(rows.map((row) => [row.name, row])),
  lastSteps: new Map(rows.map((row) => [`${row.name}|${row.kind}`, row])),
});

const run = (rows: QueueRow[], input: Partial<PlanInput> = {}) =>
  plan({ rows, lastJobs: new Map(), lastSteps: new Map(), ...input });

describe("plan — which machine step runs next", () => {
  it("takes the OLDEST recording, across both naming schemes", () => {
    const rows = [
      row("2026-08-14-20-35-52", { step: "export", hasCandidate: true, confirmed: true }),
      row("VID_20260726_233432", { step: "export", hasCandidate: true, confirmed: true }),
      row("2026-08-13-12-46-24", { step: "export", hasCandidate: true, confirmed: true }),
    ];
    expect(run(rows).eligible.map((e) => e.name)).toEqual([
      "VID_20260726_233432",
      "2026-08-13-12-46-24",
      "2026-08-14-20-35-52",
    ]);
  });

  it("runs label and export alone — confirm, labeln, matte and model-read need a human", () => {
    const rows = [
      row("2026-08-13-00-00-01", { step: "confirm", hasCandidate: true }),
      row("2026-08-13-00-00-02", { step: "labeln", hasCandidate: true }),
      // `realgames model-read` requires `--model` and refuses a run trained on the session, so no
      // tick can choose it: the step is offered as a button and never taken by the loop.
      row("2026-08-13-00-00-03", { step: "model-read", hasCandidate: true, confirmed: true, hasSession: true }),
      // `occluders alpha-worker` takes no model and repeats for free, but it holds the GPU for
      // hours and the Python side takes no heavy lock — a hand-started `--all` is invisible.
      row("2026-08-13-00-00-05", { step: "matte", hasCandidate: true, confirmed: true, hasSession: true }),
      row("2026-08-13-00-00-04", { step: "export", hasCandidate: true, confirmed: true }),
    ];
    expect(run(rows).eligible).toEqual([{ name: "2026-08-13-00-00-04", step: "export" }]);
  });

  it("leaves useless and archived games alone, PGN offer included", () => {
    const rows = [
      row("2026-08-13-00-00-01", { step: null, useless: { at: "2026-08-14T20:00:00Z" }, offeredPgn: "g.pgn" }),
      row("2026-08-13-00-00-02", { offeredPgn: "g.pgn" }, { archived: true }),
    ];
    expect(run(rows)).toEqual({ eligible: [], repair: [], adopt: [] });
  });

  it("never starts on a broken recording — it goes to Reparatur with the atom chain's words", () => {
    const rows = [row("2026-08-13-12-12-18", { videoBroken: "no moov" })];
    const { eligible, repair } = run(rows);
    expect(eligible).toEqual([]);
    expect(repair).toEqual([{ name: "2026-08-13-12-12-18", step: "label", reason: "no moov" }]);
  });

  it("says nothing about a bundle with no recording at all", () => {
    expect(run([row("2026-08-08-11-55-19", { video: null })])).toMatchObject({ eligible: [], repair: [] });
  });
});

describe("plan — the no-retry marker", () => {
  const rows = [row("2026-08-14-09-23-19")];

  it("never repeats a step the ledger says failed", () => {
    const { eligible, repair } = run(rows, ledger(job("2026-08-14-09-23-19", "label", "failed", "kein lens fit (exit 1)")));
    expect(eligible).toEqual([]);
    expect(repair).toEqual([{ name: "2026-08-14-09-23-19", step: "label", reason: "kein lens fit (exit 1)" }]);
  });

  it("treats a skipped job the same — it could not run, so pressing it again is a human's call", () => {
    const marked = ledger(job("2026-08-14-09-23-19", "label", "skipped", "no sessions/ in the transfer"));
    expect(run(rows, marked).eligible).toEqual([]);
  });

  it("blocks only the step that failed: a failed pack does not stop the label", () => {
    const marked = ledger(job("2026-08-14-09-23-19", "pack", "failed", "no desktop distribution"));
    expect(run(rows, marked).eligible).toEqual([{ name: "2026-08-14-09-23-19", step: "label" }]);
  });

  it("a later job of ANOTHER kind does not clear the failed step's marker", () => {
    // The bug: keyed per recording, the `pack` of a second transfer became "the last row" and the
    // export that had failed for good went straight back into the loop.
    const confirmed = [row("2026-08-14-09-23-19", { step: "export", hasCandidate: true, confirmed: true })];
    const marked = ledger(
      job("2026-08-14-09-23-19", "export", "failed", "export-session exited 1"),
      job("2026-08-14-09-23-19", "pack", "done"),
    );
    const { eligible, repair } = run(confirmed, marked);
    expect(eligible).toEqual([]);
    expect(repair).toEqual([{ name: "2026-08-14-09-23-19", step: "export", reason: "export-session exited 1" }]);
  });

  it("runs the NEXT step after a step that succeeded", () => {
    const confirmed = [row("2026-08-14-09-23-19", { step: "export", hasCandidate: true, confirmed: true })];
    const marked = ledger(job("2026-08-14-09-23-19", "label", "done"));
    expect(run(confirmed, marked).eligible).toEqual([{ name: "2026-08-14-09-23-19", step: "export" }]);
  });

  it("stays out of the way while a job of its own is queued or running", () => {
    expect(run(rows, ledger(job("2026-08-14-09-23-19", "label", "running")))).toMatchObject({ eligible: [], repair: [] });
  });

  it("lets a repaired step run again — the marker is that STEP's last row, not a scar", () => {
    const marked = ledger(job("2026-08-14-09-23-19", "label", "failed", "x"), job("2026-08-14-09-23-19", "label", "done"));
    expect(run(rows, marked).eligible).toEqual([{ name: "2026-08-14-09-23-19", step: "label" }]);
  });
});

describe("plan — the boundary commit's 90-second export hold (§4.1.1)", () => {
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
    expect(held).toMatchObject({ eligible: [], repair: [] });
  });

  it("runs it once the hold has passed — an expired row is neither busy nor a failure", () => {
    const rows = [confirmed("2026-08-13-19-34-23", iso(-5 * 60_000))];
    const due = run(rows, { ...ledger(hold("2026-08-13-19-34-23", iso(-1000))), now: NOW });
    expect(due.eligible).toEqual([{ name: "2026-08-13-19-34-23", step: "export" }]);
    expect(due.repair).toEqual([]);
  });

  it("skips a game confirmed seconds ago even with NO hold row — another client committed it", () => {
    const fresh = run([confirmed("2026-08-13-19-34-23", iso(-30_000))], { now: NOW });
    expect(fresh).toMatchObject({ eligible: [], repair: [] });
    const aged = run([confirmed("2026-08-13-19-34-23", iso(-91_000))], { now: NOW });
    expect(aged.eligible).toEqual([{ name: "2026-08-13-19-34-23", step: "export" }]);
  });

  it("holds only the export: the same game's other steps are not this rule's business", () => {
    const rows = [row("2026-08-13-19-34-23", { step: "label", video: "v.mp4" }, { confirmedAt: iso(-1000) })];
    expect(run(rows, { now: NOW }).eligible).toEqual([{ name: "2026-08-13-19-34-23", step: "label" }]);
  });

  it("a taken-back hold does not become a no-retry marker — nothing ever ran", () => {
    // `z` inside the window appends the cancelled row; once its `notBefore` passes it must say
    // nothing at all, or one undo would send the export to Reparatur for good.
    const cancelled: Job = { ...hold("2026-08-13-19-34-23", iso(-1000)), reason: "z — zurückgenommen" };
    const rows = [confirmed("2026-08-13-19-34-23", iso(-5 * 60_000))];
    expect(run(rows, { ...ledger(cancelled), now: NOW }).repair).toEqual([]);
  });
});

describe("plan — model-read is nobody's automatic step", () => {
  const session = (name: string) =>
    row(name, { step: "model-read", hasCandidate: true, confirmed: true, hasSession: true });

  it("never queues one, and never reports one as broken either", () => {
    expect(run([session("2026-08-08-00-39-57")])).toMatchObject({ eligible: [], repair: [] });
  });
});

describe("plan — adopt-pgn", () => {
  it("offers every bundle that carries a phone PGN and has no reference yet, oldest first", () => {
    const rows = [
      row("2026-08-14-09-23-19", { offeredPgn: "g.pgn", hasReference: false }),
      row("2026-08-13-12-46-24", { offeredPgn: "g.pgn", hasReference: false }),
      row("2026-08-12-01-18-44", { offeredPgn: null }),
    ];
    expect(run(rows).adopt).toEqual(["2026-08-13-12-46-24", "2026-08-14-09-23-19"]);
  });
});
