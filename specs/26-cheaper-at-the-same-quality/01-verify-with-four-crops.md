# Phase 01 — A move hypothesis touches 4 squares, not 64

## Why

After a candidate move the tracker verifies a local hypothesis: origin empty, destination occupied.
That is 4 squares. It currently pays for 64, because the graph is traced at a fixed batch of 64
(`src/chesslab/training/evaluate.py:132`) and the Android classifier's contract is exactly 64 crops
(`android/core-cnn/.../SquareClassifier.kt:12`). The verify window counts in *observations*, so the
CNN time is the wall clock between "the user moved" and "the app agrees".

Same weights, same crops, same arithmetic — so the accuracy floor is held by construction. This is
the cheapest real speedup available and it cannot cost quality.

## The assumption that must be tested first, not assumed

**Inference latency is NOT reliably linear in batch size on an NPU.** The literature is explicit that
smaller batches do not always run faster on mobile NPUs, and the HTP carries fixed per-inference
overhead plus a graph compiled for one fixed shape. My "4 crops ≈ 8 % of 64" is a CPU intuition and
it may be wrong here.

So **step 1 is a measurement, not an implementation.** Export a batch-4 graph, run both on the
device, and compare medians over ≥ 30 observations each. If batch 4 is not meaningfully cheaper than
batch 64, **stop and report that** — it is a valid, valuable negative and it saves the Android work.

Second cost to measure before committing to the design: a second graph shape means a **second
EPContext compilation and cache**. First-run compilation was once 5 m 26 s against 0.8 s cached. Two
cached graphs also means more memory resident. Report both.

## Design (decided — do not redesign)

`ONNX_BATCH = 64` becomes the *default* batch, not the only one. `run_export` gains an explicit
batch parameter; the exporter writes the batch into the artefact's name (`model.b4.onnx`) and into
`model_card.json`, so nothing has to infer a graph's shape from its filename alone.

The dynamic-batch route is **excluded and must stay excluded**: a dynamic batch dimension previously
broke NPU partitioning, which is why the trace is fixed in the first place. Two fixed graphs, not
one flexible one.

On Android, if and only if the measurement justifies it: a second session handle in
`OnnxSquareClassifier.kt` for the small batch, chosen by the caller. `SquareClassifier`'s KDoc
contract ("64 BGR crops") changes with the code — a doc that still says 64 while the code accepts 4
is how the next reader ships a shape bug.

## Steps

### 1. `src/chesslab/training/evaluate.py` — commit `feat(training): export at a chosen batch, not only 64`

### 2. Measure both graphs on the device — no commit

Export `occ-v6-f5nd` at batch 4 and at batch 64, install both, and compare `CNN observation` medians
and spreads over ≥ 30 samples each. **Decision point:** if batch 4 is not meaningfully cheaper,
write the numbers into STATUS and STOP. Do not build the Android path for a speedup that is not there.

### 3. `android/.../cnn/OnnxSquareClassifier.kt` + `core-cnn/.../SquareClassifier.kt` — commit `feat(android): verify against four crops instead of sixty-four`

Only if step 2 justified it.

### 4. Re-verify the floor — no commit

The weights are untouched, so accuracy cannot move — but *prove* it rather than asserting it:

```
.venv/Scripts/python.exe scripts/sweep_infer_size.py --runs occ-v6-f5nd --dataset occ-real6 \
    --splits test --sizes 80 --paths a --log data/_perf/b4_floor.log
```

and additionally assert that the batch-4 graph and the batch-64 graph produce **the same
probabilities** for the same 4 crops (max abs diff ≤ 1e-5). That equality is the whole basis for
claiming the floor is held; without it the claim is decoration.

### 5. Report — commit `docs(specs): 26 phase 01 — four crops, measured`

## Tests

`tests/test_export_batch.py`:

1. `test_export_writes_requested_batch` — the exported graph's input shape is `[4, C, H, W]`.
2. `test_batch4_matches_batch64_on_the_same_crops` — same 4 crops through both graphs, max abs diff
   ≤ 1e-5. **This is the phase's contract test.**
3. `test_model_card_records_the_batch`.

```
.venv/Scripts/python.exe -m pytest -q tests/test_export_batch.py tests/test_training.py
gradlew.bat :app:testDebugUnitTest :app:ktlintCheck :app:detekt   # only if step 3 happened
```

## Acceptance criteria

- [ ] Median and spread for batch 4 and batch 64, on the device, ≥ 30 samples each.
- [ ] EPContext compile time and cache size for the second graph, recorded.
- [ ] `test_batch4_matches_batch64_on_the_same_crops` passes.
- [ ] Floor re-verified: 0 phantoms, margin max ≤ 0.343.
- [ ] If the phase stopped at step 2, STATUS says so plainly with the numbers that justified it.

## Do NOT / Out of scope

- Do **not** make the batch dimension dynamic.
- Do **not** retrain, re-quantize or touch a weight.
- Do **not** change which squares the tracker decides to verify — that is engine logic and a
  different concern. This phase changes only how many crops a given verify costs.
- Do **not** touch `OrtSessionRunner.kt` beyond adding a session handle; phase 00 owns that file and
  lands first.
