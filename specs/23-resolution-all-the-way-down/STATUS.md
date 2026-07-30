# STATUS — 23 resolution all the way down

Branch: `spec-23-resolution-all-the-way-down` (from `main`, which carries all of specs/22).
This file is the ONLY hand-off between agents. Append to your own phase's row and to the session log;
never rewrite another phase's entry.

## Phases

| Phase | Concern | State | Owner | Notes |
|---|---|---|---|---|
| 00 | What does `board_size` cost, and which `infer_size` ships? | **done** | 00 | **`infer_size` = 96 px, chosen on the test leg. Phase 02 is GO.** `board_size` 1600 buys nothing at inference — negative result, see below. Profile untouched. |
| 01 | Wire `ModelSpec`'s size into `BoardGeometry` so the app can make the crops | **done** | 01 | `TrackerService` is the site. `withCropSizeOf(spec)`; null ⇒ 128. Byte-identical at 128, proven. |
| 02 | Ship `occ-v4-f3e20` at that size | **done** | 02 | Shipped at 96 px, no Kotlin change needed. **The QUANTIZED graph could not follow** and was dropped, not replaced — an out-of-scope bug in `training/quantize.py`, see below. |

States: `todo` → `in progress` → `done` | `blocked`.

## What is already established (do not re-establish)

From `specs/22-inference-resolution/STATUS.md`, measured 2026-07-29/30. `occ-real3`; test split
= 4 736 crops / 74 boards / 1 715 occupied (session `20260708-021722`), val = 4 992 / 78 / 1 546
(`20260721-212830`).

- **`occ-v4-f3e20`**, crops cut straight from the frames: **19 / 0 at 96 px**, 43 / 0 at 128 px on
  test; 14 / 23 at 96 and 29 / 0 at 128 on val. `scales: [32, 64, 96, 128]`, GroupNorm, 2-class.
- **The bundled `occ-r3s-f3`**: 95 / 152 at 128 px, 74 / 243 at 96 px. It carries no `infer_size`
  key, which is how it keeps 128.
- **Untrained input sizes fail silently**: 80 px costs `occ-v4-f3e20` **133** misses (against 38 at
  64 and 19 at 96), 48 px collapses to 916. The exporter rejects a size outside the run's `scales`.
- **The crop box, not the sensor, is what the model sees.** `board_size / 8 × (1 + 2·pad_side)`:
  rig profile 800/0.05 → **110 px**; `config.DEFAULT_BOARD_SIZE` and Android's
  `BoardGeometry.boardSize` 1600 with `padSide` 0.10 → **240 px**. The rig **upsamples** to 128, the
  phone **downsamples**. A 4K session loses 42 % of its linear resolution at the 800 warp.
- **The app cannot currently produce anything but 128 px crops.** `BoardGeometry.outW/outH` default
  to 128 (`core-geometry/.../Corners.kt:67-69`) and `preprocessInto` does not resize — it requires
  `crop.width == outW` (`core-cnn/.../Preprocess.kt:122`). A 96 px model attaches and then dies
  loudly on the first observation. That is phase 01.
- **Each split is one session**, and **val doubles as the checkpoint-selection set** (`best.pt` is
  chosen on val at 128 px). Val is not a clean holdout — weight the test leg.
- **Misses are the dangerous direction**: a miss licenses a fabricated capture, and the recovery
  cascades a whole invented game out of it (MEMORY: `occupancy-miss-vs-phantom`).
- **`--scales` stays in the training recipe.** Dropping it costs both norms their
  resolution-agnosticism; serving at 96 is only possible because 96 was trained.
- **The `infer_size` contract** (specs/22 phase 01): absent ⇒ fall back to `out_size`; the graph is
  `[64, C, H, W]` and is the ground truth; one Python reader `training.torch_data.infer_size_of`,
  one Kotlin reader `ModelSpec.parse`; the exporter validates against `scales`.
- **GroupNorm stays.** At a matched 43 misses: GroupNorm multi-scale 0 phantoms, BatchNorm
  single-scale 2, GroupNorm single-scale 7, BatchNorm multi-scale 293.

## Deliberately out of scope

- **Changing `data/calibration/phone.yaml`.** `board_size` is what the corpus was sliced at; a new
  value decouples the crops on disk from the crops served, which is a retraining question. Phase 00
  measures alternatives **in memory** and may recommend, never change.
