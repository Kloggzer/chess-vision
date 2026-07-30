# Phase 01 — The app can only make 128 px crops. Let the model decide.

**Parallel with phase 00 — Kotlin only, no shared file. Mechanism change with NO behavioural delta.**

## Why

specs/22 gave the app a model-declared input size and an assertion that the ONNX graph agrees with
it. It did not give the app the ability to *produce* crops at that size:

- `BoardGeometry.outW` / `outH` default to **128**
  (`android/core-geometry/src/main/kotlin/com/chesslab/geometry/Corners.kt:67-69`) and nothing wires
  `ModelSpec` into them.
- `preprocessInto` does **not** resize. It requires `crop.width == outW`
  (`android/core-cnn/src/main/kotlin/com/chesslab/cnn/Preprocess.kt:122`).

So a 96 px model attaches cleanly — spec and graph agree, specs/22's assertion passes — and then dies
on the first observation with `crop 0 is 128x128, expected 96x96`. Loud, never silently wrong, but the
app holds a second input size that the model cannot reach. This phase closes that.

## Design (decided — do not redesign)

**One direction of flow: `ModelSpec` → `BoardGeometry`.** The model declares, the geometry follows.
Never the reverse, and never a third place that also knows 128.

Three construction sites build a `BoardGeometry`; find them again with
`grep -rn "BoardGeometry(" android/app/src/main/kotlin`:

- `tracker/geometry/CalibrationProfile.kt:71`
- `tracker/geometry/CalibrationStore.kt:74`
- `tracker/service/TrackerService.kt:92`

Give `BoardGeometry` its crop size from the loaded `ModelSpec`'s `outWidth`/`outHeight` at whichever
of these is the single place the tracker's live geometry is assembled — read the three and decide;
**do not thread the size through all three if one owns it.** State in your report which one you chose
and why the other two do not need it (or, if they do, why).

Constraints on the wiring:

- **When no model is loaded, the geometry keeps its current 128 defaults.** Calibration must work
  before a classifier attaches; nothing may become dependent on a model being present.
- `padSide`/`padUp`/`boardSize` are **untouched**. This phase changes the output size of the crop, not
  the box it is cut from.
- The crop box in source pixels stays `boardSize/8 × (1 + 2·padSide)` = 240 px on Android. That box is
  then scaled to `outW × outH`. Changing `outW` from 128 to 96 changes only that final scale.
- **No behavioural delta while the shipped model declares 128.** The bundled asset carries
  `infer_size: [128, 128]`, so the wired path must produce exactly what the hard-coded path produced.
  Prove that, do not assert it.

## Steps

### 1. `android/core-geometry/**` if the data class needs anything — commit `feat(geometry): the crop output size is a parameter, not a default`

Only if `BoardGeometry` actually needs a change. If passing the values at construction already
suffices, **skip this commit** and say so.

### 2. the chosen construction site — commit `feat(android): crop at the size the model declares`

### 3. tests — commit `test(android): the model's input size reaches the crop pipeline`

## Tests (write, run once, targeted)

In the Kotlin test tree next to the code you changed (`grep -rln "BoardGeometry(" android/*/src/test`
to find where geometry is already tested):

1. **A 96 px spec produces 96 px crops.** Construct the live geometry from a `ModelSpec` with
   `outWidth = 96` and assert the crops handed to the classifier are 96×96 — i.e. that
   `preprocessInto`'s requirement is satisfied rather than merely not triggered.
2. **A 128 px spec is byte-for-byte what the old path produced.** This is the no-behavioural-delta
   proof and the most important test here: same corners, same frame, crops identical to the
   hard-coded-128 path.
3. **No model loaded ⇒ 128.** Calibration-before-classifier must not regress.

```
gradlew.bat :app:testDebugUnitTest --tests '<your test class>'
```

Plus `:core-geometry:test` **only if** you changed `core-geometry`. Run each **once**. Do NOT run
`assembleDebug`, the full unit-test task, or instrumentation.

## Acceptance criteria

- `grep -rn "outW = 128\|outW: Int = 128" android/` shows the default only in `BoardGeometry`'s
  declaration — no consumer re-states it.
- The live path's crop size comes from `ModelSpec`: `git grep -n "outWidth" -- android/app/src/main`
  shows it reaching the geometry construction.
- Targeted tests green, named in the report with their counts.
- `gradlew.bat :app:ktlintCheck :app:detekt` (plus `:core-geometry:` equivalents if touched) — zero
  new findings, style via `ktlintFormat`, no `@Suppress`, no baseline entries.

## Do NOT / out of scope

- Do not touch `tracker/cnn/**` — that is specs/22's freshly landed code and phase 02's territory.
- Do not touch the bundled asset, `ModelSpec.kt`, or `OnnxSquareClassifier.kt`.
- Do not change `boardSize`, `padSide`, `padUp`, or the warp.
- Do not change anything under `src/chesslab/` — the Python side already reads `infer_size`.
- Do not make the calibration path require a model.
