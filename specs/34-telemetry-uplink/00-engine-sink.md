# Phase 00 — the sink carries structure, not a rendered line

> **Lands ALONE, first.** This changes a public signature in `:core-engine` that phase 01 codes
> against. Do not run it concurrently with 01.

## Why

`DecisionRecord` (`android/core-engine/src/main/kotlin/com/chesslab/engine/DecisionLog.kt`) is
already exactly the row the uplink needs: changed squares **with their z-values**, both veto sets,
best/second/margin, `zThr`, motion, grid coverage, CNN agreement and best move, stuck reason,
verify outcome, FEN after, and `accepted = false` for candidates the gates threw away.

It reaches `:app` only as flattened text. `toLogLine()` renders doubles through `pyFixed(…, 1)` and
joins square sets with commas, so reconstructing `changedVals` on the PC means a parser nobody will
maintain, and it silently loses precision on exactly the numbers that decide the question — `z`
against `zThr`.

Ship the structure. This phase makes that possible and changes no behaviour.

## Design (decided — do not redesign)

**One type change, one visibility change, one file move.**

`TrackerEngine`'s constructor parameter (`api/TrackerEngine.kt`, the `decisionSink` KDoc'd as "Every
decision — committed OR rejected — as one line"):

```kotlin
// before
private val decisionSink: (String) -> Unit = {},
// after
private val decisionSink: (DebugDecision) -> Unit = {},
```

`EngineState` (`EngineState.kt`, the `decisionLog` declaration):

```kotlin
// before
val decisionLog: MutableList<DecisionRecord> = DecisionLog(sink = { decisionSink(it.toLogLine()) })
// after
val decisionLog: MutableList<DecisionRecord> = DecisionLog(sink = { decisionSink(it.toDebugDecision()) })
```

`toDebugDecision()` goes `private` → `internal` (`DecisionLog.kt`, near the bottom).

`toLogLine()` **moves out of `:core-engine` into `:app`** as an extension on `DebugDecision`, at
`android/app/src/main/kotlin/com/chesslab/tracker/service/DecisionLogLine.kt` (new). Its body is
unchanged apart from reading `uci` where it read `move`. The rendered logcat line must stay
**byte-identical** — it is the thing the user greps today.

`DebugDecision` (`api/DebugPayload.kt`) gains one additive field so the line loses nothing:

```kotlin
val cnnRun: Boolean = false,
```

…set from `DecisionRecord.cnnRun` in `toDebugDecision`.

`EngineHost` (`app/.../service/EngineHost.kt`) adapts:

```kotlin
val engine = TrackerEngine(config, startFen) { row -> Log.i(DECISION_TAG, row.toLogLine()) }
```

**Why the sink and not `DebugPayload`.** `DebugPayload` is assembled only while `debugEnabled`, so
those rows are off by default and switching them on changes the timing of the thing being measured.
The sink fires unconditionally today and `EngineHost`'s own comment says that is deliberate.
Telemetry must never be a Heisenberg problem.

## Steps

### 1. `api/DebugPayload.kt` — commit `feat(engine): DebugDecision carries cnnRun`
Additive field with a default, so no construction site changes.

### 2. `DecisionLog.kt`, `EngineState.kt`, `api/TrackerEngine.kt` — commit `refactor(engine): the decision sink emits DebugDecision`
Visibility, the sink lambda, the constructor type. Update the `decisionSink` KDoc: it is a row now,
not a line, and the reason (`toLogLine` loses precision on `changedVals`) belongs there.

### 3. `app/.../service/DecisionLogLine.kt` (new) + `EngineHost.kt` — commit `refactor(android): render the decision line in :app`
Move `toLogLine` verbatim. Delete it from `:core-engine`.

## Tests (write, run once, targeted)

`android/core-engine/src/test/kotlin/com/chesslab/engine/DecisionLogTest.kt` — existing file, three
of its tests reference `toLogLine`. They move with it, to
`android/app/src/test/kotlin/com/chesslab/tracker/service/DecisionLogLineTest.kt`.

Add to `DecisionLogTest`:

- `theSinkReceivesTheStructuredRowNotAString` — a `DecisionLog(sink = …)` capturing
  `List<DebugDecision>`; assert `changedVals` arrives with **full precision** (feed `9.25`, assert
  `9.25`, not `9.2`). This is the regression the phase exists to prevent.
- `everyDecisionRecordFieldSurvivesTheConversion` — reflect over `DecisionRecord`'s declared fields
  and assert each has a counterpart on `DebugDecision`, or is on a named allow-list with a reason.
  Without this, a field added later silently never ships.

Keep in `DecisionLogLineTest`: the existing rendering assertions, unchanged, byte for byte.

```
gradlew.bat :core-engine:test
gradlew.bat :app:testDebugUnitTest
```

## Acceptance criteria

- `grep -rn "toLogLine" android/core-engine/src/main` → **no hits**.
- `grep -rn "decisionSink: (String)" android` → **no hits**.
- `gradlew.bat :core-engine:test` green; `ClasspathPurityTest` still passes (no new import, no
  banned primitive, no clock).
- The logcat line is unchanged: run `adb logcat -s chesslabDecision` mentally against
  `DecisionLogLineTest`'s golden strings — they must not have been edited.

## Do NOT

- Do **not** add a dependency, a clock, `@Volatile`, `Atomic*`, `Mutex` or `synchronized` to
  `:core-engine`. `ClasspathPurityTest` will fail and it is right to.
- Do **not** touch `android/app/.../telemetry/**` — that is phase 01's, and it does not exist yet.
- Do **not** change what is recorded or when. This phase changes the *type* on a seam, nothing else.
- Do **not** gate the sink on `debugEnabled`.
