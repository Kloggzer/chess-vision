# 01 — A standoff that ends

> **State:** `todo`. Owns `core-engine/Alarm.kt` (`desyncEvidence` only),
> `core-engine/api/TrackerConfig.kt` (one knob), `app/.../settings/ConfigKnobs.kt`,
> `app/.../ui/settings/KnobCatalog.kt`, and their tests. Parallel-safe with 00 and 02.

## Why

The 2026-08-02 game ended in `1k6/2p3pp/2r2p2/P2n4/2bb4/8/6PP/3K3R w` cycling `no_legal_move` /
`cnn_desync` **indefinitely** (`specs/37-a-way-back/STATUS.md:50-57`). The mechanism is now known and
it is not bad luck — it is structural:

- The quiet re-anchor is vetoed because the CNN disagrees somewhere, so `quietOutcome` routes to
  `desyncEvidence` (`api/TrackerEngine.kt:472-475`).
- `desyncEvidence` (`Alarm.kt:68-86`) escalates to the alarm **only** when
  `guessIllegalMove` returns non-null.
- `guessIllegalMove` (`core-cnn/AlarmGuess.kt:46-48`) returns non-null only for **exactly one**
  observed-empty-expected-occupied square **and exactly one** observed-occupied-expected-empty
  square.
- At `cnnAgree = 0.980` over ~60 confident squares the conflict set is about **one** square. One
  square is 1-and-0 or 0-and-1. **It can never be 1-and-1.**

So `desyncObs` (`EngineState.kt:351`) counts up forever, `desyncSince` (`:358`) is formatted into a
note nobody keeps (`Alarm.kt:81-85`), and the note is overwritten every frame. The engine's own KDoc
at `Alarm.kt:57-59` predicted this case exactly — *"When the CNN is simply WRONG … no move does, so
`deriveMovesDeep` returns nothing forever"* — and the guard it added covers only the move-shaped
version of it.

**There is no exit that does not require a human to notice.** The user did not notice; the words were
*"I tried to recover but it's impossible."*

This is the one place in the engine where "the same decision, over and over" should conclude
something — because the conclusion is **stop and ask the human**, which is the safe direction. Every
other repetition-based escalation examined for this pack pointed the other way (loosen a gate,
believe a candidate sooner) and was refused.

## Design (decided — do not redesign)

One new bail-out in `desyncEvidence`, after the existing `guess` branch and before the holding note.

```kotlin
/**
 * The standoff bound. A conflict set that has survived [TrackerConfig.desyncStandoffObsN] distinct
 * observations is not a transient: at `cnnCheckIntervalS = 10.0` that is minutes of a board the
 * engine cannot reconcile and cannot escalate, because `guessIllegalMove` only names a MOVE-shaped
 * contradiction and a single disagreeing square is not one.
 *
 * It latches the same alarm with no guess. `alarmGuessSan(null)` returns null and `alarmNote` already
 * falls back to the conflict list (`Alarm.kt:88-91`), so the card reads the squares.
 *
 * **Identity-gated, and that is not a detail.** `resolvesAlarmConflicts` (`CnnTick.kt:249-251`)
 * returns false outright when the observation carries no labels, so latching on a 2-class run would
 * block the ONE automatic way out — a recovery that explains every conflict square. On an identity
 * run the alarm is a stop sign; on an occupancy-only run it would be a trap. So: no labels, no latch.
 */
```

Concretely, inside `desyncEvidence` (`Alarm.kt:68-86`), where `due` is computed:

- keep the existing `guess`-based latch unchanged;
- when `guess == null`, `alarm == null`, `config.desyncStandoffObsN > 0`,
  `desyncObs >= config.desyncStandoffObsN`, and the snapshot carries an identity axis
  (`Squares.ALL.any { snap.obs.label(it) != null }` — the same test `CnnTick.kt:44` uses), latch:
  `latchAlarm(conflicts, guess = null)` and set the note from `alarmNote(raised)`;
- otherwise the existing holding note, unchanged.

`latchAlarm` is currently `private` in `Alarm.kt:133`; it stays private — the new branch is in the
same file.

### The knob

`api/TrackerConfig.kt`, beside `desyncObsN` (`:52`):

```kotlin
/**
 * Distinct desync observations after which an unreconcilable conflict set raises the alarm even
 * without a move-shaped guess. `0` = off, the way 0 means off for every other knob in the catalog.
 *
 * 12 is a placeholder chosen for its ORDER of magnitude, not measured: at `cnnCheckIntervalS = 10.0`
 * it is about two minutes. Phase 00's query 3 is what sets it; until that data exists this number is
 * a guess and must be labelled as one wherever it is quoted.
 */
val desyncStandoffObsN: Int = 12,
```

Add it to `ConfigKnobs.kt` (beside the `desyncObsN` entry) and `KnobCatalog.kt` so it is live-tunable
and reaches the diagnostics header — a knob that does not appear in `run_start` is exactly the blind
spot `docs/diagnostics.md:9-12` was written about.

### What this does to a game that is currently working

