# STATUS — plan/03-einpflegen

| Phase | File | State | Note |
|---|---|---|---|
| 00 | SPEC.md | done 2026-09-06 | `0232a449`, `f9eeb13b`, `e4bcc29e` on `feat/einpflegen`; `intake.test.ts` 6, 326 tests total |

## Dependencies

After `plan/02-phone-candidate` is merged into `main` (step name `phone-record`, `STEP` table).

## Manual steps

- The `?nur=` filter is checked once in a browser on the dev server (orchestrator or user).
  **Done by curl against the user's running dev server on :3000** — `/strom/einpflegen?nur=confirm`
  is 200 and renders the confirm group only (2 rows), the bare route all seven. Not eyeballed in a
  browser; nothing about the layout was verified, only the rendered text.

## Notes / discrepancies

- Review 2026-09-06 (fresh Opus agent): 10 findings, all folded in — the card's `<li>` is in
  `cards.tsx:144`, not `page.tsx`; `QueueRowItem` is the `<li>` and takes no children (row is
  hand-rolled); the nav count needs `shell.tsx` AND `layout.tsx`; URL state via the server
  `searchParams` pattern, no `useSearchParams`; no prettier in this repo; seven groups always;
  `failed` is null for page steps; `newestFirst` gets exported; video-less rows are excluded
  regardless of step; `jobs(200)` is `page.tsx:65`.

## Notes — implementation discrepancies (2026-09-06)

- **`STEP` cannot be read from `chain-actions.tsx` by a server component — it breaks EVERY page.**
  The file is `"use client"`, so a server module importing it gets a client REFERENCE, not the
  object: `STEP[key]` is `undefined` and `groupIntake` throws. Measured on the user's running dev
  server, not deduced — with `layout.tsx` calling `intakeCount`, `/` went from 200 to 500 and the
  log said `TypeError: Cannot read properties of undefined (reading 'label')` 56 times. The table
  therefore moved VERBATIM into a new `platform/app/lib/chain-steps.ts` (`export const STEP`), and
  `chain-actions.tsx` imports it from there. One definition still, in the module both sides may
  read. Consequence for the acceptance greps: `grep -c "export const STEP"` is **0** in
  `app/chain-actions.tsx` and **1** in `lib/chain-steps.ts`. It rides in Step 2's commit because
  Step 1 was already committed and amending is out.
- **`grep -c "einpflegen" app/shell.tsx` is 3, not 2.** The Design asks for all three edits —
  `NavCounts` gains `einpflegen: number`, the STROM item carries `href: "/strom/einpflegen"`, and
  `COUNT_OF` maps that href — and each is its own line. Two is only reachable by hiding the href
  behind a constant, which the Design does not ask for.
- `newestFirst` is `lib/queues.ts:62`, not `:59` (`recordedAt` sits above it).
- The pre-existing eslint error is `app/shell.tsx:105` (`react-hooks/set-state-in-effect`), not
  `app/chain-actions.tsx:105`; with my rows it moved to `:112`. `npx eslint app/chain-actions.tsx`
  is clean, warning included — the named `:247` warning does not appear on this checkout.
- **The drain panel's missing `phone-record` row is closed** (the gap `plan/02-phone-candidate`
  left): `STEPS` in `shell.tsx` gained `Handy-Züge` FIRST, in chain order, built like the other
  four. The comment above it now says five steps.
- `parseOnly("")` and `parseOnly(null)` return all seven, so the bare route shows everything; a
  chip pressed from the unfiltered view SELECTS that key rather than dropping it (toggling in
  `?nur=`, not in the resolved set — otherwise the first press would show six of seven).
- Filters and page are server components as specified; `grep -c useSearchParams` is 0 in all three.

## Session log

### 2026-09-06 — root checkout, branch `feat/einpflegen`

Three commits, one per Step: `0232a449` (`lib/intake.ts` + tests, `STEP`/`newestFirst` exported),
`f9eeb13b` (page, filters, row, the card's `id`, nav item + count, the `phone-record` drain row,
and the `lib/chain-steps.ts` move the dev server forced), `e4bcc29e` (README).

Gate from `platform/app`, all exit 0: `npx eslint` over the ten touched files except `app/shell.tsx`
(pre-existing error, see Notes); `npx vitest run lib/intake.test.ts lib/comment-budget.test.ts` →
7 tests (6 new + the budget one), full `npx vitest run` → 46 files / **326** tests (was 320 + 6);
`npx tsc --noEmit -p .`. `comment-budget.txt` untouched.

Acceptance greps: `einpflegen` in `shell.tsx` **3** (see Notes), `export const STEP` in
`chain-actions.tsx` **0** / in `lib/chain-steps.ts` **1**, `export const newestFirst` in
`queues.ts` **1**, `id={game.name}` in `cards.tsx` **1**, `useSearchParams` in the three new files
**0**, `ls app/strom/einpflegen` → `filters.tsx page.tsx row.tsx`.

Live check on the running dev server (:3000, the user's — a second one refuses the port): `/`,
`/strom/einpflegen`, `?nur=confirm` and `?gescheitert=1` all 200. The page shows 7 groups with
counts 0/1/2/2/0/0/20, the nav badge 5 (labeln excluded), the failed `label` job of
`2026-08-24-22-43-46` with its reason, and `?nur=confirm` exactly the two confirm rows.

**Next step:** the orchestrator merges `feat/einpflegen`. Open for a human: whether the chip row
should also offer "nur mit Video" — video-less bundles are silently out of every group, which is
the Design's rule but invisible on the page.
