# Phase 05c — ONNX classifier + the CNN observer thread

> Module `:app`, package `com.chesslab.tracker.cnn`. Runs in parallel with 05a and 05b on
> strictly disjoint files. Read `entry.md` completely first.
>
> `android-legacy/**` is a **known-wrong implementation**. Read
> `android-legacy/app/src/main/kotlin/com/chesslab/tracker/cnn/OnnxClassifier.kt` for ONNX
> Runtime API usage (session options, `addQnn`, `addNnapi`, `OnnxTensor` from a
> `FloatBuffer`) ONLY — never for architecture or tracker logic.

## Why

`:core-cnn` (phase 02c) defines `SquareClassifier` as an interface precisely so the
parity-critical observation model stays on the desktop JVM. This phase supplies the one
Android implementation and the thread that drives it.

Two recorded failures shape the whole design:

- **Silent degradation.** MEMORY (`android-live-bringup-2607`): *"CNN-Attach schlug STILL
  fehl"* — the model load failed, `CnnIntegration.attach` swallowed it, and the tracker ran
  diff-only for a whole session with nobody noticing. Commit `a7dab73` had to add a loud
  log as an afterthought. **A CNN that is supposed to be on and is not must be impossible
  to miss.**
- **Hardcoded normalization.** Commit `ee7c83c` (`fix(android): read normalization mean/std
  from the run config.json`) — the classifier hardcoded ImageNet stats while every run's
  `config.json` carries the real ones. Anything derivable from `config.json` is read from
  `config.json`.

Python reference for the observer: `tracker.py::_observer_due:1716-1720`,
`_cnn_worker:1771`, `_observe_snapshot:1796`.

## Design (decided — do not redesign)

### Assets and model spec

```
android/app/src/main/assets/cnn_model/
  model.onnx        # FP32, opset 17, dynamic batch  -> NNAPI / CPU
  model.qnn.onnx    # INT8/QDQ                       -> QNN HTP only
  config.json       # classes, out_size, normalize{mean,std}
```

- Input `input`, shape `[batch, 3, 128, 128]`, **NCHW float32**. Output `logits`.
  Batch is genuinely dynamic (exported with a batch-2 example).
- `ModelSpec.parse(configJson)` reads `classes`, `out_size`, `normalize.mean`,
  `normalize.std`. **Nothing is hardcoded** except the pre-`normalize`-key ImageNet
  fallback (matching `quantize.py:172-174`), which stays only for old configs.
- **Assert the class list.** `ModelSpec.parse` throws `IllegalStateException` unless
  `classes` equals, in order:
  `empty, wP, wN, wB, wR, wQ, wK, bP, bN, bB, bR, bQ, bK, occluded`
  (`src/chesslab/config.py CLASSES` — CLAUDE.md: "the canonical class list exists in
  exactly one place"). A reordered list silently relabels every piece; refusing to load is
  the only safe answer.
- Assert `out_size == [128, 128]`; a mismatch is a load failure with a named reason.
- Assets are copied to `context.filesDir/cnn_model/` on first use (ORT needs a real path
  for the QNN backend library); the copy is checksum/size-guarded so it happens once.

### Execution-provider chain (in this order, each guarded)

1. **QNN → Hexagon HTP (NPU)** — attempted **only if `model.qnn.onnx` exists**. The HTP
   backend rejects float32 graphs, so QNN gets the **quantized** file and nothing else.
   Options: `backend_path = libQnnHtp.so`, `htp_performance_mode = burst`.
2. **NNAPI** — on `model.onnx` (FP16 allowed).
3. **CPU** — always works; this is also where the desktop JVM unit tests land.

Each step is `runCatching`; the first that builds a session wins. The winner is recorded in
`val backend: String` (e.g. `QNN-HTP(NPU)`, `NNAPI`, `CPU`) and logged **once** at INFO:
`CNN inference backend: <backend> (model=<file>, classes=14)`.

### Loud failure — `CnnState`

```kotlin
sealed interface CnnState {
    data object Off : CnnState                       // user disabled the CNN
    data object Attaching : CnnState
    data class Ready(val backend: String, val model: String) : CnnState
    data class Failed(val reason: String) : CnnState // reason is human-readable, non-empty
}
```

- Exposed as `StateFlow<CnnState>` from `CnnObserver`; 06c mirrors it into
  `TrackerStatus.note` when `Failed`, and 07b renders it verbatim on the debug screen.
- Every transition logs at its level: `Attaching` INFO, `Ready` INFO with the EP,
  **`Failed` at ERROR with the throwable**. `catch {}` without a state transition and a log
  is forbidden — the acceptance grep checks for it.
- `Failed` is sticky per session: the observer stops spawning work and does not silently
  retry forever. `retryAttach()` exists for the debug screen (07b) to call explicitly.

### Inference

- **All 64 crops in ONE `OrtSession.run`.** No per-square calls, no chunking.
- One reusable direct `FloatBuffer` of `64 * 3 * 128 * 128` floats; the `OnnxTensor` is
  created per call from that buffer (ORT requires it) but the backing memory is not
  reallocated. Reuse the output float array.
- Softmax over `logits` per row; return `List<FloatArray>` in crop order.
- Preprocessing (crop → NCHW float, `/255`, mean/std) is **`:core-cnn`'s `Preprocess.kt`
  from phase 02c** (Python: `serving.py:318-400 predict_arrays`). Call it. **Do not
  reimplement it here** — a second copy is a parity fork waiting to happen.
- `close()` closes the session and the environment reference.

### The observer thread (port `_cnn_worker:1771` / `_observe_snapshot:1796`)

`CnnObserver` owns a **single-thread dispatcher** (`Executors.newSingleThreadExecutor()
.asCoroutineDispatcher()`, thread `chesslab-cnn`). It is the only place inference runs.

- **Spawn guard** = `_observer_due:1716-1720`:
  `cnnEnabled && state !is Failed && !cnnBusy && (now - observerStartedMs) >= observerIntervalS * 1000`.
- `cnnBusy` serializes to **one observation at a time**; cleared in `finally`.
- Per observation, given the crop frame from 05b's `CropFrameStore` plus `seq`, `corners`
  and the game `fen` captured **at observation start**:
  1. 64 crops via `:core-cnn` preprocessing from the **bordered** warp.
  2. One batched `predict`.
  3. Build the `:core-cnn` `OccupancyObservation`.
  4. Build `CnnSnapshot(obs, seq, tsMs, inferMs, warped, gray, fen)` — `warped`/`gray` are
     the observed frame's warps **at `detSize`** (entry.md invariant 1 and 5: recovery and
     verify commits anchor on the frame the CNN actually looked at, never on `lastCur`).
     `fen` is the discard-on-change guard.
  5. Hand it to `TrackerEngine.onCnnSnapshot(snap)` — **through the callback 06c wires**,
     which marshals it onto the engine's single owning thread. The observer never touches
     the engine directly (entry.md hard rule 2: the engine is driven by exactly one thread).
