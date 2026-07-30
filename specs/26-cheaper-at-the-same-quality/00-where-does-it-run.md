# Phase 00 — Which processor actually executes the graph?

## Why

Everything this pack might do rests on an unmeasured assumption: that the champion runs on the
Hexagon NPU. Nobody has ever logged the partition. 503 graph nodes for a 0.6 M-parameter network is
a lot, GroupNorm exports as an `InstanceNormalization` decomposition, and ONNX Runtime's QNN EP
**silently falls back to CPU** for any subgraph it cannot claim. If half the graph runs on the CPU,
that is the 77 ms — and fixing the partition would be a larger win than anything else in this pack,
at exactly zero cost to accuracy.

This phase measures, it does not fix. If it finds a partition break, the fix is a later decision.

## Design (decided — do not redesign)

Three instruments, cheapest first. Stop as soon as the picture is unambiguous.

**1. `session.disable_cpu_ep_fallback`.** ORT exposes a session option that makes it *raise* instead
of silently falling back when the model cannot run entirely on the QNN HTP backend. Set it behind a
debug flag in `OrtSessionRunner.kt`, attempt to load `model.qnn.onnx`, and record whether it throws.
This is a yes/no answer in one run and it is the cheapest thing in the pack.

**2. Verbose EP placement logging.** ORT logs its placement decisions at verbose severity. Raise the
log level for one attach, capture with `adb logcat`, and count nodes per EP. An operator being
*supported* is not the same as being *assigned* — report assignment, not the support matrix.

**3. The pre-partition graph dump.** The QNN EP can dump the ONNX graph it receives at compile time
as JSON (same schema as QNN's own graph dumps). Use it only if 1 and 2 disagree or are inconclusive.

Report, per EP: node count, which operator types landed where, and — if there is a break — the
**first** node that fell off the NPU. A partition that breaks once and never recovers is a different
problem from one that alternates.

Also record the EPContext cache behaviour: first-run compilation was once 5 m 26 s against 0.8 s
cached. If the cache is cold on every attach, that is a separate finding worth its own line.

## Steps

### 1. `android/.../cnn/OrtSessionRunner.kt` — commit `feat(android): make a CPU fallback loud instead of silent`

Debug-flag the `disable_cpu_ep_fallback` session option and surface the outcome through the existing
CNN state surface (`ui/debug/CnnStatePanel.kt` already renders classifier state — extend it, do not
build a second panel).

### 2. `android/.../cnn/EpProfile.kt` — commit `feat(android): log the QNN partition, per execution provider`

### 3. Measure on the device — no commit

`adb devices` → `f86dfdca`. Build and install with `gradlew.bat` from `android/` via the PowerShell
tool. Attach the classifier, capture `logcat`, and collect at least **30** `CNN observation` lines so
the latency figure has a spread (the known variance is 2.3x — a single sample is not a measurement).

### 4. Report — commit `docs(specs): 26 phase 00 — where the graph actually runs`

## Tests

Kotlin unit test in `android/app/src/test/.../cnn/`: the EP-profile parser turns a captured
placement log into per-EP counts. Do not test ORT itself.

```
gradlew.bat :app:testDebugUnitTest --tests "*EpProfile*"
gradlew.bat :app:ktlintCheck :app:detekt
```

## Acceptance criteria

- [ ] STATUS records, as numbers: nodes on HTP, nodes on CPU, and the first node that fell back (or
      "no break").
- [ ] STATUS records whether `disable_cpu_ep_fallback` throws for `model.qnn.onnx`.
- [ ] Median and spread of `CNN observation` over ≥ 30 samples, on the device.
- [ ] The floor is untouched by construction — no weight, crop or graph changed. Say so in one
      sentence; do not skip the sentence.
- [ ] `ktlintCheck` and `detekt` clean, no `@Suppress` added.

## Do NOT / Out of scope

- Do **not** fix a partition break you find. Measure, record, stop. A speculative repair alongside
  the measurement makes both unreviewable.
- Do **not** re-export or re-quantize any model.
- Do **not** conclude from x64. A claim about the NPU made on the desktop is a hypothesis; the phone
  is attached.
- Do **not** touch `OnnxSquareClassifier.kt` — that is phase 01's file.
