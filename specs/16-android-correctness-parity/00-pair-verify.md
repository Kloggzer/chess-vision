# Phase 00 — pair verify: fast-accept, parity fallback, vote guard

## Why

`OccupancyVerifier.evaluatePair` (`android/app/src/main/kotlin/com/chesslab/tracker/cnn/OccupancyVerifier.kt:195-219`)
is all-or-nothing: it commits only on a whole-board `afterCheck.match` and discards at
window end. One chronic confident misread anywhere (the known dark-square bB false
positive) makes both `before` and `after` unmatchable → the candidate burns the full
window, is discarded, the diff evidence re-fires it, forever. Python fixed this in
commit `165726b` (`src/chesslab/move_tracker/tracker.py::_verify_pair_tick`) — read
that function first; it is the byte-level behavioural reference.

## Design (decided — do not redesign)

Port the three decision axes into `evaluatePair`, keeping its existing
`resyncCheck`/`VerifyStep` vocabulary:

1. **Touched-squares fast-accept.** Compute `pairAgree` = fraction of
   `touched ∩ confident` squares whose observed occupancy matches the position AFTER
   both half-moves; requires ≥ 3 checked squares, else 0.0. Accept (`VerifyVerdict.For`)
   when `afterCheck.match || pairAgree >= config.minAgreement`.
2. **Window-end parity fallback.** At `framesSeen >= config.verifyWindow`: if at least
   one touched square was confident AND
   `afterCheck.conflicts.toSet() <= before.conflicts.toSet()` (every post-move conflict
   pre-existed against the CURRENT position — a stale misread cannot discriminate) →
   `VerifyVerdict.For` (decider semantics "diff_after_verify"); if NO touched square was
   ever confident → Timeout with an occlusion note; else Timeout (discard) as today.
3. **Pair vote guard.** Pair terminals (shadow-reject AND commit) must pass the same
   multi-glance vote the single path uses. In `CnnSafeguard` the vote gate fires only
   when `step.votes == true` (`cnn/CnnSafeguard.kt:169` — verify by
   `grep -n "votes" android/app/src/main/kotlin/com/chesslab/tracker/cnn/CnnSafeguard.kt`);
   the pair path currently returns `votes=false` on all terminals. Set `votes=true` on
   the pair shadow and commit outcomes (NOT on Timeout — the window already provides
   the temporal damping there), mirroring Python's `_pending_voted` usage in
   `_verify_pair_tick`.

Note the guard that already exists and must not regress: `resyncCheck`'s
`enoughBoard = confidentN >= config.minConfidentBoard` (`OccupancyVerifier.kt:252-254`)
is the blind-glance protection — keep it.

## Steps

### 1. `OccupancyVerifier.kt` — rework `evaluatePair` — commit `fix(android-cnn): pair verify — touched-squares fast-accept + window-end parity fallback`
Implement axes 1+2. Keep the existing `before.match` shadow branch first (it already
carries the min-confident guard via `resyncCheck`).

### 2. `CnnSafeguard.kt` + `OccupancyVerifier.kt` — pair vote guard — commit `fix(android-cnn): pair terminals pass the multi-glance vote guard`
Set `votes=true` on pair shadow/commit outcomes; confirm the safeguard's vote counter
treats consecutive identical outcomes exactly like the single-move path.

### 3. Tests — commit `test(android-cnn): pair fast-accept, parity fallback, occlusion timeout, blind-glance`
In `cnn/OccupancyVerifierTest.kt` (fixtures: `cnn/ObservationFixtures.kt`), mirror the
Python tests from `tests/test_move_tracker.py`:
- `test_pair_touched_squares_fast_accept` — chronic misread on c6, touched squares
  read correctly → commit despite whole-board mismatch.
- `test_pair_window_end_preexisting_conflicts_commit` — conflicts identical
  before/after, one confident touched square → commit at window end.
- `test_pair_window_end_occluded_discards` — no touched square ever confident →
  timeout, never auto-accept.
- `test_pair_blind_glance_never_shadow_rejects` — zero confident squares must not
  shadow-reject (guards the existing `enoughBoard` behaviour).

Run once: `.\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.cnn.OccupancyVerifierTest"`
(plus `CnnSafeguardTest` if the vote change touches its expectations).

## Acceptance criteria

- All 4 new tests green; pre-existing `OccupancyVerifierTest` + `CnnSafeguardTest` green.
- `grep -n "pairAgree" android/app/src/main/kotlin/com/chesslab/tracker/cnn/OccupancyVerifier.kt` hits.
- ktlint/detekt clean for `:app`.

## Do NOT

- Do not change `resyncCheck`, `verifyMove`, or any single-move branch semantics.
- Do not touch the engine module in this phase.