- **The 4-crop verify batch** (35.1 ms → 3.67 ms per call, desktop CPU), blocked by
  `ONNX_BATCH = 64` and `require(crops.size == batch)`.
- **GroupNorm on the QNN HTP.** Not ruled out — ORT's builder supports the rank-3
  `InstanceNormalization`, the shapes fold static, and the 227 ms that condemned it was measured on
  the ReLU-less model since fixed. Irrelevant while a 4-crop verify would cost ~10 ms on the CPU.
- **Retraining at a higher warp resolution**, however good phase 00's numbers look.

## Phase 00 — the measurement

`scripts/sweep_warp_resolution.py`, run 2026-07-30 on `occ-real3`, device `cuda` (ROCm), 54 s of
forward passes. Crops re-sliced from the session frames at each (warp, size) pair through
`labeling.crops_for_frame` → `serving.predict_arrays`; the 128 px crops on disk were never touched.
Full log: `data/_perf/sweep_warp.log` (gitignored). `data/calibration/phone.yaml` was **not**
modified — every warp is an in-memory `dataclasses.replace`.

**Sanity anchor:** the 800-warp cells reproduce specs/22 phase 00 to the square — `occ-v4-f3e20`
19 / 0 at 96 px and 43 / 0 at 128 px on test, 14 / 23 and 29 / 0 on val; `occ-r3s-f3` 74 / 243 and
95 / 152 on test. The two sweeps agree, so the warp axis is the only thing that moved.

**The box, not the warp, is the number to read.** `pad_side` stays the profile's 0.05, so the crop
box is `board_size/8 × 1.10` = **110 / 165 / 220 px**. Android's box is **240 px** because its
`padSide` is 0.10 at `boardSize = 1600`, so **the 1600 row is the closest available proxy for the
phone, not the phone** — it is 8 % short in linear box size and its pads cover less of the piece.

### `occ-v4-f3e20` (the candidate) — misses / phantoms at argmax

| input | warp 800 (110 px box) | warp 1200 (165 px) | warp 1600 (220 px) |
|---|---|---|---|
| 64 px | 38 / 0 | 48 / 0 | 35 / 0 |
| **96 px** | **19 / 0** | **34 / 0** | **28 / 0** |
| 128 px | 43 / 0 | 38 / 0 | 44 / 0 |

Val, same run: 6/55, 14/23, 29/0 at 800; 5/52, 12/15, 36/0 at 1200; 2/40, 11/27, 22/1 at 1600
(64 / 96 / 128 px). Zero phantoms in all nine **test** cells.

### `occ-r3s-f3` (the incumbent) — phantoms at a matched 43 misses / test

| input | warp 800 | warp 1200 | warp 1600 |
|---|---|---|---|
| 64 px | 350 | 281 | 373 |
| 96 px | 275 | 253 | 265 |
| **128 px** | **201** | **167** | **198** |

Argmax on test: 98/254, 74/243, 95/152 at 800; 113/212, 87/206, 101/111 at 1200; 101/255, 74/228,
99/146 at 1600 (64 / 96 / 128 px).

### Answer 1 — which `infer_size` phase 02 ships: **96 px**

Chosen on the **test** leg (val is the checkpoint-selection set). 96 px is the best trained size for
`occ-v4-f3e20` at **every** warp, including the 1600 row the app actually uses — so **the answer does
not depend on the warp** and phase 02 needs no warp caveat. At the phone-proxy warp: 96 px gives
28 / 0 against 128 px's 44 / 0 and 64 px's 35 / 0. `occ-v4-f3e20`'s `config.json` already carries
`infer_size: [96, 96]`; nothing about it needs editing.

Val disagrees and is discounted as expected: it prefers **64 px** by argmax misses at every warp
(2–6 misses) but pays 40–55 phantoms for it, and `best.pt` was selected on val at 128 px.

**Phase 02 is GO, not STOP.** The swap is a win at the warp the app uses and at the size it will
ship: `occ-v4-f3e20` @ 96 px, warp 1600 = **28 misses / 0 phantoms**, against the shipped
`occ-r3s-f3` @ 128 px, warp 1600 = **99 / 146**. Misses cut by 72 %, phantoms to zero. The incumbent
is confirmed to want 128 (128 px wins its matched column at every warp), which is why phase 02 is a
model swap and not a re-export.

### Answer 2 — what `board_size` 1600 is worth: **nothing. It costs misses.**

