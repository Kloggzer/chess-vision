# Phase 02 — Is the shipped INT8 model still honest?

## Why

`occ-v6-f5nd` ships three artefacts: `model.onnx`, `model.torchscript.pt`, and `model.qnn.onnx` —
the INT8/QDQ graph built for the Hexagon NPU. **Every accuracy number this project has, including the
champion's 0 phantoms, was measured on the float weights.** The quantized graph that actually runs on
the phone has never been put through the veto metric.

That is not a theoretical gap. Small mobile architectures are the known worst case for post-training
quantization — a naive per-tensor PTQ of MobileNetV2 has been reported dropping top-1 from 70.9 % to
0.1 %, and the literature attributes it to exactly the property this model has: little
representational capacity to absorb the error. `mobilenetv4_conv_small_035` is a 0.35-width variant,
0.6 M parameters, and the norm is GroupNorm, whose per-sample statistics quantize differently from
the folded affine a BatchNorm graph would present.

This phase is a **quality audit that happens to live in a speed pack**. If the shipped INT8 model has
phantoms, that is the most important finding available today and it outranks every optimisation in
this pack.

## Design (decided — do not redesign)

**Step 1 is the audit and it is non-negotiable.** Run `model.qnn.onnx` through the measurement of
record and compare against the float baseline:

| | phantoms | misses | margin p99.9 / max |
|---|---:|---:|---|
| float `occ-v6-f5nd` @ 80 px | 0 | 11 | 0.238 / 0.343 |
| `model.qnn.onnx` @ 80 px | ? | ? | ? |

`scripts/sweep_infer_size.py` loads torch checkpoints, not ONNX (`load_torch_run`, deliberately —
`serving.load_run` prefers a `model.onnx` when one exists and the exporter bakes a static batch).
So this phase needs an ONNX-backed path through the **same** crop pipeline. Build it in
`scripts/` as a thin adapter that reuses `sweep_infer_size`'s path-A crop generation and metric
functions by import — **do not fork the script**, it is frozen and it is the measurement of record.
If importing it cleanly is not possible without editing it, STOP and record the blocker rather than
copying 200 lines.

**Step 2 only if step 1 shows damage.** The known remedies, in the order the literature ranks them:

1. **Per-channel weight quantization** rather than per-tensor. This is the single largest lever for
   MobileNet-class models and is reported to restore near-original accuracy where per-tensor
   destroys it. Check what `src/chesslab/training/quantize.py` currently does before assuming.
2. **A better calibration set.** The calibration reader currently pads batches by repetition
   (`quantize.py:126-129`); check whether the calibration crops are representative of the real
   board distribution — `empty` dominates ~5:1 and a calibration set that under-represents occupied
   squares will place the activation ranges badly.
3. **Percentile rather than min/max activation ranges**, which is the standard defence against
   outlier activations dominating the scale.

Quantization-aware training is **out of scope** — it changes weights and belongs in a training pack.

## Steps

### 1. `scripts/score_onnx.py` (new) — commit `feat(scripts): score an ONNX graph on the veto metric`

Reuses `sweep_infer_size`'s path-A crops and metrics by import. ONNX Runtime on the desktop
(CPU EP) is fine here: this measures what quantization did to the *numbers*, not what the NPU does
with them — say that explicitly in the module docstring so nobody mistakes it for a device benchmark.

### 2. Audit — no commit

Score `model.qnn.onnx` and `model.onnx` (the float ONNX, as the control that isolates quantization
error from export error) against the torch baseline. Three rows, one table.

### 3. Remedies, only if the audit shows damage — commit `fix(training): per-channel weights / better calibration for the INT8 export`

One change at a time, each re-scored. Do not bundle.

### 4. Report — commit `docs(specs): 26 phase 02 — what quantization costs`

## Tests

`tests/test_quantize.py` (extend if it exists, create if not):

1. `test_calibration_reader_covers_both_classes` — the calibration crops are not overwhelmingly
   `empty`.
2. `test_quantized_graph_input_shape_matches_float` — the two graphs agree on shape and batch.

```
.venv/Scripts/python.exe -m pytest -q tests/test_quantize.py tests/test_training.py
.venv/Scripts/python.exe -m ruff check scripts/score_onnx.py src/chesslab/training/quantize.py
```

## Acceptance criteria

- [ ] A three-row table in STATUS: torch float, ONNX float, ONNX INT8 — phantoms, misses, margin.
- [ ] An explicit statement of whether the **shipped** artefact holds the floor (0 phantoms,
      margin max ≤ 0.343).
- [ ] If it does not: what per-channel quantization recovers, measured, not argued.
- [ ] `score_onnx.py` imports from `sweep_infer_size.py` rather than duplicating it —
      `grep -n "^from sweep_infer_size\|^import sweep_infer_size" scripts/score_onnx.py` hits.

## Do NOT / Out of scope

- Do **not** edit `scripts/sweep_infer_size.py`. Frozen.
- Do **not** retrain anything. No QAT, no fine-tuning, no new chain.
- Do **not** ship a fix. Measure and, if needed, produce a better export; the decision to swap the
  bundled asset is the orchestrator's.
- Do **not** report a desktop-CPU ONNX number as a device number.
