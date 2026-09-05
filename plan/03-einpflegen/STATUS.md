# STATUS — plan/03-einpflegen

| Phase | File | State | Note |
|---|---|---|---|
| 00 | SPEC.md | todo | |

## Dependencies

After `plan/02-phone-candidate` is merged into `main` (step name `phone-record`, `STEP` table).

## Manual steps

- The `?nur=` filter is checked once in a browser on the dev server (orchestrator or user).

## Notes / discrepancies

- Review 2026-09-06 (fresh Opus agent): 10 findings, all folded in — the card's `<li>` is in
  `cards.tsx:144`, not `page.tsx`; `QueueRowItem` is the `<li>` and takes no children (row is
  hand-rolled); the nav count needs `shell.tsx` AND `layout.tsx`; URL state via the server
  `searchParams` pattern, no `useSearchParams`; no prettier in this repo; seven groups always;
  `failed` is null for page steps; `newestFirst` gets exported; video-less rows are excluded
  regardless of step; `jobs(200)` is `page.tsx:65`.

## Session log

(empty)
