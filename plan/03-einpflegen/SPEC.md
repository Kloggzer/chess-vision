# Einpflegen — one view of every recording by the step it is waiting for

## Why

`/` lists recordings as cards, newest first, each with its one next step; to see "which recordings are
stuck before the export" a person scans forty cards. The streams (`/strom/zuege`, `/strom/labeln`,
`/strom/matte`) each serve ONE step. There is no view that answers "where is everything in the intake
chain, and what is failing" — the user's request of 2026-09-06 ("besondere Lane/View, wo man filtern kann").

Runs AFTER `plan/02-phone-candidate` is merged (it inserts the step `phone-record` before `label` and
adds a fallback); before that the first group would list a step that changes under it.

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
  /** The last job when it FAILED on the step the disk still asks for; else null. `confirm` and `labeln`
   *  are pages, never jobs, so their rows always carry null. */
  failed: Job | null;
  /** `recordedAt(name)` as `YYYY-MM-DD HH:MM` — the sort key made readable. */
  recorded: string;
};
export type IntakeGroup = { key: IntakeGroupKey; label: string; what: string; rows: IntakeRow[] };

/** ALWAYS seven groups in chain order (an unoccupied step has `rows: []`), rows newest first
 *  (`newestFirst`, `lib/queues.ts:59` — add `export`, nothing else changes there). Excluded: useless,
 *  archived, and rows with `chain.video === null` (nothing can be intaken without a video; this
 *  covers `isBare` and a phone-record bundle without video alike). */
export function groupIntake(rows: QueueRow[], lastJobs: ReadonlyMap<string, Job>): IntakeGroup[];
/** Live rows not yet at `labeln` — the nav badge. */
export function intakeCount(rows: QueueRow[]): number;
/** `?nur=confirm,export` → the keys to show in chain order; unknown keys dropped; empty → all. */
export function parseOnly(param: string | null | undefined): IntakeGroupKey[];
```

`label` and `what` per group are the SAME strings as `chain-actions.tsx STEP[key].label/.what` — export
that table from `chain-actions.tsx` as `STEP` (it is a `const` there today, `:21`; add `export`) and
read it, never retype. `phone-record` and `label` are two groups (the second is "the replay is the only
way — no record"). `failed` = `lastJobs.get(name)` when `job.state === "failed" && job.kind === row.chain.step`,
the rule `chain-actions.tsx` uses for its badge (find via `grep -n 'job.kind === step' app/chain-actions.tsx`).

**Page — `platform/app/app/strom/einpflegen/page.tsx` (new, server component, `export const dynamic =
"force-dynamic"` like every other page here):** takes `searchParams: Promise<{ nur?: string; gescheitert?:
string }>` (the app's pattern, `app/corpus/page.tsx:65`, `app/strom/labeln/page.tsx:5`), reads
`queueRows()` (`lib/queues.ts:98`, as `strom/zuege/page.tsx:3` imports it) and `jobs(200)` (`lib/jobs.ts:886`,
as `app/page.tsx:65`), calls `groupIntake`, filters by `parseOnly(nur)` and `gescheitert === "1"`, renders
`<PageTitle title="Einpflegen" count={intakeCount(rows)} why="…">` (`app/page-title.tsx`) with a why that
names the chain in one line, then `<IntakeFilters counts only failedOnly />` and, per visible group, a
heading `<label> · <n>`, the `what` sentence under it, and one `<IntakeRowItem>` per row.

**Filters — `platform/app/app/strom/einpflegen/filters.tsx` (new, SERVER component — no hooks):** one
`<Link>` chip per group with its count, whose `href` toggles that key in `?nur=` (computed on the server
from the current selection); a chip "Alle" links to the bare route; a chip "Gescheitert" toggles
`?gescheitert=1`, which keeps only rows with `failed !== null` inside the chosen groups. State lives in
the URL and nowhere else (shareable, survives reload; no `useSearchParams`, no client state — the repo
has no client URL-state hook and a `Suspense` boundary would be the price).

**Row — `platform/app/app/strom/einpflegen/row.tsx` (new, `"use client"` because `ChainActions` is):**
its own `<li>` (NOT `QueueRowItem`, whose root is the `<li>` and which takes no children): title or name
(+ mono name when a title exists, as `queue-row.tsx:25-27` does), `recorded`, `plies` ("n Halbzüge",
"—" when 0), `<ChainActions name={row.name} state={row.chain} lastJob={row.failed} />`
(`app/chain-actions.tsx:84-92` — the SAME control the card uses, so button, what-sentence and fallback
come for free), then a `Link` "Karte →" to `/#<name>`. For the anchor, `app/cards.tsx:144` (the card's
`<li>`) gets `id={game.name}` — one attribute, the only change to the card.

**Nav — `app/shell.tsx` and `app/layout.tsx`:** `NavCounts` (`shell.tsx:11`) gains `einpflegen: number`;
`layout.tsx:18` computes it with `intakeCount(rows)` from the same `queueRows()` call it already makes;
the item `{ href: "/strom/einpflegen", label: "Einpflegen" }` goes FIRST among the streams (`shell.tsx:16`)
and `COUNT_OF` (`:31`) maps it. Two lines mention `einpflegen` in `shell.tsx` afterwards.

## Steps

1. `feat(platform): intake groups — every recording by the step it waits for` — `lib/intake.ts`, `STEP` and `newestFirst` exported, tests.
2. `feat(platform): /strom/einpflegen with filters in the URL` — page, filters, row, the card's `id`, nav item + count.
3. `docs(platform): Einpflegen in the README` — one paragraph under the streams section (find via
   `grep -n "strom" platform/app/README.md`).

## Tests — `platform/app/lib/intake.test.ts` (new; fixtures like `lib/queues.test.ts` if present, else inline `QueueRow`s)

- `there are always seven groups in chain order` — rows on three steps → seven groups, four with `rows: []`.
- `useless, archived and video-less rows are in no group`.
- `a failed job counts only against the step the disk still asks for` — a failed `export` job on a
  row at `export` → `failed` is that job; the same job on a row now at `matte` → `null`; a row at
  `confirm` → `null` whatever the ledger holds.
- `parseOnly keeps known keys in chain order and drops the rest` — `"export,foo,confirm"` → `["confirm","export"]`.
- `rows are newest first within a group` and `intakeCount leaves out labeln`.

Commands (from `platform/app`): match the surrounding hand style (the repo has no formatter);
`npx eslint <files>`; `npx vitest run lib/intake.test.ts lib/comment-budget.test.ts`; `npx tsc --noEmit -p .`.

## Acceptance

- Commands exit 0; 6 tests pass.
- `grep -c "einpflegen" platform/app/app/shell.tsx` → 2; `grep -c "export const STEP" platform/app/app/chain-actions.tsx` → 1;
  `grep -c "export const newestFirst" platform/app/lib/queues.ts` → 1.
- `grep -c 'id={game.name}' platform/app/app/cards.tsx` → 1; `grep -c "useSearchParams" platform/app/app/strom/einpflegen/*.tsx` → 0.
- `ls platform/app/app/strom/einpflegen` → `filters.tsx page.tsx row.tsx`.
- Opening `/strom/einpflegen?nur=confirm` on the dev server shows only the confirm group (manual, orchestrator).

## Do NOT

- Do not change `nextStep`, `queues.ts` beyond the `newestFirst` export, the card beyond the `id`, or
  any stream. Do not add a database or client-side storage for the filter. Do not touch Kotlin or Python.
- Comments ≤ 5 lines (`lib/comment-budget.test.ts`); `platform/app/comment-budget.txt` may only shrink.
- Gate from `platform/app` only; never `npm run build`.
