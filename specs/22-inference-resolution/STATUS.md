# STATUS — 22 inference resolution

Branch: `spec-22-inference-resolution` (from `spec-20-recovery-honesty`).
This file is the ONLY hand-off between agents. Append to your own phase's row and to the session
log; never rewrite another phase's entry.

## Phases

| Phase | Concern | State | Owner | Notes |
|---|---|---|---|---|
| 00 | Is 96 px the model's optimum or the test session's? | todo | — | Measurement only. **Gates the pack.** |
| 01 | `infer_size` as a per-model config key; export + serving read it | todo | — | Blocked by 00. **Lands alone** (contract provider). |
| 02 | Android reads it; the 128 guard becomes a graph assertion | todo | — | Blocked by 01. Owns the bundled asset. |
| 03 | Document the discovery | todo | — | Blocked by 00. Parallel with 02. Docs only. |

States: `todo` → `in progress` → `done` | `blocked`.

**00 → 01 → 02 is strictly sequential. 03 may run alongside 02.**

## What is already established (do not re-establish)

Measured 2026-07-29 on the current branch. All numbers are `occ-real3`, test split = 4 736 crops
(3 021 empty / 1 715 occupied), 74 boards.

- **Resolution curve of `occ-v4-f3e20`** (multi-scale GroupNorm champion): 32 px 227/0, 64 px
  39/0, **96 px 18/0**, 128 px 43/0 (misses/phantoms). ⚠ **This was measured by shrinking the
  128 px crops on disk** (`F.interpolate`, no antialiasing), not by cutting the square out of the
  warped board at 96 — which is what `crops_for_model` does when serving. Phase 00 re-measures on
  the real path before anything is built on this number.
- **Native resolution per session**, from the corner quad in `data/sessions/<id>/log.jsonl`
  (mean edge / 8): test split `20260708-021722` = **96.9 px/square**; val split
  `20260721-212830` = **173.2**; training `-193821` 116.0, `-194538` 114.7, `20260630-080531`
  213.8, `-014453` 214.0, `20260708-195420` 103.3, `20260709-141209` 102.3.
  **Each split is exactly one session.**
- **Low-resolution SOURCES are not the problem.** Degrading the content (down to s, back up to
  128) barely moves anything: GroupNorm 43 → 47 misses from a 128 px to a 32 px source. What the
  earlier curve measures is inference at a smaller tensor, which is a different question.
- **Export cost, same chain, norm differs**: GroupNorm 503 nodes / 35.1 ms per 64 crops, BatchNorm
  89 nodes / 6.6 ms (desktop CPU, ratio transfers, absolute ms do not). Both scale near-linearly
  with batch: 64 → 4 crops is 9.6× / 10.5×.
- **GroupNorm stays.** Full norm × multi-scale matrix, phantoms at a matched 43 misses: GroupNorm
  multi-scale **0**, BatchNorm single-scale 2, GroupNorm single-scale 7, BatchNorm multi-scale
  293. Multi-scale HELPS GroupNorm (43 vs 82 misses) and poisons BatchNorm — it normalises per
  sample, so extra scales are pure augmentation. Runs: `occ-v4-f3e20`, `occ-v4bn1-f3`,
  `occ-v4gn1-f3`, `occ-v4bn-f3`.
- **`--scales` must stay in the training recipe.** Dropping it costs both norms their
  resolution-agnosticism: at 64 px input, single-scale GroupNorm goes to 347 misses / 599
  phantoms. Serving at 96 is only possible *because* 96 was trained.
- **The parity CNN fixtures are synthetic.**
  `android/core-engine/src/test/resources/parity/_cnn/meta.json` says
  `"synthetic probabilities — no trained model is involved"`, so inference resolution cannot
  affect them.
- **Misses are the dangerous direction**: a miss licenses a fabricated capture and cascades
  (MEMORY: `occupancy-miss-vs-phantom`). Never select on total accuracy alone.

## Open questions this pack does NOT answer

- **The phone's own framing (~209 px/square) has never been measured against the resolution
  curve.** Phase 02 sets the fixed rig to 96; whether the phone should follow depends on phase
  00's verdict and is a separate measurement.
- **The 4-crop verify batch** (35.1 ms → 3.67 ms per call on desktop CPU) is a bigger change,
  blocked by `require(crops.size == batch)` and `ONNX_BATCH = 64`. Deliberately out of scope.
- **Whether `occ-v4-f3e20` should replace the bundled model** (43/0 against the shipped 95/152) is
  a model decision, not a resolution decision. Record it, do not act on it.
- **GroupNorm on the QNN HTP is not actually ruled out**: ORT's own QNN builder supports the
  rank-3 `InstanceNormalization` the decomposition emits, the shapes fold static under
  `ORT_ENABLE_BASIC`, and the 227 ms measurement that condemned it was taken on the ReLU-less
  model since fixed. Nobody needs it if a 4-crop verify costs ~10 ms on the CPU.

## Session log

<!-- Append: date — phase — what was measured/changed — the numbers — what is left. -->
