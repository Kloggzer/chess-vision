# Phase 02 — The app reads the size instead of asserting 128

**Blocked by 01. Start only when 01 is committed — its `infer_size` contract is this phase's
input.**

## Why

`ModelSpec.kt:56` refuses to load any model whose `out_size` is not 128×128:

```kotlin
require(outWidth == CROP_SIZE && outHeight == CROP_SIZE) {
    "model out_size is ${outWidth}x$outHeight, this app crops ${CROP_SIZE}x$CROP_SIZE"
}
```

The assertion is right in spirit — its docstring says "asserted, never assumed" — but it asserts
against a **literal in the app** instead of against the graph the app is about to run. So it
cannot express "this model wants 96" and it never checked the one thing that actually matters:
that the ONNX input shape and the preprocessing agree.

The rest of the pipeline is already size-agnostic: `preprocessInto` takes `outW`/`outH`
(`android/core-cnn/src/main/kotlin/com/chesslab/cnn/Preprocess.kt:122`) and
`OnnxSquareClassifier` derives its tensor shape and buffers from `spec.outWidth`/`outHeight`
(`:143`, `:152`, `:158`). Feed the spec a different number and the whole path follows — including
preprocessing, which shrinks from 3.1 M floats per observation to 1.7 M and is the half that no
accelerator makes faster.

## Design (decided — do not redesign)

### 1. The spec reads the inference size

In `ModelSpec.parse` (`ModelSpec.kt:51`):

```kotlin
val size = root["infer_size"]?.jsonArray ?: root.getValue("out_size").jsonArray
val outWidth = size[0].jsonPrimitive.content.toInt()
val outHeight = size[1].jsonPrimitive.content.toInt()
```

`outWidth`/`outHeight` keep their names and their meaning to every consumer: **the size the app
resizes crops to**. The fallback keeps every previously shipped asset loadable.

### 2. The literal guard becomes a range guard plus a graph assertion

Delete `CROP_SIZE` (`:14`) and the `require` at `:56`. Replace with a sanity band, since a parse
error must still not reach the network:

```kotlin
require(outWidth in 32..512 && outHeight in 32..512) {
    "model input size ${outWidth}x$outHeight is outside the plausible range"
}
```

The real check moves to where the graph is known — `OnnxSquareClassifier`, at session creation:
read the input's declared shape from ORT (`session.inputInfo.values.first().info` →
`TensorInfo.shape`) and require its last two dims to equal `spec.outHeight` and `spec.outWidth`,
failing with both numbers in the message. **This is the assertion the old one was standing in
for**: the app now compares against the artifact instead of against itself.

The band is deliberately not the whole safety story. Phase 00 measured that an **untrained** size
fails silently — 80 px costs `occ-v4-f3e20` 133 misses against 96 px's 19, with no error anywhere —
and 80 is inside `32..512`. That guard belongs where the trained `scales` are known, which is the
exporter (phase 01), not the app. Do not try to re-derive it here from the asset's `config.json`.

### 3. Re-export the bundled asset — at **128**, not 96

**Phase 00 measured this and 96 px would make the shipped app worse.** The bundled run is
`data/models/occ-r3s-f3` (identified by sha256-identical `config.json` / `model.onnx` /
`model.qnn.onnx` — use that check, not the `resumed_from` grep, which matches eight runs). Its
numbers on the test session: **95 misses / 152 phantoms at 128 px**, **74 / 243 at 96 px** — 91 more
phantoms and worse at the matched operating point. Serving at 96 arrives with the model that wants
it, which is a model decision this pack does not take.

So re-export it with the key made explicit at its current size:

```bash
uv run chesslab export --run data/models/occ-r3s-f3 --format all --infer-size 128x128
```

Copy `model.onnx`, `model.qnn.onnx` and the updated `config.json` into
`android/app/src/main/assets/cnn_model/`. **Do not hand-edit the asset's `config.json`** — that is
how the shipped graph and its description drifted apart the last time (`b24f1f3`).

