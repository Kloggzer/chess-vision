# 00 — The decision rows leave the engine as structure

> Owns `core-engine/DecisionLog.kt`, `core-engine/EngineState.kt`, `core-engine/api/TrackerEngine.kt`,
> `core-engine/api/DebugPayload.kt`, `core-engine/src/test/**/DecisionLogTest.kt`,
> `service/EngineHost.kt`. Must land before phase 01. **About fifteen lines.**

## Why

`TrackerEngine.kt:118` declares `private val decisionSink: (String) -> Unit = {}` and
`EngineState.kt:340` flattens through it: `DecisionLog(sink = { decisionSink(it.toLogLine()) })`.
So the one consumer, `EngineHost.kt:171`, receives prose. Anything that wants to count rejections by
reason, or find every row for one ply, has to parse a sentence that was written to be read.

The structure already exists on both sides of that lambda. `DecisionLog`'s own sink carries a
`DecisionRecord` (`DecisionLog.kt:42`), and `DebugDecision` (`api/DebugPayload.kt:44`) is already the
engine's public shape for exactly this — already imported by `DecisionLog.kt:4`. The flattening is
one lambda, and it is the only thing in the way.

## Design

Change the sink's type and stop flattening. Nothing moves modules.

**`toLogLine` stays in `:core-engine`.** An earlier draft moved it to `:app`; that does not compile.
It calls `pyFixed`, which is `internal` (`Dispatch.kt:191`) and is a Python-parity primitive built on
`BigDecimal` + `HALF_EVEN` — moving `toLogLine` means forking that primitive or widening it. And two
of the three tests that touch `toLogLine` cannot follow it: `everyDecisionReachesTheSinkIncludingTheRejections`
(`DecisionLogTest.kt:119-134`) and `theVerifyLadderRecordsWhyItDiscardedACandidate` (`:147-161`)
drive `detectState`, `commitGates`, `Candidate`, `pairState`, `VerifySingle.tick`, `PairRecovery` and
`FakeObs`, all `internal` to this module. They use `toLogLine` incidentally, as an assertion helper.

So: re-target `toLogLine` at `DebugDecision` (it reads nothing else), make it `public`, and leave it
where it is. Zero tests move.

## Steps

1. **`feat(engine): DebugDecision carries cnnRun`** — add `val cnnRun: Boolean` to
   `api/DebugPayload.kt:44`. `toDebugDecision` already has it in scope; `toLogLine` already prints
   it (`cnn=run|off`). It is the one field the structured row would otherwise lose against the text.
2. **`refactor(engine): the sink carries the decision, not a sentence`** —
   `TrackerEngine.kt:118` and `EngineState.kt:30` become `(DebugDecision) -> Unit`;
   `EngineState.kt:340` becomes `DecisionLog(sink = { decisionSink(it.toDebugDecision()) })`;
   `toDebugDecision` (`DecisionLog.kt:215`) goes `private` → `internal`; `toLogLine` takes a
   `DebugDecision` and becomes `public`.
3. **`refactor(app): the log line is rendered at the edge`** — `EngineHost.kt:171` becomes
   `TrackerEngine(config, startFen) { Log.i(DECISION_TAG, it.toLogLine()) }`. The logcat output must
   be **byte-identical** to before; that is the acceptance criterion.

## Tests

- `DecisionLogTest` stays where it is and keeps all three of its `toLogLine` assertions, adjusted to
  build a `DebugDecision`. If a test needs to move, the design is wrong — re-read the Design section.
- One added: the sink receives a `DebugDecision` whose `uci`, `ply`, `decider` and `accepted` match
  the record that produced it.
- `ClasspathPurityTest` must pass **unchanged**. `DebugDecision` is already in this module and the
  change adds no dependency, no clock and none of the banned concurrency tokens.

## Acceptance

- `adb logcat -s chesslabDecision` produces the same text as before the change, line for line.
- `gradlew.bat :core-engine:test :app:testDebugUnitTest --rerun-tasks` green.
- `git diff --stat` on `:core-engine` is under 40 lines.

## Do NOT

- Do not move `toLogLine` or `pyFixed` out of `:core-engine`.
- Do not make `DebugDecision` `@Serializable`. kotlinx-serialization is not on this module's
  classpath and `ClasspathPurityTest.runtimeClasspathHasNoOpenCvOrAndroid` guards it. Serialization
  is phase 01's problem and belongs in `:app`.
- Do not add a second sink, a buffer, or a thread. The lambda is called on the analyzer thread and
  must stay as cheap as it is now.
