# Phase 00 — Engine detection parity (census fusion, shadow-destination, latch invariant)

## Why

The `:engine` detection pipeline was ported from the Python tracker as of
`3b759db` and lacks every 2026-07-09 fix. Each missing piece is a live-hunted
correctness bug (phantom moves under shadow, still-hand-becomes-change).

## Design (decided — do not redesign)

Port the phase-00 worklist commits from `entry.md`, in listed order. For each:
`git show <hash>` is the specification; the Kotlin translation goes into the
existing engine files (locate via grep, e.g. `grep -rn "class SquareNoise\|censusTransform\|shadowVeto" android/engine/src/main/kotlin`).
Semantics and default values verbatim; config names camelCased into
`TrackerConfig` (`censusZWeight`, `occlCensusThr`, `motionHoldS`, …).

Key invariants that MUST survive the port (they were each violated once on the
Python side and re-fixed):

1. Census channel: median-normalized, own noise model (floor 2.5, wide init
   std + slow-lane learning per `8c30888`), channel guard drops it for the
   frame on global disturbance and learns the disturbance into its noise.
2. `moveDestinationSquares(board, move)`: to-square + castling rook-to; the
   en-passant captured square is NOT a destination. No candidate (single, pair
   — move 2 evaluated on the board after move 1 —, endpoint) may have a
   shadow-vetoed destination. From-square shadow evidence stays usable.
3. Latch: taint releases only when hold expired AND (motion since last taint
   refresh OR square back under zThr). Latched squares: z zeroed every frame,
   count toward maxChanged as blocked.
4. State gate counts the RAW (undilated) occluded core (`8c30888`).

## Steps

### 1. Census fusion + classifier — commit `feat(engine): census evidence fusion, disturbance guard, flat-square noise lanes`
### 2. Shadow-destination rule — commit `feat(engine): shadow-vetoed squares cannot be move destinations`
### 3. Latch invariant + blocked count — commit `feat(engine): occlusion latch releases only on motion or baseline; latched squares block max_changed`

## Tests (write, run once, targeted)

Mirror the Python regression tests (find them: `grep -n "shadow_destination\|test_taint\|census" tests/test_move_tracker.py` in the repo root — read-only reference). Minimum, JVM `:engine` tests:

1. Census: global disturbance (all squares hot) → channel dropped that frame,
   single-square structural change → fused z lifts it.
2. Phantom-destination regression: shadow-like evidence on rook square +
   adjacent empty square → no candidate; same evidence as real move (census
   structure on destination) → candidate.
3. Latch: still-hand square (hot, no motion since taint) stays latched past
   the hold; motion since refresh OR return-to-baseline releases.
4. Blocked count: 3 clean changed + 4 latched > maxChanged → no candidate.

Run once: `cd android && ./gradlew :engine:test --tests "com.chesslab.engine.*"`
then scoped `./gradlew :engine:ktlintCheck :engine:detekt`.

## Acceptance criteria

- [ ] `grep -rn "moveDestinationSquares" android/engine/src` hits definition + ≥3 call sites.
- [ ] Latch release condition greps to motion-or-baseline, not timer-only.
- [ ] All 4 test groups pass; zero regressions in `:engine:test`; ktlint/detekt clean.

## Do NOT

- No safeguard/verify/alarm work (phase 01). No app-module changes.
- No new dependencies. No changes to public API beyond what the worklist needs
  (new `TrackerConfig` fields are fine; KDoc `Consumed by phase 01` where only
  phase 01 uses them).
