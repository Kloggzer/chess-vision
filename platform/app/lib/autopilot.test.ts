import { describe, expect, it } from "vitest";
import { plan, sessionsTouchedSince, type PlanInput } from "@/lib/autopilot";
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
  hasProposals: false,
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
  plan({ rows, lastJobs: new Map(), lastSteps: new Map(), labeling: new Set(), ...input });

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

  it("runs only the three machine steps — confirm and relabel are the human's", () => {
    const rows = [
      row("2026-08-13-00-00-01", { step: "confirm", hasCandidate: true }),
      row("2026-08-13-00-00-02", { step: "relabel", hasCandidate: true }),
      row("2026-08-13-00-00-03", { step: "propose", hasCandidate: true, confirmed: true, hasSession: true }),
    ];
    expect(run(rows).eligible).toEqual([{ name: "2026-08-13-00-00-03", step: "propose" }]);
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

describe("plan — propose guards", () => {
  const session = (name: string) =>
    row(name, { step: "propose", hasCandidate: true, confirmed: true, hasSession: true });

  it("holds a propose for a session that was labeled in the last ten minutes", () => {
    const held = run([session("2026-08-08-00-39-57")], { labeling: new Set(["rg-2026-08-08-00-39-57"]) });
    // Held, not broken: it comes back by itself once the ledger row ages out.
    expect(held).toMatchObject({ eligible: [], repair: [] });
    expect(run([session("2026-08-08-00-39-57")]).eligible).toHaveLength(1);
  });

  it("never re-proposes a session that already has a proposals file", () => {
    const rows = [row("2026-08-08-00-39-57", { step: "propose", hasSession: true, hasProposals: true, confirmed: true })];
    expect(run(rows).eligible).toEqual([]);
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

describe("sessionsTouchedSince", () => {
  const line = (session: string, ts: string) =>
    JSON.stringify({ session_id: session, frame: "001482", square: "e5", label: "occluded", ts });
  const now = Date.parse("2026-08-15T01:00:00+00:00");

  it("reads the ledger's tail and stops at the first row older than the cutoff", () => {
    const text = [
      line("rg-old", "2026-08-15T00:10:00+00:00"),
      line("rg-fresh", "2026-08-15T00:55:00+00:00"),
      line("rg-fresh", "2026-08-15T00:59:30+00:00"),
      "",
    ].join("\n");
    expect(sessionsTouchedSince(text, now - 10 * 60_000)).toEqual(new Set(["rg-fresh"]));
  });

  it("survives a half-written last line and a row without a timestamp", () => {
    const text = [line("rg-fresh", "2026-08-15T00:59:00+00:00"), '{"session_id":"rg-x"', ""].join("\n");
    expect(sessionsTouchedSince(text, now - 10 * 60_000)).toEqual(new Set(["rg-fresh"]));
  });

  it("is empty on an empty ledger", () => {
    expect(sessionsTouchedSince("", now)).toEqual(new Set());
  });
});
