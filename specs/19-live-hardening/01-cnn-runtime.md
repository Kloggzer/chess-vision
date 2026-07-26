# Phase 01 — The ONNX session is unconfigured, and every timing on record is a cold batch

## Why

The only on-device CNN number ever written down is **97 ms per 64 crops**, and it is not a
steady-state measurement: it is a cold warm-up batch with ORT profiling armed. The session
that produced it sets nothing at all — no thread count, no execution mode, no graph
optimisation level. `Ep.CPU` is literally a no-op branch. And the AAR the app ships
(`onnxruntime-android-qnn` 1.21.1) contains **zero `xnn_` symbols and zero
`ANeuralNetworks` symbols** — verified at the ELF level — so XNNPACK and NNAPI are not
merely unused, they are absent.

The workload is small: 627k parameters, `[64,3,128,128]`. On a desktop the same shipped
graph runs 47.3 ms single-threaded and 19.3 ms unrestricted — threading alone is ~2.5×.

The Hexagon NPU now works (`ADSP_LIBRARY_PATH` + a fixed batch dim, commit `4df4ade`) but
is **slower** than the CPU at 227 ms, because QNN cannot execute the 46
`InstanceNormalization` blocks and partitions the graph. That is phase 04's root cause, not
this phase's — here we make the CPU path honest and fast.

## Design (decided — do not redesign)

### 1. Configure the session

`android/app/src/main/kotlin/com/chesslab/tracker/cnn/OrtSessionRunner.kt`, in `options()`:

```kotlin
opts.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
opts.setExecutionMode(OrtSession.SessionOptions.ExecutionMode.SEQUENTIAL)
opts.setIntraOpNumThreads(CPU_THREADS)
```

`CPU_THREADS = 4` — the big-core count on the target SoC (SM8650: 1×X4 + 5×A720 + 2×A520).
Name it a constant with that reasoning in a comment. `SEQUENTIAL` is deliberate: this is a
single batched graph, inter-op parallelism has nothing to overlap.

### 2. Stop arming profiling permanently

`OrtSessionRunner.kt:72` calls `enableProfiling` at construction, unconditionally, and it is
only ended inside `profiledProvider()`. Every attach therefore pays per-kernel trace
instrumentation across 473 nodes for the one batch everybody quotes.

Profiling is needed exactly once, for `EpVerdict` — that machinery stays, it is what caught
QNN claiming the graph and not running it. Make it **explicit**: a constructor flag
`profile: Boolean`, true only for the verification session. Do not delete `EpVerdict`.

### 3. Get XNNPACK into the binary

`android/gradle/libs.versions.toml` + `android/app/build.gradle.kts`. The QNN AAR has no
XNNPACK. Two options, in preference order:

1. Keep `onnxruntime-android-qnn` **and** verify whether a QNN-EP session can coexist with
   `addXnnpack` — if the symbols are absent it cannot, and you must
2. switch the device dependency to plain `onnxruntime-android` and add XNNPACK to the EP
   chain ahead of CPU.

Option 2 loses the QNN EP. **That is acceptable and is the recommendation**: QNN is
currently 2.3× slower than the CPU on this graph. But it must be a recorded decision, not a
silent one — write into `STATUS.md` which option you took, why, and what the app now does
on a device where QNN would work.

If you take option 2, `Ep.QNN` and the QNN staging path must degrade cleanly, not crash:
`epChain` already handles "no quantized graph".

### 4. Record a real steady-state number

`CnnObserver.logObservation` already logs `total = prep + session` once a second. Nobody has
ever written the warm number down. Add the measurement to `STATUS.md`: median over ≥ 20
consecutive observations, split, with the EP that ran.

**If no device is attached, say so in `STATUS.md` and leave the number blank.** Do not
substitute a desktop figure and do not guess — a desktop x86 number for an ARM phone is
exactly the kind of measurement this repo has been burned by.

## Steps

1. `cnn/OrtSessionRunner.kt` — commit `perf(android-cnn): configure the ORT session instead of taking its defaults`
2. `cnn/OrtSessionRunner.kt`, `cnn/OnnxSquareClassifier.kt` — commit `fix(android-cnn): arm ORT profiling only for the verification batch`
3. `gradle/libs.versions.toml`, `app/build.gradle.kts`, `cnn/OnnxSquareClassifier.kt` — commit `perf(android-cnn): ship an ORT build that actually contains XNNPACK`
4. `specs/19-live-hardening/STATUS.md` — commit `docs(specs): 19 phase 01 — CNN runtime measurements`

## Tests (write, run once, targeted)

`android/app/src/test/kotlin/com/chesslab/tracker/cnn/` — extend the existing tests, do not
create a parallel file if one already covers the class.

- `sessionOptionsPinThreadsAndOptimisation` — the options builder sets intra-op threads and
  `ALL_OPT`. Assert through whatever seam is testable without ORT natives; if the real
  `SessionOptions` cannot be inspected, assert on the config object you pass it and say so.
- `profilingIsOffForAnObservationSession` — a non-verification session does not enable
  profiling. **Prove this test red first**: run it against the pre-fix constructor and
  confirm it fails. Report that in `STATUS.md`.
- `epChainDegradesWhenQnnIsAbsent` — with no quantized graph the chain still yields a
  working classifier.

Run once: `.\gradlew.bat :app:testDebugUnitTest --tests "*cnn*"`.

## Acceptance criteria

- `grep -n "setIntraOpNumThreads\|setOptimizationLevel" android/app/src/main/kotlin/com/chesslab/tracker/cnn/OrtSessionRunner.kt` hits.
- `grep -c "enableProfiling" …/OrtSessionRunner.kt` is 1 and it is inside a conditional.
- The EP chain still produces a classifier with no quantized graph present.
- `STATUS.md` states which XNNPACK option was taken and what it costs.
- `:app:ktlintCheck` and `:app:detekt` clean of new findings.

## Do NOT / Out of scope

- **Do not retrain or re-export the model.** Phase 04 owns the graph; you own the runtime.
- Do not touch `android/app/src/main/assets/cnn_model/` except if fixing the batch dimension
  is still outstanding — check first, commit `4df4ade` already fixed it to `[64,3,128,128]`.
- Do not remove `EpVerdict` or the verified-backend reporting. It exists because the app
  once claimed "QNN-HTP(NPU)" while running on the CPU.
- Do not change `observerIntervalS` — it is a `TrackerConfig` default and therefore
  `config.py`'s, and changing it needs the clip suite.
- Do not run `assembleDebug` or the full `:app` test task.
