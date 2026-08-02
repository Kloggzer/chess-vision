# 00 — The questions the file cannot answer yet

> **State:** `todo`. Owns `core-engine/DecisionLog.kt`, `core-engine/api/DebugPayload.kt`
> (`DebugDecision` only), `core-engine/api/TrackerEngine.kt` (`undo` only),
> `app/.../diagnostics/DiagnosticsRecords.kt`, `docs/diagnostics.md`, and the tests of each.
> Parallel-safe with 01 and 02.

## Why

The diagnostics file is the only instrument this project has for the question behind this whole pack,
and `specs/37-a-way-back/STATUS.md:88` states the question plainly and leaves it open:

> Nothing measured so far separates "the diff is poor because several real moves happened" from
> "the diff is poor because this bridge is fiction". That remains open, and it is the valuable
> question.

It is answerable for free, and only just barely not answerable today. A recovery bridge that the user
**undid** was fiction; one that ordinary diff commits then built on top of was true. The file already
carries the bridge (`[move i/N of recovery …]`, `CnnTick.kt:333`). It does not carry the undo.

Two holes, both narrow:

1. **An undo leaves no row.** `undo` calls `clearAlarm(ALARM_UNDONE)` (`api/TrackerEngine.kt:251`),
   which returns immediately when no alarm is latched (`:738`) — so an ordinary undo writes nothing
   at all. When an alarm *was* latched, the row lands at `ply = history.size` **before** the pops and
   the trim at `:262-263` then drops every row above the restored size, including that one. Known and
   recorded: `specs/37-a-way-back/STATUS.md:38-43`. The descending plies in the exported file are
   *evidence* of an undo but they are an inference, and inferring the label defeats the point of
   measuring it.
2. **A repeated identical rejection is invisible.** `recordRejection` returns without calling the
   sink when the tail row already says the same thing (`DecisionLog.kt:131`). That fold is right —
   without it one static phantom evicts the 64-row ring in a second — but it means the file cannot
   distinguish a two-minute standoff from a single hiccup. The 68 + 65 rows of the 2026-08-02
   incident are 133 *alternations* between `no_legal_move` and `too_many_changed`, each of which
   breaks the fold; a standoff that does **not** alternate leaves one row and no duration.

This phase does not decide anything differently. It writes down what happened.

## Design (decided — do not redesign)

### A. `repeats`, emitted on powers of two

`DecisionRecord` and `DebugDecision` gain one field:

```kotlin
/**
 * How many consecutive identical rejections this row stands for, counting itself. 1 for every
 * row that is not a fold survivor.
 *
 * The fold in `recordRejection` is load-bearing — a static phantom would otherwise evict the ring
 * in a second — but it also erased the one number a standoff is measured in. Re-emitting on every
 * repeat brings the flood back, so the sink fires only when the count reaches a power of two: a
 * two-minute standoff costs about seven rows and its last one carries the total.
 */
val repeats: Int = 1,
```

`recordRejection` (`DecisionLog.kt:127-161`) changes shape: instead of `return`-ing on a fold, it
replaces the tail row in place and re-fires the sink only on a power of two.

```kotlin
internal fun EngineState.recordRejection(key: String, why: String) {
    val tail = decisionLog.lastOrNull()
    if (tail != null && tail.isSameRejection(key, why)) {
        val folded = tail.copy(repeats = tail.repeats + 1, tsS = nowS)
        decisionLog[decisionLog.size - 1] = folded
        if (folded.repeats.isPowerOfTwo()) decisionSink(folded)
        return
    }
    decisionLog.add(DecisionRecord(/* … unchanged …, repeats = 1 */))
}
```

Two constraints the implementation must honour and neither is optional:

- **`DecisionLog.set` must not fire the sink** (`DecisionLog.kt:50-53` overrides `set` and does not
  today — keep it that way). The sink is fired explicitly by `recordRejection`, so the ring and the
  file stay independently controlled.
