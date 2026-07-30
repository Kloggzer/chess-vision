# STATUS — 23 resolution all the way down

Branch: `spec-23-resolution-all-the-way-down` (from `main`, which carries all of specs/22).
This file is the ONLY hand-off between agents. Append to your own phase's row and to the session log;
never rewrite another phase's entry.

## Phases

| Phase | Concern | State | Owner | Notes |
|---|---|---|---|---|
| 00 | What does `board_size` cost, and which `infer_size` ships? | todo | — | Measurement only. **Gates 02.** Parallel with 01. |
| 01 | Wire `ModelSpec`'s size into `BoardGeometry` so the app can make the crops | todo | — | Kotlin only. Parallel with 00. No behavioural delta. |
| 02 | Ship `occ-v4-f3e20` at that size | todo | — | Blocked by 00 **and** 01. Does not run if 00 says STOP. |

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

## Session log

<!-- Append: date — phase — what was measured/changed — the numbers — what is left. -->