- **Failure backoff**: an observation that throws logs WARN and pushes
  `observerStartedMs = now + 1000` (Python's identical guard at `_observe_snapshot:1809`)
  so `observerIntervalS = 0` cannot retry-and-log at loop rate.
- `inferMs` is measured around the `run` call only and surfaced for the debug screen.
- The observer **never blocks the analyzer thread**: its only inbound coupling is
  `CropFrameStore.wantsFrame()`/`take()` (05b), which is non-blocking on the producer side.

## Files you own

Create under `android/app/src/main/kotlin/com/chesslab/tracker/cnn/`:

- `ModelSpec.kt` — `config.json` parsing + class-order/out-size assertions. **≤ 120 LOC.**
- `OnnxSquareClassifier.kt` — `:core-cnn` `SquareClassifier` impl, EP chain, batched run.
  **≤ 220 LOC.**
- `CnnModelAssets.kt` — asset → `filesDir` copy, model-file selection per EP.
- `CnnState.kt` — the state type + log helper.
- `CnnObserver.kt` — single-thread dispatcher, spawn guard, `cnnBusy`, snapshot build.
  **≤ 200 LOC.**

Tests under `android/app/src/test/kotlin/com/chesslab/tracker/cnn/`:

- `ModelSpecTest.kt`, `CnnStateTest.kt`, `CnnObserverScheduleTest.kt`,
  `OnnxSquareClassifierContractTest.kt` (against a fake `OrtSession` seam)

You own no other file. Need something in `camera/`, `pipeline/`, `service/`, `:core-cnn`,
or the version catalog? **STOP** and record a blocker in `STATUS.md`.

## Steps

### 1. `cnn/ModelSpec.kt` — config-driven spec with hard class assertion — commit `feat(android-cnn): ModelSpec from config.json with a hard 14-class order assertion`
### 2. `cnn/CnnState.kt` + `cnn/CnnModelAssets.kt` — commit `feat(android-cnn): explicit CNN attach state and asset staging`
### 3. `cnn/OnnxSquareClassifier.kt` — EP chain + batched 64-crop run — commit `feat(android-cnn): ONNX SquareClassifier — QNN(NPU) -> NNAPI -> CPU, 64 crops per run`
### 4. `cnn/OnnxSquareClassifier.kt` — loud failure path — commit `fix(android-cnn): CNN attach failure is loud — ERROR log, sticky Failed state, no silent degrade`
### 5. `cnn/CnnObserver.kt` — observer thread — commit `feat(android-cnn): single-thread free-running observer producing CnnSnapshot`
### 6. Tests — commit `test(android-cnn): model spec assertions, observer pacing, attach-failure visibility`

## Tests

`:app:testDebugUnitTest`, JVM only. The ORT native session cannot be built on the desktop
JVM — put the session behind a small internal `SessionRunner` seam and test the wrapper
against a fake. **UI/instrumented tests are NOT required**; the real EP selection is covered
by the manual checklist.

`ModelSpecTest`
- `parses_classes_out_size_and_normalize_from_the_real_asset_config` — load the committed
  `assets/cnn_model/config.json`; assert mean `[0.485, 0.456, 0.406]`, std
  `[0.229, 0.224, 0.225]`, `out_size [128,128]`.
- `rejects_reordered_class_list` — swapping `wN`/`wB` throws.
- `rejects_wrong_class_count`.
- `rejects_out_size_other_than_128`.
- `falls_back_to_imagenet_when_normalize_key_is_absent` — and **only** then
  (`ee7c83c` regression).

`OnnxSquareClassifierContractTest` (fake `SessionRunner`)
- `runs_all_64_crops_in_a_single_session_call` — 64 crops → exactly 1 invocation.
- `input_tensor_is_nchw_batch_3_128_128`.
- `softmax_rows_sum_to_one_and_map_to_spec_classes`.
- `reuses_the_input_buffer_across_calls` — no reallocation over 10 batches.
- `prefers_quantized_model_for_qnn_and_fp32_otherwise` — EP/file pairing.

`CnnStateTest`
- `attach_failure_produces_Failed_with_a_non_empty_reason_and_an_error_log`.
- `failed_state_is_sticky_until_retryAttach`.

`CnnObserverScheduleTest` (virtual clock, fake classifier)
- `only_one_observation_in_flight` — 100 offered frames while busy → 1 run.
- `respects_observer_interval_s`.
- `does_not_spawn_while_failed`.
- `failure_backs_off_one_second_even_at_interval_zero`.
- `snapshot_carries_the_observed_seq_and_the_fen_captured_at_start` — a FEN changed
  mid-inference does **not** overwrite `snap.fen` (invariant 5 / discard-on-change).

Run once, at the end of your phase:
```
cd android; .\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.cnn.*"
cd android; .\gradlew.bat :app:ktlintFormat; .\gradlew.bat :app:detekt
```

## Manual verification checklist (record results in `STATUS.md`)

- [ ] Logcat shows exactly one `CNN inference backend: …` line and it names **QNN-HTP(NPU)**
      on the Poco F7 Pro.
- [ ] Rename `model.qnn.onnx` in the staged dir → backend falls back to NNAPI, one line, no crash.
- [ ] Corrupt `config.json` → `CnnState.Failed(reason)` visible in the app **and** an ERROR
      in logcat; the tracker keeps running diff-only but says so.
- [ ] Steady-state `inferMs` recorded in `STATUS.md` (expect ~30-45 ms for 64 crops).

## Acceptance criteria

- `grep -rn "0.485\|0.229" android/app/src/main/kotlin/com/chesslab/tracker/cnn/` hits
  `ModelSpec.kt` only, and only inside the documented legacy fallback.
- `grep -rn "wP\|bK" android/app/src/main/kotlin/com/chesslab/tracker/cnn/` hits only the
  assertion list in `ModelSpec.kt` — no other class list exists in `:app`.
- `grep -n "addQnn" cnn/OnnxSquareClassifier.kt` is guarded by a `model.qnn.onnx` existence
  check in the same function.
- `grep -rn "catch" android/app/src/main/kotlin/com/chesslab/tracker/cnn/` — every hit is
  followed by a log call **and** a `CnnState` transition or a rethrow. No bare swallow.
- `grep -rn "normalize\|Preprocess" cnn/` shows preprocessing is *called* from `:core-cnn`,
  never implemented in `:app` (`grep -rn "255f\|/ 255" cnn/` is empty).
- `grep -c "session.run\|runner.run" cnn/OnnxSquareClassifier.kt` — exactly one call site.
- File LOC limits respected; all named tests green; ktlint/detekt clean for `:app`.

## Do NOT

- Do not hardcode class names, class count, mean/std, or crop size outside the assertion
  in `ModelSpec.kt` (`ee7c83c`).
- Do not reimplement `:core-cnn`'s preprocessing, `OccupancyObservation`, or any scoring —
  this phase is inference plumbing only.
- Do not call `TrackerEngine` from the observer thread; hand snapshots to the callback 06c
  wires (entry.md hard rule 2).
- Do not swallow an attach or inference failure. No empty `catch`, no `Failed` without a
  reason, no `Ready` without a named EP.
- Do not feed the FP32 graph to the QNN EP or the quantized graph to NNAPI/CPU.
- Do not chunk the 64 crops or add a per-square path.
- Do not touch `camera/`, `pipeline/`, `service/`, `ui/`, the manifest, or
  `libs.versions.toml`.
