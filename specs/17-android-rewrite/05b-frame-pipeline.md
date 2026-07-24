# Phase 05b — frame pipeline: ImageProxy → two warps → `FrameInput`

> Module `:app`, package `com.chesslab.tracker.pipeline`. Runs in parallel with 05a and 05c
> on strictly disjoint files. Read `entry.md` completely first.
>
> `android-legacy/**` is a **known-wrong implementation**. Read it for OpenCV-Java and
> CameraX API usage ONLY (`android-legacy/app/src/main/kotlin/com/chesslab/tracker/camera/YuvToBgrConverter.kt`,
> `.../service/BoardFramePipeline.kt`) — never for architecture or tracker logic.

## Why

This is the layer that turns one camera frame into exactly the `FrameInput` the engine
expects. Everything here is a 1:1 port of `tracker.py::_loop:1560-1620` — the per-frame
**order** is behaviour, not style. Two things make it delicate:

- **Two warps per frame is entry.md invariant 1.** Detection runs at
  `detSize = boardSize * detectScale = 800`; CNN crops come from a *separate*, **bordered**,
  full-`boardSize` warp. Producing CNN crops from the detection warp silently halves the
  crop resolution and is exactly the class of error MEMORY records as
  `synth-crop-resolution-gap`.
- **Frame size is truth, not the request.** `tracker.py::_note_frame_size:1086`:
  *"The requested mode is only a wish … the shape of an actually grabbed frame is the only
  trustworthy number."* Commit `a7dab73` is the Android version of ignoring that.

Performance is a hard requirement, not a nice-to-have. Two measured commits define the
budget: `9358c6c` (`perf(android-engine)`: engine 290-495 ms → 39-46 ms — allocation-free
rewrites, LUTs, buffer reuse, incremental sums) and `4a7609e` (`perf(android-app)`: frame
loop median 100-150 ms → 55-58 ms — the eater was **ArUco re-detect on the frame thread**
at 44-87 ms every 300 ms, and the full-res warp running *every* frame instead of on CNN
demand). Both lessons are requirements below.

## Design (decided — do not redesign)

### Per-frame order (port of `_loop:1560-1620` — do not reorder)

```
ImageProxy (analyzer thread)
 1. delivered size  -> FrameSizeGuard.note(w, h)        // _note_frame_size:1086
 2. YUV_420_888 -> BGR Mat (reused buffers)             // no per-frame allocation
 3. seq++                                                // Spec-11 frame signature
 4. detection warp -> BGR @ detSize                      // warpFromCorners, :core-geometry
    (null -> note "waiting for markers…", skip frame)
 5. dark gate: luma = mean(gray(bgrDet)) PRE-CLAHE       // darkLumaThr = 18.0
    luma < thr -> note "frame too dark (…) — detection paused", skip frame
 6. grayDet = GaussianBlur(CLAHE(gray(bgrDet)), 5x5, 0)  // _gray:1008
 7. motionRoiScore = roiMotion(fullFrameGray, corners)   // _roi_motion:1046
 8. gridLineCoverage                                     // :core-geometry, _grid_line_coverage:1293
 9. emit FrameInput(seq, grayDet, bgrDet, corners, motionRoiScore,
                    gridLineCoverage, lumaPreClahe, timestampMs)
10. IF and ONLY IF the CNN observer asks: bordered warp @ boardSize -> CropFrame
```

Steps 5 and 6 are ordered: **the dark gate reads luma BEFORE CLAHE**. CLAHE turns
near-black sensor noise into phantom changed squares (MEMORY `dark-frame-gate`); gating on
the post-CLAHE image measures nothing.

### `_gray` (port `tracker.py:1008-1018`)

`cvtColor(BGR2GRAY)` → if `diffClaheClip > 0`: `CLAHE(clipLimit = diffClaheClip,
tileGridSize = (8,8))` (`config.PHOTOMETRY.clahe_tile`) → `GaussianBlur((5,5), 0)`.
The `CLAHE` object is **cached and rebuilt only when `diffClaheClip` changes**
(`app.py::_apply_live_tuning:54-78` sets `tracker._clahe = None`). Expose
`fun onConfigChanged(cfg: TrackerConfig)` for 06c to call.

