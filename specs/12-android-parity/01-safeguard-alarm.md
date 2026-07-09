# Phase 01 — Safeguard/verify parity + referee alarm (engine api + app cnn + UI surface)

## Why

The phase-05 `OccupancyVerifier`/`CnnSafeguard` implement the pre-2026-07-09
decision ladder — including every hole that committed phantom/fictional moves
live (h2h4, b1c4→Na3, b1d4 fallback, d4b3 to-arrived) — and know nothing of
the illegal-move referee alarm.

## Design (decided — do not redesign)

Port the phase-01 worklist commits from `entry.md`, in listed order, into the
existing Kotlin seams (`android/app/.../tracker/cnn/OccupancyVerifier.kt`,
`CnnRecovery.kt`, `CnnSafeguard.kt`; engine `api/Safeguard.kt`,
`TrackerEngine`, status/events — locate via grep). The final Python
`_verify_tick` (`src/chesslab/move_tracker/tracker.py`, symbol `_verify_tick`)
is the reference for the complete ladder; read it whole rather than stacking
diffs blindly.

Resulting commit rules (must hold verbatim):

- from-empty commits ONLY for castling or when whole-board occupancy derives
  exactly the pending move; to-arrived commits only when the origin is NOT
  confidently still occupied; agreement path unchanged.
- Window fallback: resync-check the POST-move position; any occupancy conflict
  → discard (never "trust the diff" against a contradicting board).
- Every verify outcome needs `verifyObsVotes` (default 2) consecutive agreeing
  observations; a different outcome resets the counter.
- Seq contract: observations are seq-tagged; a stale observation
  (`obs.seq < candidate.seq`) is ignored entirely; occlusion-filter freshness
  bound 3 s; desync counting dedups per observation seq.
- Alarm (engine state, `desyncObsN` = 3): stable identity-mismatch streak WITH
  ≥1 occupancy conflict → alarm {conflicts, guess}; while alarmed: no commits
  (dispatch gate + pending discard), no re-anchor, recovery commits only if
  they resolve ALL conflict squares; occupancy-axis fallback for match/derive
  (identity stripped) so a type misread cannot freeze corrections; cleared by
  take-back (match) or user resync (discontinuity event).
- `guessIllegalMove` + `hasOccupancyConflict`: direct ports of the Python
  functions in `cnn_recovery.py` (same names snake→camel).
- Resting hand: occluded-dominant squares (p>0.5) of a fresh observation feed
  the engine's taint latch (phase 00) through the safeguard→engine seam.
- UI: alarm banner in the Tracking screen status area (red, live region for
  TalkBack, text mirrors the Python banner incl. guess SAN) + one-shot tone
  (max 1/30 s, `ToneGenerator` — no asset files). Strings in strings.xml.

## Steps

### 1. Verify ladder parity — commit `feat(android-cnn): verify commit rules parity — destination evidence, post-move check, obs votes`
### 2. Alarm + occupancy fallback — commit `feat(android-cnn): illegal-move referee alarm with occupancy gating and fallback`
### 3. Seq contract + resting-hand taint — commit `feat(android-cnn): seq-tagged observations, freshness bounds, occluded-class taint`
### 4. UI banner + tone — commit `feat(android-ui): referee alarm banner and tone`

## Tests (write, run once, targeted)

Mirror the Python regression tests (reference: repo-root
`tests/test_move_tracker.py` TestCnnVerify + alarm tests, `tests/test_cnn_recovery.py`
guess/occupancy-fallback tests). Minimum:

1. h2h4: from-empty + to-empty → hold, window discards.
2. b1a3: from-empty alone, destination unreadable → hold; whole-board derives
   pending move → commits.
3. d4b3: to-arrived + origin confidently occupied → hold; post-move conflict →
   discard. d2d4 misread-origin variant → commits after window.
4. Votes: confirming readings on 1 observation → no action; 2 → action;
   alternating outcomes never act.
5. Alarm: 3 stable occupancy-conflict observations → alarm; identity-only
   conflicts → never; while alarmed no dispatch commit and pending discarded;
   correction move via occupancy fallback commits and clears; resync clears
   with discontinuity event.
6. Stale seq ignored; 10 s old observation ignored by the occlusion filter.

Run once:
`cd android && ./gradlew :app:testDebugUnitTest --tests "com.chesslab.tracker.cnn.*" :engine:test`
then scoped ktlint/detekt for both modules and ONE `:app:assembleDebug`.

## Acceptance criteria

- [ ] `grep -rn "verifyObsVotes\|desyncObsN\|guessIllegalMove\|hasOccupancyConflict" android/` hits config + implementations + tests.
- [ ] No commit path acts on a single observation (grep the verifier for the vote gate on every outcome).
- [ ] Alarm state visible in `TrackerStatus` (additive) and rendered in the Tracking screen.
- [ ] All test groups pass; ktlint/detekt clean both modules; assembleDebug green.

## Do NOT

- Do not weaken phase-00 invariants. No changes to `SettingsScreen` beyond an
  optional `verifyObsVotes`/alarm-sound toggle ONLY if the existing pattern
  makes it a 5-line addition — otherwise leave settings alone and note it.
- No hover-tooltip equivalent (no mouse). No spectator-server changes.
- No new dependencies.
