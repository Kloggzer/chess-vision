/**
 * Every recording by the step it waits for — the chain across the corpus, in one pass.
 * A card shows ONE recording and a stream ONE step; neither answers "what is stuck before the
 * export". Nothing here is a second truth: step, order and words all come from where they live.
 */
import { STEP } from "@/lib/chain-steps";
import type { Job } from "@/lib/jobs";
import { newestFirst, recordedAt, type QueueRow } from "@/lib/queues";

/** The chain's own order; a recording is in exactly one group, or in none (useless, archived, bare). */
export const INTAKE_GROUPS = ["phone-record", "label", "confirm", "export", "matte", "temporal", "model-read", "labeln"] as const;
export type IntakeGroupKey = (typeof INTAKE_GROUPS)[number];

export type IntakeRow = QueueRow & {
  /** The last job on the step the disk still asks for, in ANY state — a running one seeds the
   *  row's progress bar, a failed one its badge. `confirm` and `labeln` are pages, never jobs. */
  job: Job | null;
  /** `recordedAt(name)` as `YYYY-MM-DD HH:MM` — the sort key made readable. */
  recorded: string;
};
export type IntakeGroup = { key: IntakeGroupKey; label: string; what: string; rows: IntakeRow[] };

const readable = (name: string) => {
  const d = recordedAt(name);
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)} ${d.slice(8, 10)}:${d.slice(10, 12)}`;
};

/** The badge rule of `chain-actions.tsx`: an overtaken ledger row is history, not a warning. */
function jobOn(row: QueueRow, lastJobs: ReadonlyMap<string, Job>): Job | null {
  const job = lastJobs.get(row.name);
  return job && job.kind === row.chain.step ? job : null;
}

/** Only a failure of the step still open — what the filter counts and the badge shows. */
export const failedOn = (row: IntakeRow): boolean => row.job?.state === "failed";

/**
 * Always eight groups in chain order, rows newest first. Excluded: useless, archived, and rows
 * without a video — nothing can be intaken without one, which covers a bare bundle and a
 * record-carrying one that never got its recording alike.
 */
export function groupIntake(rows: QueueRow[], lastJobs: ReadonlyMap<string, Job>): IntakeGroup[] {
  const live = newestFirst(rows.filter((r) => !r.chain.useless && !r.archived && r.chain.video !== null));
  return INTAKE_GROUPS.map((key) => ({
    key,
    label: STEP[key].label,
    what: STEP[key].what,
    rows: live
      .filter((r) => r.chain.step === key)
      .map((r) => ({ ...r, job: jobOn(r, lastJobs), recorded: readable(r.name) })),
  }));
}

/** Live rows not yet at `labeln` — the nav badge. */
export function intakeCount(rows: QueueRow[]): number {
  return groupIntake(rows, new Map()).reduce((n, g) => (g.key === "labeln" ? n : n + g.rows.length), 0);
}

/** The groups the page lays out: the asked-for ones, failed rows only when asked, empty ones never. */
export function visibleGroups(groups: readonly IntakeGroup[], only: readonly IntakeGroupKey[], failedOnly: boolean): IntakeGroup[] {
  return groups
    .filter((g) => only.includes(g.key))
    .map((g) => (failedOnly ? { ...g, rows: g.rows.filter(failedOn) } : g))
    .filter((g) => g.rows.length > 0);
}

export const failedCount = (groups: readonly IntakeGroup[]) =>
  groups.reduce((n, g) => n + g.rows.filter(failedOn).length, 0);

export const finishedCount = (groups: readonly IntakeGroup[]) => groups.find((g) => g.key === "labeln")?.rows.length ?? 0;

/** `?nur=confirm,export` → the keys to show in chain order; unknown keys dropped; empty → all. */
export function parseOnly(param: string | null | undefined): IntakeGroupKey[] {
  const asked = new Set((param ?? "").split(",").map((part) => part.trim()));
  const picked = INTAKE_GROUPS.filter((key) => asked.has(key));
  return picked.length > 0 ? picked : [...INTAKE_GROUPS];
}
