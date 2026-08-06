# Phase 01 — Geometry measured by the shipping code

## Why

The candidate's `geometry` and `clock` blocks decide whether footage is usable at all, and today they
are measured by Python (`scripts/label_real_game.py:64 scan_geometry`, `:129 median_quad`,
`:148 quad_spread`, `:179 clock_error`, `:287 report_geometry`, `:351 refuse_reasons`). The phone
measures its board with `:core-geometry`. A geometry bug found by the Python path is a bug in the
Python path; a geometry bug found by `:core-geometry` is a bug the phone actually has.

specs/41 is the precedent: the quad was wrong for a month because only three of four ArUco markers
decode on this footage and `resolve_board_corners` degraded to an affine — a *parallelogram* standing
in for a perspective view of a plane. Worst square offset 24.0–37.2 px in, 6.8–17.8 px after an
affine correction, **1.86–2.10 px** after a projective one.

## Design (decided — do not redesign)

New file `app/src/test/kotlin/com/chesslab/tracker/sim/RealGameGeometry.kt`. It consumes
`forEachFrame` (`sim/ClipFrames.kt:24`) and `:core-geometry`'s own detector — `Aruco.kt`,
`MarkerTracker.kt` — and emits exactly the blocks phase 02 serialises:

```kotlin
internal data class RealGameGeometry(
    val corners: List<List<Double>>,        // the MEDIAN quad, [a8, h8, h1, a1]
    val margin: Double,
    val boardSize: Int,
    val frameSize: List<Int>,
    val alignPassRate: Double,
    val aligned: Int,
    val sampled: Int,
    val frames: Int,
    val sampleEvery: Int,
    val markersSeen: Map<Int, Int>,         // markers decoded -> how many sampled frames
    val worstOffsetPx: Distribution,        // median / p90 / max
    val quadSpreadPx: Distribution,
    val clockErrorMs: Distribution,
)

internal data class Distribution(val median: Double, val p90: Double, val max: Double)

internal fun measureGeometry(video: File, profile: …, sampleEvery: Int = 10): RealGameGeometry
internal fun refusals(geometry: RealGameGeometry, fps: Double): List<String>
```

Field names above are the ones already on disk in
`data/realgames/game-2026-08-02/candidate.json` — read that file before writing the type, and match
it exactly. Phase 02 serialises this verbatim; a rename here silently breaks the review UI.

### Three rules the measurement must obey

1. **`quad_spread` is a MOVEMENT check and must never be read as a correctness gate.** It compares
   each frame's quad against the median of the *same* quads, so a consistently wrong quad scores
   beautifully: the 2026-08-02 game read p90 0.93 rectified px with 98 % of frames under 2 px while
   every quad in it was 27–33 px out. The absolute verdict is `alignmentOf` — worst square offset
   against 4 % of a cell, with all 18 grid lines read. **Both go in the file; the refusal gates key
   on the absolute one.**
2. **Print the per-frame marker count.** It is the one number that would have caught specs/41 a month
   earlier and the run did not print it. `markersSeen` is a histogram, not a mean.
3. **Refusal thresholds are already chosen and measured** (`specs/40/STATUS.md`, "Numbers measured"):
   quad spread p90 ≤ 4.0 rectified px, fps jitter p90 ≤ 10 % of a frame period. Both gate at **p90,
   not max**, deliberately: one 41 px frame is a hand over a marker, and a max gate would refuse
   footage that is perfectly good. Keep the thresholds, keep the reason, and keep the run listing
   that lets a *nudged board* (one long run) be told from an *occluded marker* (many short ones).

### The clock

`fps` is not metadata, it is the virtual clock: `runRealGame` derives every timestamp from
`index / fps`. A variable-rate source therefore makes the whole replay quietly wrong. Measure the
inter-frame interval, refuse on jitter, and emit the ffmpeg re-encode hint — Python has the wording
at `label_real_game.py:382 ffmpeg_cfr_hint`; carry it over.

## Steps

### 1. `sim/RealGameGeometry.kt` (new) — commit `feat(sim): the board is measured by the code that ships`
`measureGeometry` over `forEachFrame` + `:core-geometry`, emitting the block above.

### 2. same file — commit `feat(sim): footage that cannot become a candidate says so`
`refusals(...)`, the two p90 gates, the run listing, the ffmpeg hint.

### 3. `sim/LabelRealGameTest.kt` (extend) — commit `feat(sim): the harness measures before it replays`
Wire measurement ahead of the replay; print the report; refuse before decoding a second time.

## Tests (write, run once, targeted)

- `aStaticQuadHasNoSpreadButCanStillBeWrong` — synthesise quads that are identical and wrong;
  assert `quadSpreadPx.p90 ≈ 0` **and** `worstOffsetPx.median` large. This is the specs/41 trap
  encoded as a test.
- `markersSeenIsAHistogramNotAMean` — three-marker footage reports its 3s, not 3.4.
- `variableRateFootageIsRefusedWithAReEncodeHint` — jitter above the gate produces a refusal string
  containing `ffmpeg`.
- `theMedianQuadIsTakenPerCornerAcrossSampledFrames` — a synthetic outlier frame does not move it.

```
gradlew.bat :app:testDebugUnitTest --tests "*RealGameGeometry*" --tests "*LabelRealGameTest*"
```

## Acceptance criteria

- `grep -rn "quadSpread" app/src/test/.../RealGameGeometry.kt` — appears in the emitted block and
  **not** in `refusals`' correctness reasoning without `worstOffset` beside it.
- The emitted field names match `data/realgames/game-2026-08-02/candidate.json`'s `geometry` and
  `clock` keys one for one.
- Running the harness on a committed Blender clip prints a marker histogram and a distribution
  triple for each of the three metrics.

## Do NOT / Out of scope

- Do not write `candidate.json` — phase 02.
- Do not re-implement ArUco or homography. If `:core-geometry` lacks something, STOP and record it;
  the point of this phase is to use the phone's code, not to grow a second copy.
- Do not change the thresholds. They were measured; changing them is a separate, evidenced pack.
- Do not run the full 2026-08-02 video (phase 04 does). Geometry over a short clip is enough here.
