import { describe, expect, it } from "vitest";
import type { ChainState } from "@/lib/chain/chain";
import { failedCount, finishedCount, groupIntake, intakeCount, parseOnly, visibleGroups, INTAKE_GROUPS } from "@/lib/chain/intake";
import type { Job } from "@/lib/chain/slot";
import type { QueueRow } from "@/lib/chain/queues";

const CHAIN: ChainState = {
  step: "label",
  video: "v.mp4",
  videoBroken: null,
  offeredPgn: null,
  hasReference: false,
  hasPhoneRecord: false,
  hasCandidate: false,
  confirmed: false,
  hasSession: false,
  mattes: { done: 0, total: 0, target: 0, reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 },
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

const job = (name: string, kind: Job["kind"], state: Job["state"] = "failed"): Job => ({
  name,
  kind,
  state,
  queuedAt: "2026-09-06T10:00:00Z",
});

const ledger = (...jobs: Job[]) => new Map(jobs.map((j) => [j.name, j]));

describe("groupIntake", () => {
  it("there are always nine groups in chain order", () => {
    const groups = groupIntake(
      [row("2026-08-12-01-18-44", { step: "confirm" }), row("2026-08-13-01-31-43"), row("2026-08-14-09-23-19", { step: "export" })],
      new Map(),
    );
    expect(groups.map((g) => g.key)).toEqual([...INTAKE_GROUPS]);
    expect(groups.filter((g) => g.rows.length === 0)).toHaveLength(6);
    expect(groups.find((g) => g.key === "label")?.label).toBe("Züge erkennen");
  });

  it("useless, archived and video-less rows are in no group", () => {
    const groups = groupIntake(
      [
        row("2026-08-12-01-18-44", { useless: { at: "2026-08-14T20:00:00Z" } }),
        row("2026-08-13-01-31-43", {}, { archived: true }),
        row("2026-08-14-09-23-19", { video: null }),
      ],
      new Map(),
    );
    expect(groups.reduce((n, g) => n + g.rows.length, 0)).toBe(0);
  });

  it("a job counts only against the step the disk still asks for", () => {
    const failed = job("2026-08-12-01-18-44", "export");
    const asking = groupIntake([row("2026-08-12-01-18-44", { step: "export" })], ledger(failed));
    expect(asking.find((g) => g.key === "export")?.rows[0].job).toBe(failed);

    const moved = groupIntake([row("2026-08-12-01-18-44", { step: "matte" })], ledger(failed));
    expect(moved.find((g) => g.key === "matte")?.rows[0].job).toBeNull();

    const page = groupIntake([row("2026-08-12-01-18-44", { step: "confirm" })], ledger(job("2026-08-12-01-18-44", "label")));
    expect(page.find((g) => g.key === "confirm")?.rows[0].job).toBeNull();
  });

  it("a RUNNING job reaches the row, so its bar can poll", () => {
    const running = job("2026-08-12-01-18-44", "export", "running");
    const groups = groupIntake([row("2026-08-12-01-18-44", { step: "export" })], ledger(running));
    const found = groups.find((g) => g.key === "export")?.rows[0];
    expect(found?.job).toBe(running);
    expect(failedCount(groups)).toBe(0);
    expect(visibleGroups(groups, ["export"], true)).toEqual([]);
  });

  it("rows are newest first within a group", () => {
    const groups = groupIntake(
      [row("2026-08-08-11-55-19"), row("VID_20260813_193423"), row("2026-08-11-23-55-04")],
      new Map(),
    );
    const label = groups.find((g) => g.key === "label");
    expect(label?.rows.map((r) => r.name)).toEqual(["VID_20260813_193423", "2026-08-11-23-55-04", "2026-08-08-11-55-19"]);
    expect(label?.rows[0].recorded).toBe("2026-08-13 19:34");
  });
});

it("intakeCount leaves out labeln", () => {
  const rows = [row("2026-08-12-01-18-44", { step: "labeln" }), row("2026-08-13-01-31-43"), row("2026-08-14-09-23-19", { step: "matte" })];
  expect(intakeCount(rows)).toBe(2);
});

it("parseOnly keeps known keys in chain order and drops the rest", () => {
  expect(parseOnly("export,foo,confirm")).toEqual(["confirm", "export"]);
  expect(parseOnly("")).toEqual([...INTAKE_GROUPS]);
  expect(parseOnly(null)).toEqual([...INTAKE_GROUPS]);
});

describe("visibleGroups", () => {
  const failed = job("2026-08-12-01-18-44", "export");
  const groups = groupIntake(
    [row("2026-08-12-01-18-44", { step: "export" }), row("2026-08-13-01-31-43", { step: "export" }), row("2026-08-14-09-23-19", { step: "labeln" })],
    ledger(failed),
  );

  it("shows only occupied groups among the asked-for ones", () => {
    expect(visibleGroups(groups, [...INTAKE_GROUPS], false).map((g) => g.key)).toEqual(["export", "labeln"]);
    expect(visibleGroups(groups, ["matte", "labeln"], false).map((g) => g.key)).toEqual(["labeln"]);
  });

  it("failed-only keeps the failed rows and drops a group left empty", () => {
    const shown = visibleGroups(groups, [...INTAKE_GROUPS], true);
    expect(shown.map((g) => [g.key, g.rows.length])).toEqual([["export", 1]]);
    expect(failedCount(groups)).toBe(1);
    expect(finishedCount(groups)).toBe(1);
  });
});