Nothing, until the CNN has disagreed with the game state on a stable conflict set across 12 distinct
observations without a legal move ever explaining it. Every path that resolves the disagreement
resets the streak first: `advanceDesyncStreak` restarts at 1 on an unstable set (`Alarm.kt:98-109`),
`clearAlarm` zeroes it (`api/TrackerEngine.kt:741`), a `matchOk` observation clears the alarm
(`CnnTick.kt:175-177`), and `applyRead`'s inconclusive arm zeroes `desyncObs` outright
(`CnnTick.kt:78-80`).

**The cost, stated plainly.** The alarm blocks every commit (`Dispatch.kt:45-49`, invariant 9), so a
false latch stops a game that might have recovered on its own. Three things bound that: it is
identity-gated, so recovery can still clear it through `resolvesAlarmConflicts`; `acceptCnnPosition`,
`captureBaseline` and a FEN resync all remain available; and by construction it only fires in a state
where nothing has committed for minutes anyway. **This trades a silent stall for a loud one.** That
is the whole intent, and if the measurement in phase 00 says standoffs of this length are common and
self-resolving, the knob goes to `0` and this phase is reverted by a config change rather than a
commit.

## Steps

1. `core-engine/api/TrackerConfig.kt` — the knob —
   commit `feat(engine): a bound on how long a standoff may hold`
2. `core-engine/Alarm.kt` — the branch in `desyncEvidence` —
   commit `feat(engine): an unreconcilable board eventually says so`
3. `app/.../settings/ConfigKnobs.kt` + `app/.../ui/settings/KnobCatalog.kt` —
   commit `feat(app): desyncStandoffObsN is tunable and logged`

## Tests (write, run once, targeted)

`core-engine/src/test/kotlin/com/chesslab/engine/AlarmLatchTest.kt`:

- `aStandoffOnOneSquareEventuallyAlarms` — an identity observation with a single stable conflict
  square, fed `desyncStandoffObsN` times with distinct `seq`; assert no alarm before the threshold
  and `TrackerEvent.Alarm` at it, with `guess == null` and the conflict square in `conflicts`.
  **Prove it red first.**
- `anOccupancyOnlyRunNeverStandoffAlarms` — the same sequence with `label == null` everywhere; assert
  no alarm at any count. This is the guard that keeps the 2-class default (`CnnModelAssets`
  `DEFAULT_MODEL = "shipped"`) out of a trap.
- `anUnstableConflictSetNeverReachesTheThreshold` — alternate the conflict square each observation;
  `advanceDesyncStreak` restarts at 1, so no alarm.
- `zeroDisablesTheStandoffBound` — `desyncStandoffObsN = 0`, 50 observations, no alarm.
- `theMoveShapedGuessStillWinsFirst` — a 1-and-1 conflict set alarms at `desyncObsN = 3` with a
  non-null guess, unchanged.

`app/src/test/kotlin/com/chesslab/tracker/ui/settings/KnobCatalogTest.kt` already reflects over
`TrackerConfig`'s fields and will fail until step 3 lands — say so rather than adding a test.

```
gradlew.bat :core-engine:test --tests "com.chesslab.engine.AlarmLatchTest" --rerun-tasks
gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.ui.settings.*" --tests "com.chesslab.tracker.settings.*" --rerun-tasks
```

## Acceptance criteria

- `grep -n "desyncStandoffObsN" android/core-engine/src/main/kotlin/com/chesslab/engine/api/TrackerConfig.kt android/core-engine/src/main/kotlin/com/chesslab/engine/Alarm.kt android/app/src/main/kotlin/com/chesslab/tracker/settings/ConfigKnobs.kt android/app/src/main/kotlin/com/chesslab/tracker/ui/settings/KnobCatalog.kt`
  hits all four.
- `latchAlarm` is still `private` and still the only writer of `EngineState.alarm` outside
  `clearAlarm`. Verify: `grep -n "alarm = " android/core-engine/src/main/kotlin/com/chesslab/engine/**/*.kt`
  hits exactly `Alarm.kt` (`latchAlarm`) and `api/TrackerEngine.kt` (`clearAlarm`).
- The KDoc on the knob says the number is unmeasured and names phase 00's query 3.
- `AlarmLatchTest`'s existing cases pass unchanged.

## Do NOT

- Do not latch without an identity axis. The reason is written above and it is not stylistic.
- Do not touch `guessIllegalMove` or `AlarmGuess.kt`. The 1-and-1 shape is correct for what it
  claims; the defect is that nothing covers the other shapes.
- Do not touch `raiseAlarmIfDue` (`Alarm.kt:122-130`) or `onStableMismatch`. Only the re-anchor
  veto's escalation path is in scope.
- Do not add a timer. The engine has no wall clock; count observations, which is also the unit
  `desyncObsN` already uses and the unit `Spec 11`'s seq contract makes meaningful.
- Do not auto-resolve, auto-re-anchor or auto-accept anything. The escape is the user
  (`Alarm.kt:59-61`), and that is the hole the veto exists to close.