This makes the phase a **pure mechanism change with no behavioural delta**: the app stops asserting
128 and starts reading it, and reads 128. Confirm that explicitly — the graph's input shape and the
per-square outputs must be unchanged against the current asset. A phase that changes the mechanism
and the numbers at once cannot be reviewed.

Android's own framing is a **240 px** crop box — `TrackerConfig.boardSize = 1600` with `padSide` at
its default **0.10** (`BoardGeometry.padSide`, matching `config.CROP.pad_side`, `config.py:88`), not
the 0.05 the rig profile overrides to. So unlike the fixed rig the phone **downsamples** to 128 and
has no upsampling to avoid. What it should use is an open question in `STATUS.md`, not this phase's
to answer.

### 4. What must NOT change

`private val batch = ALL_SQUARES.size` and `require(crops.size == batch)`
(`OnnxSquareClassifier.kt:142`, `:161`) stay. The 4-crop verify batch is a different change.

## Steps

### 1. `android/.../cnn/ModelSpec.kt` — commit `feat(android): read the model's inference size instead of asserting 128`

### 2. `android/.../cnn/OnnxSquareClassifier.kt` — commit `feat(android): assert the ONNX input shape against the model spec`

### 3. `android/app/src/main/assets/cnn_model/` — commit `chore(android): re-export the bundled model at 96px`

## Tests (write, run once, targeted)

In `android/app/src/test/kotlin/com/chesslab/tracker/cnn/` (the directory exists — find the
existing spec test with `grep -rln "ModelSpec" android/app/src/test`):

1. `parses infer_size when present` — `{"infer_size":[96,96],"out_size":[128,128], …}` yields
   `outWidth == 96`.
2. `falls back to out_size when infer_size is absent` — the shipped-model compatibility case.
3. `rejects an implausible size` — `[8,8]` throws.
4. **The seam test, and the deliverable of this phase**: load the **real bundled asset** through
   the **real ORT session** and assert the graph's declared input shape equals the parsed spec's
   size. A test with a fake session on either side proves nothing about the seam — this one must
   run the actual `.onnx` from `assets/`.

```
gradlew.bat :app:testDebugUnitTest --tests '*ModelSpec*'
```

Run **once**. Do not run `assembleDebug`, the full unit-test task, or instrumentation — the
orchestrator's gate does that on the merged tree.

## Acceptance criteria

- `grep -rn "CROP_SIZE" android/` returns **nothing**.
- `grep -n "infer_size" android/app/src/main/assets/cnn_model/config.json` hits, and the value is
  `[128, 128]` — explicit, no longer implied.
- `.venv/Scripts/python.exe -c "import onnx; m=onnx.load('android/app/src/main/assets/cnn_model/model.onnx'); print([d.dim_value for d in m.graph.input[0].type.tensor_type.shape.dim])"`
  prints `[64, 3, 128, 128]` — **unchanged**. This phase changes the mechanism, not the numbers.
- A 96 px asset loads and runs when handed one: build one into a temp dir with
  `--infer-size 96x96` from `data/models/occ-v4-f3e20` and point the seam test at it. That proves
  the mechanism works without shipping the regression.
- `grep -n "require(crops.size == batch)" android/app/src/main/kotlin/com/chesslab/tracker/cnn/OnnxSquareClassifier.kt`
  still hits.
- `gradlew.bat :app:ktlintCheck :app:detekt` — zero new findings; style fixed with
  `:app:ktlintFormat`, never by hand, and no `@Suppress` added.

## Do NOT / out of scope

- Do not touch anything under `src/chesslab/` — phase 01 owns the Python side and is finished.
- Do not touch `docs/`, `README.md` or `CLAUDE.md` — phase 03 owns them and may be running
  concurrently.
- Do not change the batch size, add a second session, or "while we are here" split the verify
  path into a small-batch session.
- Do not regenerate the parity fixtures. `android/core-engine/src/test/resources/parity/_cnn/`
  carries **synthetic probabilities** — its `meta.json` says `"no trained model is involved"` — so
  the inference size cannot affect them. If a parity test does fail, that is a blocker to record,
  not a fixture to overwrite.