Negative result, reported as one. On the clean test leg, raising the warp from the profile's 800:

- `occ-v4-f3e20` at 96 px: **19 → 34 misses at 1200 → 28 at 1600**, phantoms 0 throughout. The
  1600 warp costs **+9 misses** (+0.5 pp of 1 715 occupied). Summed over the three sizes: 100 misses
  at 800, 120 at 1200, 107 at 1600 — 800 is the best warp on aggregate and holds the single best
  cell in the whole grid (800 / 96 px, 19 / 0).
- `occ-r3s-f3` at its matched operating point, 128 px: 201 → **167** at 1200 → 198 at 1600.

So the movement is **±10 misses out of 1 715 (≤0.6 pp) with no consistent direction** — 1200 helps
the incumbent and hurts the candidate, 1600 lands back near 800 for both. That is jitter, not signal.
The extra warp resolution does nothing at inference.

**Recommendation: do NOT change `data/calibration/phone.yaml`.** There is no accuracy to buy, and the
cost would be re-slicing the entire corpus (every session through `chesslab slice`), rebuilding every
dataset from it, and retraining — the crops on disk would otherwise stop matching the crops served.
The one reading consistent with the numbers is the boring one: the models trained on 110 px boxes and
prefer 110 px boxes, so the sharper crop is a mild domain shift, not free detail. Whether a model
*trained* at a higher warp would do better is untested and out of scope (entry.md).

### Discrepancies found against the spec

1. **The phase file's design block did not account for specs/22 phase 01 landing.** Its recipe seeds
   `serving._CACHE` with `out_size` (that is what `scripts/sweep_infer_size.py` does), but
   `predict_arrays` now reads `infer_size_of(cfg)`, which prefers the `infer_size` key — and both
   runs' `config.json` carry one (96 and 128). Seeding only `out_size` would have silently measured
   each run at its own fixed size, nine identical rows per warp. `install_at_size` sets **both** keys.
2. **`crop.cell` in the profile is dead.** `phone.yaml` stores `cell: 100.0`, but no crop path reads
   it — `square_to_crop_box` and `crop_border_px` both derive the cell from `board_size`. The
   in-memory override re-derives it anyway so it cannot hand a stale number to a future reader, but
   it is a duplicated derived value in a safety-critical config and a cleanup candidate.
3. **Nothing else.** `dataclasses.replace` on `CalibrationProfile` is sufficient for the override:
   the warp recomputes its homography per frame from the log's corners, so the stored `homography`
   is not on the crop path either.

## Phase 01 — the wiring

`ModelSpec` → `BoardGeometry`, one function: `BoardGeometry.withCropSizeOf(spec: ModelSpec?)`
(`app/.../tracker/geometry/ModelCropSize.kt`) copies the crop OUTPUT size out of the spec and changes
nothing else. `null` returns the geometry untouched, so **no model ⇒ 128** and calibration never comes
to depend on a classifier.

**The construction site chosen is `TrackerService`**, and the other two do not need the size:

- `TrackerService.geometry` is the field the crop path actually reads — `TrackerSeed.geometry` →
  `cropFrameSource` → `cropSquare(…, geom)` — and it is the only place **all three** live-geometry
  writes pass through: `start()` (stored profile), `restartTracker()` (orientation) and `calibrate()`.
  There are now exactly three writes and each applies `withCropSizeOf(modelSpec)`; `git grep
  withCropSizeOf` finds all of them.
- `CalibrationProfile.geometry()` (`:71`) **cannot** own it. It is a pure mapping of a persisted
  profile and its second consumer is `ui/calibration/CalibrationRoute.kt:69`, i.e. the calibration
  screen, which must work with no model loaded.
- `CalibrationStore.geometry` (`:74`) is the pre-load default and would not cover `calibrate()`
  anyway: that path comes from `CalibrationRoute` with a `profile.geometry()` of its own and never
  reads the store's field.

The size is read from the asset's `config.json` through the one Kotlin reader (`ModelSpec.parse`),
**not** taken from the attached classifier — the crops must already be the right size when the first
observation runs, and an attach that fails must still leave a calibratable tracker. Re-read in
`restartTracker()` because `modelAsset` is a restart-required knob. Staging is idempotent and
length-guarded, and the read runs on `Dispatchers.IO` because on a fresh install it is the copy that
really moves the graph.

