# Phase 02 — quiet re-anchor vetoed by a confident CNN occupancy conflict

## Why

`Detector.quietHandled` (`android/engine/src/main/kotlin/com/chesslab/engine/Detector.kt:296-329`)
guards the quiet re-anchor against the occlusion taint latch and the alarm — but not
against the CNN. Live incident (desktop, same architecture): Bxc3 was played, its
commit was rejected (motion gate missed the hand), the diff evidence decayed, and the
quiet re-anchor pulled the reference over the un-committed move — silent, permanent
desync with no alarm, while the CNN had been confidently reading b4 as EMPTY the whole
time. Python reference: commit `21cf63c` (`tracker.py`, search `CNN disagrees → do NOT
re-anchor`).

## Design (decided — do not redesign)

The engine has no direct observation access; the safeguard feeds it via
`TrackerEngine.reportObservation(occludedDominant, ageS)` (`TrackerEngine.kt:522-529`)
→ extend that channel:

1. **`EngineState`** gains `cnnOccupancyConflicts: Set<String>` +
   `cnnConflictsTsS: Double` (same pattern as the existing `cnnOccluded` /
   `cnnOccludedTsS` pair — `grep -n "cnnOccluded" android/engine/src/main/kotlin/com/chesslab/engine/EngineState.kt`).
2. **`TrackerEngine.reportObservation`** gains a third parameter
   `occupancyConflicts: Set<String> = emptySet()` — the squares where a CONFIDENT
   observation disagrees with the believed occupancy of the CURRENT game state.
   Stored with `lastNowS - ageS`, cleared on every commit/undo/reset/baseline (find
   the places that reset `cnnOccluded` and mirror them; if none reset it, clear both
   in `state.setRef` — record which in STATUS.md).
3. **Producer (app):** `service/CnnIntegration.kt` already computes per-square
   confident reads for the taint latch (`CnnIntegration.kt:86-94`). Compute the
   conflict set there: `confident(sq) && obs.occupied(sq) != believedOccupied(sq)`
   against the engine's current FEN at observation time (the integration already
   holds it for the safeguard — verify with `grep -n "fen" .../CnnIntegration.kt`),
   and pass it into `reportObservation`.
4. **Veto in `quietHandled`:** in the quiet branch, after the taint and alarm guards
   and before `state.setRef(cur, curBgr)`:
   ```kotlin
   val freshS = lastNowS - state.cnnConflictsTsS
   if (state.cnnOccupancyConflicts.isNotEmpty() && freshS < CNN_DESYNC_FRESH_S) {
       state.markStuck("cnn_desync")
       state.note = "quiet board but CNN disagrees on " +
           state.cnnOccupancyConflicts.take(4).joinToString(", ") +
           " — holding reference (recovery will resolve)"
       return true
   }
   ```
   `CNN_DESYNC_FRESH_S = 5.0` as a `Detector` (or `TrackerConfig`) constant — match
   Python's 5 s freshness bound. Marking stuck hands the standoff to `CnnRecovery`,
   which derives the missed move (this path exists — `cnn/CnnRecovery.kt`).

## Steps

### 1. `engine/EngineState.kt` + `engine/TrackerEngine.kt` — conflict channel — commit `feat(android-engine): observation channel carries confident occupancy conflicts`
### 2. `engine/Detector.kt` — veto in `quietHandled` — commit `fix(android-engine): quiet re-anchor vetoed by a confident CNN occupancy conflict (cnn_desync)`
### 3. `app/service/CnnIntegration.kt` — produce the conflict set — commit `feat(android-cnn): report confident occupancy conflicts to the engine`
### 4. Tests — commit `test(android-engine): cnn_desync veto blocks the quiet re-anchor`
Mirror `test_quiet_reanchor_vetoed_by_confident_cnn_conflict`
(`tests/test_move_tracker.py`): quiet frame + reported conflict → reference object
unchanged + `stuckReason == "cnn_desync"`; same quiet frame with empty/stale conflict
set → re-anchor proceeds. Run once, scoped:
`.\gradlew.bat :engine:test --tests "com.chesslab.engine.*"`.

## Acceptance criteria

- `grep -n "cnn_desync" android/engine/src/main/kotlin/com/chesslab/engine/Detector.kt` hits.
- Both new test scenarios green; pre-existing `:engine` + `:app` cnn tests green.
- Stale conflicts (≥ 5 s) do NOT veto (asserted in test).
- ktlint/detekt clean for touched modules.

## Do NOT

- Do not let the veto fire while `state.alarm != null` handling changes — alarm guard
  stays first and unchanged.
- Do not run the CNN inside the engine module (engine stays observation-free; only
  the reported sets cross the boundary).
- Depends on phase 01 being merged in the working tree (same file) — run after it.