- **`recordRejection` currently has no access to the sink.** It lives on `EngineState`, and the sink
  is a private constructor parameter (`EngineState.kt:31`, `:363`). Expose it as an `internal`
  member on `EngineState` — a plain `internal val` holding the same lambda — rather than routing the
  call through `DecisionLog`, which would re-fire on every ordinary `add` too.

`isPowerOfTwo()` is `this > 0 && this and (this - 1) == 0`, a private extension in `DecisionLog.kt`.

### B. A user row that survives the trim

In `api/TrackerEngine.undo` (`:250-269`), **after** the trim loop at `:262-263`, record the undo at
the restored ply:

```kotlin
state.recordUserAction(
    key = state.takenBack?.ucis.orEmpty().joinToString(" "),
    what = "USER undo — $plies ${if (plies == 1) "ply" else "plies"} taken back",
)
```

`recordUserAction` is a new `internal fun EngineState.recordUserAction(key: String, what: String)` in
`DecisionLog.kt`, built exactly like `recordRejection`'s row but with `decider = DECIDER_USER`,
`accepted = false`, and **no fold** — two consecutive undos are two events and the second is the
interesting one.

`state.takenBack` is set by `takeBack` at `TakenBack.kt:45` and holds the accumulated line in play
order, so the row names the moves that were rejected. The row must be written after the trim, or the
trim eats it — that is the whole defect being fixed.

`clearAlarm(ALARM_UNDONE)` at `:251` stays exactly where it is. Moving it would change the ordinary
single-move undo, which `specs/37-a-way-back/STATUS.md:41-43` explicitly declines to do.

### C. The mirror, and the doc

- `DiagnosticsRecords.DecisionRow` gains `val repeats: Int` and `toRow` maps it
  (`app/.../diagnostics/DiagnosticsRecords.kt:100-158`). `DiagnosticsLogTest.kt:164-185` compares the
  key sets by reflection and fails the build if this is forgotten — that is the intended mechanism,
  not a nuisance.
- `docs/diagnostics.md` gains a **"Questions this file answers"** section carrying the five queries
  below verbatim, with the `repeats` and `decider == "user"` semantics stated.

## The queries this unlocks

Written into `docs/diagnostics.md` as executable snippets over the `rows` list the doc already builds
at `docs/diagnostics.md:26-31`.

1. **Was a recovery bridge true?** Group `accepted` rows whose `reason` contains
   `"[move i/N of recovery "` by the joined ucis in the stamp. For each group, look at the next rows
   in `seq` order: a `decider == "user"` row within the next few → the bridge was rejected by a human;
   ordinary `diff` / `cnn_occupancy` commits at increasing `ply` → it was accepted by play. **This is
   the label `specs/37` says nothing produces.**
2. **Is recovery really the main path?** `Counter(r["decider"] for r in rows if r["accepted"])` per
   `run_start` window. The incident read 13 of 21 `cnn_recovery`; one game is not a rate.
3. **How long do standoffs run?** `max(r["repeats"])` per `(stuckReason, fenAfter)` run, and the
   `tsS` delta between the first and last row of each. Answers whether phase 01's threshold is set
   anywhere near reality — **01 must be re-tuned against this once a week of files exists.**
4. **Which squares are chronically wrong?** For rows with `stuckReason != null`, count square
   appearances in `changed` and in `changedVals`. `CLAUDE.md` records the phenomenon (f4 misread in
   90 of 186 observations); this measures it on the shipped model. It is the input to the one refused
   idea in `entry.md` that is refused for lack of evidence rather than on principle.
5. **Does 0.98-against-fiction recur?** Distribution of `cnnAgreement` over rows with
   `stuckReason == "no_legal_move"` and `accepted == false`. A second mode near 1.0 is the
   self-confirming loop showing up as a number.

## Steps