`boardSize`, `margin`, `padSide`, `padUp` and both warps are untouched: the box cut out of the warp
stays 240 px on Android, only the size it is scaled to now comes from the model.

**Step 1 of the phase file was skipped**: `BoardGeometry` needed no change at all — `copy(outW =, outH =)`
on the existing parameters is the whole mechanism, so `:core-geometry` is byte-identical and its test
task was not run.

### Discrepancies found against the spec

1. **`android/app/.../geometry/CalibrationProfile.kt:32` was a second place that knew 128.** The phase
   file names three `BoardGeometry(` sites but the acceptance grep also catches `CropParams.outW: Int =
   128`, a *persisted* crop size that `geometry()` feeds straight into `BoardGeometry`. Its default now
   derives from `BoardGeometry()`. The field itself stays (removing it is a schema bump, which discards
   every stored profile and forces a recalibration — a behavioural delta this phase is not allowed).
2. **detekt caps a class at 15 functions and `TrackerService` was at 14.** The single-funnel
   `adoptGeometry()` helper the design implies is the 15th and fails `:app:detekt` (`TooManyFunctions`,
   `thresholdInClasses: 15`, reported at `>=`). The invariant is therefore documented on the `geometry`
   field and applied at the three write sites, with the asset reader as a private **top-level**
   function (`thresholdInFiles` counts top-level functions only). No `@Suppress`, no baseline entry.
3. **`BoardGeometry.boardSize` is not 1600 on the phone.** `CalibrationStore.measuredBoardSize`
   measures it from the corner quad and clamps it to `320..1280` (step 16), so the entry file's
   "240 px box" is the *default-geometry* figure, not what a calibrated phone produces. It does not
   change this phase — the box is untouched either way — but phase 02 should not quote 240 px as the
   phone's real box.

## Phase 02 — the swap

`android/app/src/main/assets/cnn_model/` now holds `occ-v4-f3e20` at **96 px**. Exported, never
hand-edited; both files are sha256-identical to `data/models/occ-v4-f3e20/`
(`model.onnx` `10ed5764…`, `config.json` `3cae395a…` — LF-normalised, see discrepancy 3).

**No Kotlin change was needed, and that was checked rather than assumed.** Every key `ModelSpec`
reads is identical between the outgoing and incoming runs:

| key | `occ-r3s-f3` (out) | `occ-v4-f3e20` (in) | |
|---|---|---|---|
| `classes` | `["empty","occupied"]` | `["empty","occupied"]` | same — `requireExpectedClasses` accepts the 2-class occupancy order |
| `out_size` | `[128, 128]` | `[128, 128]` | same — the crops on disk, untouched by this pack |
| `normalize.mean/std/mode` | ImageNet / `"fixed"` | ImageNet / `"fixed"` | same ⇒ `perCrop = false` both |
| `input_repr` / `in_chans` | `rgb` / 3 | `rgb` / 3 | same ⇒ `channels = 3` both |
| **`infer_size`** | **`[128, 128]`** | **`[96, 96]`** | **the only difference** |

The rest of the diff (`resumed_from`, `aug.bg_p` 0.15→0.6, `class_weight_override` `{occupied: 3.0}`→`{}`,
`effective_class_weights.occupied` 3.0→2.0) is training provenance that no consumer reads. The
dropped `occupied: 3.0` weight is the one MEMORY blames for the live phantoms
(`per-cell-cap-is-the-real-filter`), which is consistent with the new model measuring 0 of them.

### BLOCKER carried out of this phase — no quantized graph, and it is not phase 02's to fix

`model.qnn.onnx` was **dropped from the asset directory**, not replaced.

- **Cause**, out of scope for this phase (`src/chesslab/**` is off limits to it):
  `training/quantize.py:114` builds the calibration batch with `eval_transform_for(cfg)`, which
  resizes to `cfg["out_size"]` and never consults `infer_size_of`. Against a 96 px graph the
  calibrator therefore feeds a 128 px tensor and ORT refuses it:
  `InvalidArgument … index: 2 Got: 128 Expected: 96`. Reproduces with the phase file's own command
  (`chesslab export --format all`) and with `chesslab quantize --run data/models/occ-v4-f3e20`
  standalone. **The one-line fix is `eval_transform_for(cfg, infer_size_of(cfg))`** plus a decision
  about whether calibrating a 96 px graph on 128 px source crops downscaled to 96 is the same
  preprocessing serving does (it is — serving scales its crop box to `infer_size` too).
