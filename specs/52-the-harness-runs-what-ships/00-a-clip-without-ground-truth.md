# Phase 00 — A clip without ground truth

> **Lands alone.** Every other phase compiles against the types this one publishes. Finish and
> commit before 01 starts.

## Why

`runClip` (`sim/ClipRun.kt:81`) already drives the phone's `TrackerEngine` over an mp4 with the real
model attached and device observation pacing. It cannot be pointed at a filmed game, because
`SimClip` (`sim/SimClips.kt:142`) is built from a manifest entry plus a `labels.json` of ground
truth — and a real game has none. That is the entire point of the review: the machine proposes, a
human disposes.

This phase widens the harness to accept "a video, a profile, and no truth", and settles how the tool
is invoked. It writes no JSON and measures no geometry — 01 and 02 do that.

## Design (decided — do not redesign)

### The source

New file `app/src/test/kotlin/com/chesslab/tracker/sim/RealGame.kt`.

```kotlin
/** A filmed game: everything the engine needs, and no claim about what the moves were. */
internal data class RealGameSource(
    val video: File,
    val config: TrackerConfig,
    val startFen: String,
    val corners: List<List<Double>>,   // [a8, h8, h1, a1] in FRAME pixels
    val margin: Double,
    val boardSize: Int,
    val fps: Double,
    val cropParams: CropParams,        // from the MODEL (specs/45), never CropParams.default
)

/** One committed ply, expanded from the engine's batch commits. */
internal data class RealGamePly(
    val ply: Int,
    val san: String,
    val uci: String,
    val frame: Int,
    val t: Double,
    val decider: String,
    val alarm: Boolean,
    val fenAfter: String,
)

internal data class RealGameResult(
    val plies: List<RealGamePly>,
    val observations: Int,
    val frames: Int,
    val finalNote: String?,
)
```

### Two invariants this type system must carry

1. **A batch commit is expanded per ply, and each ply carries the FEN after ITSELF.** The engine
   commits a batch — a recovery bridge pushes up to `recoveryMaxPlies` moves and writes one decision
   row for the lot. `board.fen()` at the commit is the position after the *last* move of the batch.
   Stamping that on every ply of a three-move bridge shows the reviewer the wrong board for two of
   them, and telling those three apart is the whole job of the review. Replay on a **copy** so the
   live engine's board is never touched. Python does this in `replay_clip_cnn.py:71 _fens_after` —
   read it, then write the Kotlin equivalent.
2. **`alarm` is an observation this harness makes, not a property the engine records.** No decision
   row on either platform carries it (`DecisionRecord`, `DebugDecision`,
   `DiagnosticsRecords.DecisionRow` — none). It is polled from the engine's status at the commit.
   The KDoc must say so, because a consumer will otherwise believe the engine reported it.

### The entry point

`runClip` is shaped around `SimClip` and its `expected` list. **Do not fork it.** Extract the body
into a private function parameterised by what it actually needs, and give `RealGameSource` its own
thin entry:

```kotlin
internal fun runRealGame(
    source: RealGameSource,
    cnn: SimCnn?,
    onFrame: (index: Int, mat: Mat) -> Unit = { _, _ -> },   // 02 writes review frames here
): RealGameResult
```

`onFrame` is called **once per decoded frame with the index that decoded it** — the parameters
travel together and are never stored apart. That is the fix for the defect in `entry.md`; phase 02
depends on this signature being honest.

`runClip(clip, cnn)` keeps its exact current signature and behaviour; the 18 committed parity clips
must produce byte-identical results.

### Invocation

A JUnit test driven by system properties, as `chesslab.sim.clips` already is:

```
gradlew.bat :app:testDebugUnitTest --tests "*LabelRealGameTest*" \
  -Dchesslab.realgame.video=data/testclip-raw/VID_20260802_222741.mp4 \
  -Dchesslab.realgame.name=game-2026-08-02 \
  -Dchesslab.realgame.profile=phone
```

New file `LabelRealGameTest.kt`. **Skipped (not failed) when `chesslab.realgame.video` is absent** —
follow whatever `SimClips.kt:59 usingDefaultClips()` and the existing opt-in tests do, so the normal
unit-test run is unaffected. This phase's version only runs the engine and prints the ply table;
01, 02 and 03 extend the same class.

Do **not** add a `JavaExec` task. The Android unit-test classpath is what carries the AARs; a second
invocation path is a second thing to keep working.

## Steps

### 1. `sim/RealGame.kt` (new) — commit `feat(sim): a clip that carries no claim about its moves`
The three data classes, the per-ply expansion with per-ply FENs, and the alarm KDoc.

### 2. `sim/ClipRun.kt` (extend) — commit `feat(sim): one runner, two callers`
Extract the shared body; add `runRealGame`. `runClip`'s signature is untouched.

### 3. `sim/LabelRealGameTest.kt` (new) — commit `feat(sim): the real-game harness is invoked like the clip harness`
Property-driven entry, skipped without the property, prints ply / san / decider / frame / t.

## Tests (write, run once, targeted)

`LabelRealGameTest`:
- `withoutAVideoPropertyTheHarnessIsSkipped` — no property, no failure.
- `aBatchCommitIsExpandedPerPlyWithItsOwnFen` — feed a synthetic batch of three plies; assert three
  `RealGamePly` rows and three *different* `fenAfter` values, the last equal to the board's FEN.
  This is the invariant that a reviewer's board depends on; prove it without a video.
- `theFrameIndexTravelsWithItsPicture` — drive `runRealGame` over a short committed clip and assert
  every `onFrame` index is strictly increasing and matches the decode order.

Existing: `CnnClipSimulationTest` must still pass unchanged — it is the proof that `runClip` did not
move.

```
gradlew.bat :app:testDebugUnitTest --tests "*LabelRealGameTest*" --tests "*CnnClipSimulationTest*"
```

## Acceptance criteria

- `grep -n "fun runClip" app/src/test/kotlin/com/chesslab/tracker/sim/ClipRun.kt` — signature
  unchanged from `HEAD~`.
- `grep -rn "CropParams.default" app/src/test/kotlin/com/chesslab/tracker/sim/RealGame.kt` — **no
  hits**. The crop comes from the model (specs/41's defect, specs/45's contract).
- `runRealGame`'s `onFrame` takes index and Mat in one call — `grep -n "onFrame" sim/RealGame.kt`.
- A normal `:app:testDebugUnitTest` run without the property is unchanged in test count except for
  the new class's skipped/passing cases.

## Do NOT / Out of scope

- No JSON, no `candidate.json`, no review frames — phase 02.
- No geometry measurement — phase 01. This phase takes `corners`/`margin`/`boardSize` as **inputs**.
- Do not touch `scripts/label_real_game.py`; phase 03 deletes it.
- Do not change `:core-engine`. If the engine needs a change to be drivable, STOP and record it.
- Do not run the full 2026-08-02 video. Use a short clip from `tests/data/testclips/`.
