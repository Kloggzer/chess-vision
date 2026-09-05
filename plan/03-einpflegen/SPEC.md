# Einpflegen — one view of every recording by the step it is waiting for

## Why

`/` lists recordings as cards, newest first, each with its one next step; to see "which recordings are
stuck before the export" a person scans forty cards. The streams (`/strom/zuege`, `/strom/labeln`,
`/strom/matte`) each serve ONE step. There is no view that answers "where is everything in the intake
chain, and what is failing" — the user's request of 2026-09-06 ("besondere Lane/View, wo man filtern kann").

Runs AFTER `plan/02-phone-candidate` is merged (it renames the first step to `phone-record` and adds a
fallback); before that the group "Züge fehlen" would list a step that changes under it.

## Design (decided — do not redesign)

**Model — `platform/app/lib/intake.ts` (new):**

```ts
import type { QueueRow } from "@/lib/queues";
import type { Job } from "@/lib/jobs";
import type { ChainStep } from "@/lib/chain";

/** The chain's own order; a recording is in exactly one group, or in none (useless, archived, bare). */
export const INTAKE_GROUPS = ["phone-record", "label", "confirm", "export", "matte", "model-read", "labeln"] as const;
export type IntakeGroupKey = (typeof INTAKE_GROUPS)[number];

export type IntakeRow = QueueRow & {
  /** The last job of the recording when it FAILED on the step the disk still asks for; else null. */
  failed: Job | null;
  /** `recordedAt(name)` as `YYYY-MM-DD HH:MM` — the sort key made readable. */
  recorded: string;
};
export type IntakeGroup = { key: IntakeGroupKey; label: string; what: string; rows: IntakeRow[] };

/** Groups in chain order, rows newest first; excludes useless, archived and bare rows (`isBare`). */
export function groupIntake(rows: QueueRow[], lastJobs: ReadonlyMap<string, Job>): IntakeGroup[];
/** `?nur=confirm,export` → the keys to show; unknown keys dropped; empty → all. */
export function parseOnly(param: string | null | undefined): IntakeGroupKey[];
```

`label` and `what` per group are the SAME strings as `chain-actions.tsx STEP[key].label/.what` — export
that table from `chain-actions.tsx` as `STEP` (it is a `const` there today, `:21`; add `export`) and
read it, never retype. `phone-record` and `label` are two groups (the second is "the replay is the only
way — no record"). `failed` = `lastJobs.get(name)` when `job.state === "failed" && job.kind === row.chain.step`,
the rule `chain-actions.tsx` uses for its badge (find via `grep -n 'job.kind === step' app/chain-actions.tsx`).

**Page — `platform/app/app/strom/einpflegen/page.tsx` (new, server component):** reads
`queueRows()` (`lib/queues.ts`, exported, the loader `strom/zuege/page.tsx:3` imports) and `jobs(200)`
(`lib/jobs.ts`, as `app/page.tsx:64`), calls `groupIntake`, renders `<PageTitle title="Einpflegen"
count={total} why="…">` (`app/page-title.tsx`) with a why that names the chain in one line, then
`<IntakeFilters groups={counts} only={only} />` and, per visible group, a heading
`<label> · <n>` with the `what` sentence under it and one `<IntakeRowItem>` per row.

**Filters — `platform/app/app/strom/einpflegen/filters.tsx` (new, `"use client"`):** one chip per
group with its count, toggling the key in the `?nur=` query (`useRouter().replace`, `useSearchParams`);
a chip "Alle" clears it; a chip "Gescheitert" adds `?gescheitert=1`, which keeps only rows with
`failed !== null` inside the chosen groups. State lives in the URL and nowhere else (shareable, survives
reload — the platform's rule for review state, `strom/zuege/stream.tsx` keeps verdicts on disk for the
same reason).

**Row — `platform/app/app/strom/einpflegen/row.tsx` (new, `"use client"`):** `QueueRowItem`
(`app/queue-row.tsx:12`) for name/title, then `recorded`, `plies` ("n Halbzüge", "—" when 0), then
`<ChainActions name state lastJob={failed} />` (`app/chain-actions.tsx`, the SAME control the card
uses, so the button, its what-sentence and the fallback come for free), then a `Link` "Karte →" to
`/#<name>` (`app/page.tsx` renders `<li key={game.name}>`; add `id={game.name}` to that `li` — the one
line this spec touches outside the new files).

**Nav — `platform/app/app/shell.tsx:16-18`:** insert `{ href: "/strom/einpflegen", label: "Einpflegen" }`
FIRST among the streams; its count in `COUNT_OF` (find via `grep -n "COUNT_OF" app/shell.tsx`) is the
number of live rows NOT in `labeln` (everything still on its way in). Look at how the other counts are
fed (`grep -n "counts" app/shell.tsx`) and add the same kind of provider — do not invent a second
counts channel.

## Steps

1. `feat(platform): intake groups — every recording by the step it waits for` — `lib/intake.ts`, `STEP` exported, tests.
2. `feat(platform): /strom/einpflegen with filters in the URL` — page, filters, row, the `li` id, nav item + count.
3. `docs(platform): Einpflegen in the README` — one paragraph under the streams section (find via
   `grep -n "strom" platform/app/README.md`).

## Tests — `platform/app/lib/intake.test.ts` (new; fixtures like `lib/queues.test.ts` if present, else inline `QueueRow`s)

- `groups follow the chain order and are never empty-then-present` — six rows on six steps → six
  groups in `INTAKE_GROUPS` order; a step nobody is on yields a group with `rows: []`.
- `useless, archived and bare rows are in no group`.
- `a failed job counts only against the step the disk still asks for` — failed `label` on a row now at
  `confirm` → `failed === null`; failed `confirm`… (confirm is not a job) → use `export`.
- `parseOnly keeps known keys in chain order and drops the rest` — `"export,foo,confirm"` → `["confirm","export"]`.
- `rows are newest first within a group`.

Commands (from `platform/app`): `npx prettier --write <files>`; `npx eslint <files>`;
`npx vitest run lib/intake.test.ts lib/comment-budget.test.ts`; `npx tsc --noEmit -p .`.

## Acceptance

- Commands exit 0; 5 tests pass.
- `grep -c "einpflegen" platform/app/app/shell.tsx` → 1; `grep -c "export const STEP" platform/app/app/chain-actions.tsx` → 1.
- `grep -c 'id={game.name}' platform/app/app/page.tsx` → 1.
- `ls platform/app/app/strom/einpflegen` → `filters.tsx page.tsx row.tsx`.
- Opening `/strom/einpflegen?nur=confirm` on the dev server shows only the confirm group (manual, orchestrator).

## Do NOT

- Do not change `nextStep`, `queues.ts` semantics, the card, or any stream. Do not add a database or
  client-side storage for the filter. Do not touch Kotlin or Python.
- Comments ≤ 5 lines (`lib/comment-budget.test.ts`); `platform/app/comment-budget.txt` may only shrink.
- Gate from `platform/app` only; never `npm run build`.