- **Why dropping beats keeping the old one.** The graph in the tree was the *incumbent's* weights at
  128×128. Keeping it would leave a graph in the asset directory that contradicts the `config.json`
  beside it and belongs to a different model — exactly the drift `b24f1f3` produced. Nothing can run
  it today either: the QNN AAR is not a dependency of this build (`app/build.gradle.kts:89-95`,
  84.7 MB removed), `StagedModel.qnn` is nullable by design, and `epChain` skips the QNN EP when the
  graph is absent. A QNN-capable build with no quantized graph runs on XNNPACK/CPU; a QNN-capable
  build with the WRONG quantized graph throws in `OnnxSquareClassifier`'s init on every attach.
- **Consequence for the NPU direction**: re-adding QNN now needs the quantize fix first. Old model
  reachable in git at `fc3abfb`.

### Follow-up, also out of this phase's scope — the sim harness cuts 128 px crops

`app/src/test/.../tracker/sim/ClipPipeline.kt:53` builds `BoardGeometry(boardSize = clip.boardSize)`
with no `withCropSizeOf`, so `CnnClipSimulationTest` will now die on
`crop 0 is 128x128, expected 96x96` at the first observation. **Not a gate** — the class is
`@EnabledIfSystemProperty("chesslab.sim")` and opt-in — and not in this phase's file scope, but the
18-clip CNN harness is unusable until it takes its crop size from the model the same way
`TrackerService` now does. It fails loudly, never silently.

### Discrepancies found against the spec

1. **`--format all` cannot export this run.** The phase file's step 2 command fails on the `qnn`
   leg (above) after writing `model.onnx` and `model.torchscript.pt`, and returns non-zero without
   writing `model_card.json`. `--format onnx` was used instead. Re-exporting was idempotent to the
   byte: the resulting `model.onnx` is sha256-identical to the one already in the run directory.
2. **`--infer-size 96x96` was passed but was a no-op** — `occ-v4-f3e20`'s `config.json` already
   carried `infer_size: [96, 96]`, exactly as phase 00 recorded. Verified, not assumed.
3. **"sha256-identical to the run directory" cannot survive a checkout for `config.json`.**
   `.gitattributes` pins `*.json text eol=lf` while `chesslab export` writes it through Python's
   default newline translation, i.e. CRLF on this machine. So the two files match byte-for-byte on
   disk *now*, and both match the committed blob and the run directory once LF-normalised
   (`629c713a…`), but a fresh checkout gives the asset LF against the run directory's CRLF. The
   durable check is the graph's sha256 (`*.onnx binary`, exact: `10ed5764…`) plus the config's
   parsed content.
4. **Five existing tests had 128 written into them and read the real asset.** Three of them build
   real ORT sessions, so those were shape mismatches rather than stale comments:
   `BundledGraphShapeTest`, `OrtSessionRunnerTest`, `OnnxSquareClassifierContractTest`'s real-asset
   test; plus `ModelSpecTest` (asserted `outWidth == 128`) and `EpRequestChainTest` (staged
   `MODEL_QNN_FILE`, now absent). All now take the shape from `ModelSpec`, the one runtime reader.
   The spec's "no Kotlin change should be needed" holds for `main/` — it did not hold for `test/`.
5. **The stale `240 px` sightings are all correctly qualified.** `ModelSpec.kt:35` and
   `ModelSpecTest.kt:53` say "on this app's *default* geometry", which is true; nothing in
   `cnn/**` claims 240 is a calibrated phone's box. Left as they are, per phase 01's correction.

## Session log

<!-- Append: date — phase — what was measured/changed — the numbers — what is left. -->

- **2026-07-30 — phase 00 — warp × input-size sweep, 2 runs × 2 splits × 3 warps × 3 trained sizes.**
  New `scripts/sweep_warp_resolution.py` (measurement only; nothing else touched, profile untouched,
  `git diff --stat -- data/calibration` empty). **Answer 1: `infer_size` = 96 px**, chosen on test,
  best at all three warps for `occ-v4-f3e20` — 19/0 at warp 800, 28/0 at warp 1600 (the phone proxy),
  against 128 px's 43/0 and 44/0. **Phase 02 is GO**: v4 @ 96 / warp 1600 = 28 misses / 0 phantoms vs
  the shipped `occ-r3s-f3` @ 128 / warp 1600 = 99 / 146. **Answer 2: `board_size` 1600 buys nothing**
  — ±10 misses of 1 715 in either direction with no consistent trend, and 800 / 96 px is still the
  best cell in the grid; recommendation is to leave `phone.yaml` alone. Val prefers 64 px at every
  warp but at 40–55 phantoms and is discounted (checkpoint-selection set). Ruff clean; no tests (a
  measurement script, per the phase file). Left for 02: the swap itself, gated on 01 making the app
  able to cut 96 px crops.

