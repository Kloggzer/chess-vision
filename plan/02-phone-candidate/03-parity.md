# Phase 03 — Parity on the measured bundles, then the docs

## Why

01 proved the verb on a fixture, 02 the wiring on fakes. Whether a phone candidate lands on the frames
the replay chose on real bundles — and by how much it saves — is the number the user asked for.

## Design (decided — do not redesign)

Runs in the ROOT checkout on `feat/pc-03` off `feat/phone-candidate` after 01 and 02 are merged.
First `cd android && .\gradlew.bat :desktop:installDist -q` once (the verb has to exist in the binary).

For every bundle Phase 00 measured (those with a record; two on 2026-09-06), one at a time:

1. `copy candidate.json candidate.json.replay-<date>` (Phase 00 left the replay's). From
   `android/desktop`: `build\install\desktop\bin\desktop.bat phone-candidate <abs recordingDir> force=1`;
   note the wall time.
2. Extend `scripts/phone_candidate_offset.py` by ONE option `--replay-candidate <file>` (Phase 00
   owns the script; nothing else changes) and run `… <name> --no-replay --replay-candidate
   candidate.json.replay-<date>`: the table now compares the verb's frames (the live `candidate.json`)
   against the kept replay. Paste it: per-ply delta, median, max, ply counts of both, the verb's and
   the replay's wall times.
3. `uv run pytest -q tests/test_candidate_move_chains.py` — the label is playable from `start_fen`.
   The test parametrises over every candidate on disk; a failure on an unrelated recording is
   reported as such, not fixed here.
4. Chain state without a browser: from `platform/app`, `npx tsx -e` (or `node --import tsx`) a
   10-line script calling `chainState(name)` (find the export via `grep -n "export async function"
   lib/chain.ts`) for each measured bundle → `step === "confirm"`; for `2026-08-24-22-43-46` → `"label"`.

Docs (durable facts — this phase's deliverable):

- `docs/phone-transfer.md` → "Reading the state" (`:205`): replace the "Aufnahme labeln" paragraph
  (`:223-227`) with the phone-record step, the time rule in one sentence, `PHONE_FRAME_OFFSET` and the
  measured deltas, the fallback to the replay, the segment rule, and the `hasSession` rule.
- `platform/app/README.md` chain table (`## The chain, as buttons`, `:68`): a first row for `phone-record`.
- `TODO.md`: "Züge vom Handy übernehmen statt am PC neu erkennen" (`:68`) moves to `## Erledigt`
  (`:153`) as one line with the numbers (median delta, seconds vs minutes).

**Lanes (Phase 02's discrepancy 2):** `lib/queues.ts:73` (`blocked`) and `isBare` (`:46`) split on
`step === "label"`; `lib/backlog.ts:12-13` lists `JOB_STEPS`. A `phone-record` bundle must count wherever
`label` counts: `blocked`/`isBare` accept both steps, `JOB_STEPS` gains `"phone-record"`. One test
each in `lib/queues.test.ts` and `lib/backlog.test.ts` (`a phone-record bundle is blocked like a label one`,
`phone-record is a job step`).

## Steps

0. `feat(platform): the lanes and the backlog count a phone-record bundle like a label one`.
1. `feat(scripts): phone_candidate_offset.py compares against a kept replay candidate`.
2. `docs(phone-transfer): the phone-record step — time rule, offset, measured deltas, fallback`.

## Tests

`uv run pytest -q tests/test_candidate_move_chains.py`; `npx vitest run lib/chain.test.ts` — once each.

## Acceptance

- One table per measured bundle in `STATUS.md` → Session log with median |delta|, ply counts and both wall times.
- `grep -n "phone-record" docs/phone-transfer.md platform/app/README.md` hits in both.
- `grep -n "Züge vom Handy" TODO.md` hits only below `## Erledigt`.
- Every measured bundle carries a `candidate.json` with `"decider": "phone_log"`, `"kind": "phone"` in
  `source`, and `"confirmed": false`.

## Do NOT

- Do not confirm any candidate; do not export, matte or train. Do not delete the replay candidates.
- Do not touch the phone.