### `_roi_motion` (port `tracker.py:1046-1069` exactly)

1. Expand the 4 board corners **from their centroid** by `scale = 1 + 2 * motionMargin`
   (= 1.20 at the default 0.10) — `_expand_corners:1268`-style centre expansion, **not** an
   AABB inflate.
2. `dstSz = max(8, (boardSize * scale).toInt())`; `getPerspectiveTransform(expanded, [[0,0],
   [dstSz-1,0],[dstSz-1,dstSz-1],[0,dstSz-1]])`.
3. `warpPerspective` the **full-frame gray** with `BORDER_REPLICATE`.
4. `resize` to **160x160**, then `GaussianBlur((5,5), 0)`.
5. Score against the previous ROI with the engine's `motionScore(prev, cur, motionPxThr)`
   (`:core-engine`, phase 01d). Shape mismatch or no previous ROI → `0.0`.
6. `prevRoi` is reset to `null` when `motionMargin` changes (`_apply_live_tuning` sets
   `tracker._prev_roi = None`).

The 160x160 downsample is the reason this stage is cheap — do not skip it, do not change it.

### `FrameSizeGuard` (port `_note_frame_size:1086` + `_regenerate_profile:1125`)

- Reads the size from the **delivered** `ImageProxy` (05a's `DeliveredSize`), never from a
  requested enum. **Never rescales a profile by a requested/delivered ratio** — that is the
  `a7dab73` bug verbatim.
- On a changed frame size vs the active `CalibrationProfile.frameSize`: publish a
  `SizeMismatch(note, width, height)` and request profile regeneration through a callback
  the service (06c) wires to 06a's ArUco calibrator. **Retry on every frame while the
  mismatch is unresolved** (Python's explicit rule: a regeneration can fail transiently
  because a hand covers the markers, and a latched size would never retry).
- Log at most one WARN per distinct size (rate-limit rule at `:1097`).
- The pure decision (`shouldRegenerate`, `note` text, `logOnce`) lives in this class with
  **no OpenCV and no Android import** so it is JVM-testable.

### The two warps

- **Detection warp** — `:core-geometry` `warpFromCorners(bgr, profile, corners, targetSize = detSize)`
  (Python `calibration.py:926 warp_from_corners`). Every frame.
- **CNN bordered warp** — `:core-geometry` `warpBoardForCrops(bgr, profile, corners)`
  (Python `calibration.py:944 warp_board_for_crops`, border `cropBorderPx`,
  `calibration.py:384`). **On demand only.** `CropFrameStore.wantsFrame()` returns true only
  while the observer (05c) has consumed the previous one — commit `4a7609e` measured this as
  a main cost: the full-res warp ran every frame instead of the observer's ~6-10/s.
- The store owns the `Mat` lifecycle: `update()` releases the previous, `take()` transfers
  ownership to the caller, `close()` releases. Document the ownership rule in KDoc.

### Performance requirements (from `9358c6c` / `4a7609e`)

- **Zero per-frame allocation in the YUV→BGR path.** Reuse the NV21 `ByteArray`, the row
  scratch buffer, the YUV `Mat` and the BGR `Mat`; reallocate only when the delivered size
  changes. Legacy `YuvToBgrConverter.convert` allocated a fresh `Mat` per frame *and*
  returned it — do not repeat that.
- Reuse every intermediate `Mat` (gray, clahe out, blur out, roi, warp dst) as long-lived
  fields; `release()` them in `close()`.
- **The analyzer thread never blocks on the CNN.** `pipeline/` calls no classifier, awaits
  no coroutine, holds no lock a CNN thread can hold. It offers `FrameInput` and, when
  asked, a crop frame — nothing more.
- **No ArUco detection on the analyzer thread.** Corner re-detection (live-align) is
  asynchronous and owned by 06c; `pipeline/` consumes whatever corners it is given via a
  `@Volatile` corner reference swapped by the service. This is the `4a7609e` finding.
- **Per-stage timings**: `StageTimings` accumulates `warp`, `gray`, `motion`, `grid`,
  `convert`, `total` in ms and exposes an immutable `Map<String, Double>` for
  `TrackerStatus.stageTimingsMs` (engine fills `evidence`/`veto`/`score`). Emit a single
  throttled log line at **1/s** to tag `chesslabPerf` (matches the Python rolling perf log
  at `_loop:1735-1755` and the Android `chesslabPerf` convention).
- **Budget: ≥15 fps on a Poco F7 Pro (SD 8 Gen 3)**, i.e. pipeline (steps 1-9) **≤ 20 ms
  median**. Record the measured median in `STATUS.md`.

## Files you own

Create under `android/app/src/main/kotlin/com/chesslab/tracker/pipeline/`:

- `YuvToBgr.kt` — allocation-free `YUV_420_888` → BGR `Mat` converter. **≤ 150 LOC.**
- `GrayPipeline.kt` — `_gray` port: CLAHE cache + blur, `onConfigChanged`.
- `RoiMotion.kt` — `_roi_motion` port incl. centre-expansion and `prevRoi` reset.
- `BoardWarps.kt` — detection warp + on-demand bordered crop warp, `CropFrameStore`.
- `FrameSizeGuard.kt` — `_note_frame_size` port; pure, no OpenCV/Android.
- `StageTimings.kt` — per-stage accumulator + 1/s throttled `chesslabPerf` emitter.
- `FramePipeline.kt` — the orchestrator implementing the order above. **≤ 200 LOC.**

Tests under `android/app/src/test/kotlin/com/chesslab/tracker/pipeline/`:

- `YuvToBgrTest.kt`, `FrameSizeGuardTest.kt`, `RoiMotionGeometryTest.kt`,
  `StageTimingsTest.kt`, `FramePipelineOrderTest.kt`

Fixture: `android/app/src/test/resources/pipeline/yuv420_64x48.bin` +
`yuv420_64x48_expected_bgr.bin`, generated by a short throwaway script from an OpenCV
`cvtColor(COLOR_YUV2BGR_NV21)` on the desktop. Commit both; note the generator command in
the test KDoc. Do **not** add a generator script to `scripts/` (owned by 00b).

You own no other file. Need something in `camera/`, `cnn/`, `service/`, `:core-geometry`,
or the version catalog? **STOP** and record a blocker in `STATUS.md`.

## Steps

### 1. `pipeline/YuvToBgr.kt` — allocation-free conversion — commit `feat(android-pipeline): allocation-free YUV_420_888 to BGR conversion with reused buffers`
### 2. `pipeline/FrameSizeGuard.kt` — delivered size is truth — commit `feat(android-pipeline): frame-size guard — delivered size is truth, retry regeneration until resolved`
### 3. `pipeline/GrayPipeline.kt` + `pipeline/RoiMotion.kt` — commit `feat(android-pipeline): CLAHE+blur gray and board-aligned ROI motion (ports _gray/_roi_motion)`
### 4. `pipeline/BoardWarps.kt` — two warps, crop warp on demand — commit `feat(android-pipeline): detection warp per frame, bordered CNN warp on observer demand`
### 5. `pipeline/StageTimings.kt` — commit `feat(android-pipeline): per-stage frame timings into TrackerStatus (chesslabPerf, 1/s)`
### 6. `pipeline/FramePipeline.kt` — the ported per-frame order — commit `feat(android-pipeline): per-frame order ported from tracker.py _loop, emitting FrameInput`
### 7. Tests + fixtures — commit `test(android-pipeline): YUV fixture round-trip, size-guard retry, ROI geometry, stage order`

## Tests

`:app:testDebugUnitTest`, JVM only (OpenCV-free classes, plus OpenCV-backed ones behind a
seam). **UI/instrumented tests are NOT required** — use the manual checklist.

`YuvToBgrTest`
- `converts_fixture_to_expected_bgr` — max per-channel delta ≤ 1 vs the committed fixture.
- `handles_row_stride_greater_than_width` — a fixture with `rowStride = width + 16`.
- `reuses_buffers_across_frames` — 100 conversions at a constant size allocate no new
  `ByteArray`/`Mat` (assert via injected allocation counter, not via GC observation).
- `reallocates_on_size_change`.

`FrameSizeGuardTest`
- `mismatch_is_reported_from_delivered_not_requested` — requested 1280x720, delivered
  1280x960, profile at 1280x720 → note names **960**; **the `a7dab73` regression test**.
- `regeneration_is_retried_every_frame_until_resolved` — 5 failing regenerations produce 5
  requests, not 1.
- `warns_once_per_distinct_size`.
- `no_action_when_size_matches_profile`.

`RoiMotionGeometryTest`
- `corners_expand_from_the_centroid_by_one_plus_two_margin` — margin 0.10 → each corner's
  distance from the centroid ×1.20 (assert coordinates, not just the AABB).
- `roi_is_resized_to_160x160`.
- `prev_roi_is_cleared_when_motion_margin_changes`.

`StageTimingsTest` — `emits_at_most_one_log_per_second`, `snapshot_contains_all_stage_keys`.

`FramePipelineOrderTest` (fakes for warp/gray/motion)
- `dark_frame_skips_detection_and_sets_the_note` — luma 12 < 18 → no `FrameInput` emitted.
- `luma_is_measured_before_clahe` — a fake CLAHE that brightens must not lift a dark frame
  through the gate.
- `null_warp_emits_waiting_for_markers_and_no_frame_input`.
- `seq_increments_only_for_emitted_frames`.
- `crop_warp_runs_only_when_the_store_asks` — 30 frames, store wants 3 → 3 bordered warps.

Run once, at the end of your phase:
```
cd android; .\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.pipeline.*"
cd android; .\gradlew.bat :app:ktlintFormat; .\gradlew.bat :app:detekt
```

## Manual verification checklist (record results in `STATUS.md`)

- [ ] `chesslabPerf` logcat shows exactly one line per second with all stage keys.
- [ ] Measured pipeline median ≤ 20 ms and end-to-end ≥ 15 fps on the Poco F7 Pro.
- [ ] Cover the lens → note flips to "frame too dark (… < 18) — detection paused"; uncover
      → detection resumes without a phantom move.
- [ ] Force a resolution change mid-session → the WARN names the delivered size, geometry
      re-anchors, no rank shift on the overlay.

## Acceptance criteria

- `grep -rn "warpBoardForCrops" android/app/src/main/kotlin/com/chesslab/tracker/pipeline/`
  hits `BoardWarps.kt` only, and is guarded by `wantsFrame()`.
- `grep -rn "detSize\|detectScale" android/app/src/main/kotlin/com/chesslab/tracker/pipeline/BoardWarps.kt` hits.
- `grep -n "GaussianBlur" pipeline/GrayPipeline.kt` and `pipeline/RoiMotion.kt` both hit
  with kernel `5, 5`; `grep -n "160" pipeline/RoiMotion.kt` hits.
- `grep -rn "Aruco\|MarkerTracker\|detectMarkers" android/app/src/main/kotlin/com/chesslab/tracker/pipeline/` is empty.
- `grep -rn "SquareClassifier\|OrtSession\|runBlocking\|\.await()" android/app/src/main/kotlin/com/chesslab/tracker/pipeline/` is empty.
- `FramePipeline.kt` ≤ 200 LOC, `YuvToBgr.kt` ≤ 150 LOC, no file in `pipeline/` > 250 LOC.
- All named tests green; ktlint/detekt clean for `:app`.

## Do NOT

- Do not derive CNN crops from the detection warp (invariant 1) and do not run the bordered
  warp unconditionally (`4a7609e`).
- Do not measure luma after CLAHE, and do not move the dark gate below `_gray`.
- Do not run ArUco/marker detection, live-align, or any recording I/O on the analyzer thread.
- Do not allocate `Mat`s, `ByteArray`s, or boxed collections per frame.
- Do not scale corners or profiles by a requested/delivered ratio — re-seed, never blend
  (`a7dab73`).
- Do not reimplement `motionScore`, `warpFromCorners`, `warpBoardForCrops`,
  `gridLineCoverage`, or `cropBorderPx` — call `:core-engine` / `:core-geometry`.
- Do not touch `camera/`, `cnn/`, `service/`, `ui/`, or `libs.versions.toml`.
