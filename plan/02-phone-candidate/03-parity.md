# Phase 03 — Parity on the three bundles, then the docs

## Why

01 proved the verb on a fixture, 02 the wiring on fakes. Whether a phone candidate lands on the same
frames as the replay on real bundles — and by how much it saves — is the number the user asked for.

## Design (decided — do not redesign)

Runs in the ROOT checkout on `feat/phone-candidate` after 01 and 02 are merged, with a fresh
`cd android && .\gradlew.bat :desktop:installDist` (the orchestrator has built it; verify the binary
date is after the merge, else build once).

For each of the three Phase 00 bundles, in order, one at a time:

1. Keep the replay's candidate aside: `copy candidate.json candidate.json.replay-<date>` (it exists
   from Phase 00). Run `desktop.bat phone-candidate <abs recordingDir> force=1` from `android/desktop`;
   note wall time (seconds).
2. `uv run python scripts/phone_candidate_offset.py <name> --no-replay` now compares the phone
   candidate's frames against `candidate.json.replay-<date>` — extend the script by one option
   `--replay-candidate <file>` (Phase 00 owns the script; you may add the option, nothing else).
   Paste the table: per ply delta, median, max, and the two wall times (replay from Phase 00's log,
   verb from step 1).
3. `uv run pytest -q tests/test_candidate_move_chains.py` — the label is playable from `start_fen`.
4. Open nothing in a browser; instead `curl -s http://localhost:3000/` is NOT required — the chain
   state is asserted by `npx vitest run lib/chain.test.ts` (02) and by reading `nextStep` for a real
   bundle via a 10-line `node -e` using `lib/chain.ts`'s `chainState(name)` (find the export via
   `grep -n "export async function" platform/app/lib/chain.ts`): the three bundles must now report
   `confirm` (candidate exists, unconfirmed).

Docs (durable facts — this phase's deliverable):

- `docs/phone-transfer.md` → "Reading the state" (`:205`): replace the "Aufnahme labeln" paragraph
  (`:223-226`) with the phone step, the time rule (one sentence), `PHONE_FRAME_OFFSET` and the
  measured deltas, the fallback to the replay, and the `hasSession` rule (export row has `board`).
- `platform/app/README.md` chain table (`## The chain, as buttons`): a first row for `phone`.
- `TODO.md`: the item "Züge vom Handy übernehmen statt am PC neu erkennen" moves to `## Erledigt`
  as one line with the numbers (median delta, seconds vs minutes).

## Steps

1. `feat(scripts): phone_candidate_offset.py compares against a kept replay candidate`.
2. `docs(phone-transfer): the phone step — time rule, offset, measured deltas, fallback`.

## Tests

`uv run pytest -q tests/test_candidate_move_chains.py`, `npx vitest run lib/chain.test.ts` — once.

## Acceptance

- Three tables in `STATUS.md` → Session log with median |delta| and the two wall times each.
- `grep -n "phone-candidate" docs/phone-transfer.md platform/app/README.md` hits in both.
- `grep -n "Züge vom Handy" TODO.md` hits only below `## Erledigt`.
- The three bundles carry a `candidate.json` with `"decider": "phone"` and `"confirmed": false`.

## Do NOT

- Do not confirm any candidate; do not export, matte or train. Do not delete the replay candidates.
- Do not touch the phone.