1. `core-engine/api/DebugPayload.kt` + `core-engine/EngineState.kt` (`DecisionRecord`) — add
   `repeats: Int = 1`; `DecisionLog.toDebugDecision` maps it —
   commit `feat(engine): a rejection row says how many it stands for`
2. `core-engine/EngineState.kt` (expose the sink) + `core-engine/DecisionLog.kt` (`recordRejection`
   fold, `isPowerOfTwo`) — commit `feat(engine): a folded rejection reports its own length`
3. `core-engine/DecisionLog.kt` (`recordUserAction`) + `core-engine/api/TrackerEngine.kt` (`undo`) —
   commit `fix(engine): an undo leaves a row the trim cannot eat`
4. `app/.../diagnostics/DiagnosticsRecords.kt` — commit `feat(app): repeats reaches the file`
5. `docs/diagnostics.md` — commit `docs: the questions the diagnostics file answers`

## Tests (write, run once, targeted)

`core-engine/src/test/kotlin/com/chesslab/engine/DecisionLogTest.kt`:

- `foldedRejectionCountsAndEmitsOnPowersOfTwo` — feed the same `(key, why)` nine times through a
  state whose sink appends to a list; assert the ring holds **one** row with `repeats == 9` and the
  sink saw exactly four (`1, 2, 4, 8`).
- `aDifferentReasonBreaksTheFold` — the existing behaviour, pinned: two reasons alternating produce
  two rows, each `repeats == 1`.

`core-engine/src/test/kotlin/com/chesslab/engine/CommitTest.kt` (beside the existing undo tests at
`:156`, `:178`):

- `undoLeavesAUserRowBelowTheTrim` — commit a move, `undo()`, assert the log's last row has
  `decider == "user"`, `ply == history.size`, and `move` naming the popped uci. **Prove it red
  first:** it must fail against the pre-change `undo`.
- `undoOfAFourPlyBridgeNamesAllFour` — recovery bridge of 4, one `undo()`, the row's `move` carries
  all four ucis.

`app/src/test/kotlin/com/chesslab/tracker/diagnostics/DiagnosticsLogTest.kt` — no new test needed;
`theSurrogateCarriesEveryFieldOfDebugDecision` (`:164`) already fails until step 4 lands. Say so in
the report rather than adding a redundant one.

Commands:

```
gradlew.bat :core-engine:test --tests "com.chesslab.engine.DecisionLogTest" --tests "com.chesslab.engine.CommitTest" --rerun-tasks
gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.diagnostics.*" --rerun-tasks
```

## Acceptance criteria

- `grep -n "repeats" android/core-engine/src/main/kotlin/com/chesslab/engine/api/DebugPayload.kt`
  hits, and `grep -n "repeats" android/app/src/main/kotlin/com/chesslab/tracker/diagnostics/DiagnosticsRecords.kt`
  hits in both the data class and `toRow`.
- `grep -n "DECIDER_USER" android/core-engine/src/main/kotlin/com/chesslab/engine/DecisionLog.kt`
  hits (the new `recordUserAction`).
- In `api/TrackerEngine.undo`, the new call appears **after** the `while (… .last().ply > …)` loop.
  Verify by reading, and state the line number in `STATUS.md`.
- `DecisionLog.set` still does not call the sink.
- A game with no undo and no repeated rejection produces a byte-identical row stream to before.
  State how this was checked.

## Do NOT

- Do not move `clearAlarm(ALARM_UNDONE)` (`specs/37-a-way-back/STATUS.md:41-43`).
- Do not remove or weaken the fold. Re-emitting every repeat is the flood it exists to stop.
- Do not raise `DECISION_LOG_CAP` (`DecisionLog.kt:19`). The ring is not the instrument; the file is.
- Do not add a timestamp source. `nowS` only.
- Do not fix the two pre-existing `MagicNumber` findings in `toLogLine`, and do not add a third —
  `isPowerOfTwo`'s `1` is not a magic number but check the build rather than assuming.
- Do not add anything to `toLogLine`. The logcat line is not this phase's business.