- **2026-07-30 — phase 01 — the app can now cut crops at the size the model declares.** Two commits
  (`5cc247f` wiring, `a0bf217` tests) on `spec-23-resolution-all-the-way-down`; step 1 skipped,
  `:core-geometry` untouched. `ModelSpec` → `BoardGeometry` via `withCropSizeOf`, applied at the three
  `TrackerService` writes; the size is read from the asset's `config.json` (`ModelSpec.parse`), null ⇒
  the 128 defaults. **No behavioural delta proven, not asserted**: with a `[128, 128]` spec — what the
  bundled `occ-r3s-f3` carries — all 64 crops are byte-for-byte identical to the hard-coded path
  through the real observer adapter (`cropFrameSource` → `cropSquare`), and the reference crops are
  asserted non-uniform so the comparison is not vacuous. A `[96, 96]` spec yields 96×96 crops that
  `preprocessInto` accepts — the call that used to throw `crop 0 is 128x128, expected 96x96`.
  Ran: `:app:testDebugUnitTest --tests 'com.chesslab.tracker.geometry.*'` → **21 tests, 0 skipped,
  0 failures** (6 new + 15 existing profile/store/orientation), and `:app:ktlintCheck :app:detekt`
  clean after the `TooManyFunctions` fix above. Not run (orchestrator's gate): `assembleDebug`, the
  full unit-test task, instrumentation. **Phase 02 is unblocked** — 00 picked 96 px and the app can
  now produce it; nothing further is needed from 01 to ship it.

- **2026-07-30 — phase 02 — the app now ships `occ-v4-f3e20` at 96 px.** Two commits on
  `spec-23-resolution-all-the-way-down`: `2afb8e0` (asset) and `dc5e4d0` (tests). What it measured, on
  `occ-real3`'s test split at the warp the app uses (phase 00's grid, not re-measured here):
  **28 misses / 0 phantoms**, against the outgoing `occ-r3s-f3` @ 128 px's **99 / 146** — misses down
  72 %, phantoms to zero, and the miss is the direction that cascades a fabricated game. No Kotlin
  change in `main/`: verified key by key that `classes`, `out_size`, `normalize.mode`, `input_repr`
  and `in_chans` are identical between the two runs and only `infer_size` moves (table above).
  **Negative result, carried out as a blocker:** the quantized graph could NOT follow — `quantize.py`
  calibrates at `out_size`, so `chesslab quantize` feeds a 128 px tensor to the 96 px graph and ORT
  refuses it; `model.qnn.onnx` was dropped rather than left behind as the previous model's 128 px
  graph. Nothing runs it today (no QNN AAR in this build), but re-adding the NPU path now needs that
  one-line fix in `src/chesslab/` first. Second follow-up: the opt-in 18-clip
  `CnnClipSimulationTest` will now throw, because `ClipPipeline` still cuts 128 px crops.
  New `ModelSpecCropSeamTest` runs config.json → `ModelSpec` → `withCropSizeOf` → real warp →
  `cropFrameSource` → real ORT session with no fake in the chain, and asserts the negative too: an
  unwired 128 px geometry is refused by name, so phase 01's wiring is proven load-bearing.
  Ran ONCE each: `:app:testDebugUnitTest --tests 'com.chesslab.tracker.cnn.*'` → **50 tests,
  0 failures, 1 skipped** (the optional extra-model leg, which now correctly skips instead of
  failing), and `:app:ktlintCheck :app:detekt` → clean, no `@Suppress`, no baseline entry. The first
  test run found 3 failures in existing asset-reading tests (discrepancy 4) and was re-run after
  fixing them. Not run (orchestrator's gate): `assembleDebug`, the full unit-test task,
  instrumentation, `pytest`. Batch stays 64, norm stays GroupNorm, threshold stays argmax,
  `phone.yaml` untouched. **The pack's phases are all done.**
