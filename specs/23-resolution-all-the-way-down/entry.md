# 23 — Resolution all the way down: the warp, the crop, and the model that ships

> Entry file for the spec pack. Every implementing agent reads **this file completely**, then
> exactly the phase file assigned to it.
>
> **The protocol of `specs/22-inference-resolution/entry.md` applies verbatim** — memory
> constraints, heavy-compute limit, repo rules, git hygiene, linters, definition of done. Only the
> deltas are below. Branch: `spec-23-resolution-all-the-way-down`, cut from `main` (which now
> carries all of specs/22).

## What this is

specs/22 made the network's input size a per-model key and measured that the champion prefers 96 px
over 128. It also uncovered the thing that makes that number provisional: **the model never sees the
camera.** `crops_for_frame` warps to `profile.board_size` first, so on the fixed rig
(`data/calibration/phone.yaml`, `board_size: 800`, `pad_side: 0.05`) every crop is a **110 px box** —
and the 4K session loses **42 %** of its linear resolution at that warp, against a
`config.DEFAULT_BOARD_SIZE` of **1600**.

So "96 is better than 128" is a statement about 110 px boxes. Nobody has measured what the model
does with the detail the profile is currently throwing away.

Three things follow, and this pack does all three:

| Spec | Phase | Depends on | Runs |
|---|---|---|---|
| `00-warp-resolution.md` | What does `board_size` cost? Sweep warp × input size. | — | **alone, first** for phase 02; parallel with 01 |
| `01-crop-size-from-model.md` | The app can only make 128 px crops. Wire `ModelSpec` into `BoardGeometry`. | — | parallel with 00 (Kotlin only, disjoint files) |
| `02-ship-the-better-model.md` | Swap `occ-r3s-f3` → `occ-v4-f3e20` at the size 00 picked. | 00 **and** 01 | last, alone |

**00 and 01 share no file and may run concurrently.** 02 needs both: 00 says which size, 01 makes
the app able to produce it.

## Why 02 cannot go first, even though it is the one that helps

`occ-v4-f3e20` reads 43 occupied squares as empty against the shipped model's 95, at zero phantoms
against 152. That is the accuracy win and it is the point of the pack. But:

- Shipping it **at 96 px** requires phase 01, or the app attaches the model, agrees on the graph
  shape, and then dies on the first observation — `preprocessInto` does not resize, it *requires*
  `crop.width == outW`, and the crop size comes from `BoardGeometry.outW`, hard-defaulted to 128
  (`android/core-geometry/src/main/kotlin/com/chesslab/geometry/Corners.kt:67`).
- Shipping it **at the wrong size** is what phase 00 exists to prevent. The 96 px optimum was
  measured on 110 px boxes; the `BoardGeometry` default warps at `boardSize = 1600` with
  `padSide = 0.10` → a **240 px** box, which downsamples to 128 instead of upsampling.

  > ⚠ Corrected by phase 01: **240 px is the default-geometry figure, not what a calibrated phone
  > produces.** `measuredBoardSize` (`tracker/geometry/CalibrationStore.kt:133`) derives `boardSize`
  > from the corner quad, rounds to a multiple of 16 and clamps to `320…1280` → a **48…192 px** box.
  > Android already warps at the board's real pixel size; the rig's fixed 800 is the outlier. Do not
  > quote 240 as the phone's box.

## Facts established by specs/22 — do not re-establish

All from `specs/22-inference-resolution/STATUS.md`, measured 2026-07-29/30 on `occ-real3`.

- `occ-v4-f3e20` (multi-scale GroupNorm, `scales: [32, 64, 96, 128]`), crops cut straight from the
  frames: **19 misses / 0 phantoms at 96 px**, 43 / 0 at 128 px on test; on val 14 / 23 at 96 and
  29 / 0 at 128.
- **Untrained input sizes fail silently.** 80 px costs it **133** misses against 96 px's 19; 48 px
  collapses to 916. `infer_size` is validated against the run's `scales` by the exporter. Every
  size this pack measures or ships **must be one of `[32, 64, 96, 128]`**.
- The bundled `occ-r3s-f3` is **worse** at 96 px: 95 / 152 at 128 → 74 / 243 at 96. Its `config.json`
  carries no `infer_size` key, which is how it keeps 128.
- **Each split is one session**, and **val doubles as the checkpoint-selection set** (`best.pt` is
  chosen on val at 128 px). Val is not a clean holdout; weight the test leg.
- Misses are the dangerous direction: a miss licenses a fabricated capture and cascades.
- The `infer_size` contract: absent ⇒ fall back to `out_size`; the exported graph is
  `[64, C, H, W]`; one Python reader `training.torch_data.infer_size_of`, one Kotlin reader
  `ModelSpec.parse`.

## Ownership registry

**This table overrides any phase file that disagrees with it.**

| file | owned by | notes |
|---|---|---|
| `scripts/sweep_warp_resolution.py` (new) | 00 | 00 may also read, never write, `scripts/sweep_infer_size.py`. |
| `android/core-geometry/**` | 01 | `BoardGeometry` and its consumers. |
| `android/app/src/main/kotlin/com/chesslab/tracker/geometry/**` | 01 | `CalibrationProfile.kt:71`, `CalibrationStore.kt:74`. |
| `android/app/src/main/kotlin/com/chesslab/tracker/service/TrackerService.kt` | 01 | `:92` builds a bare `BoardGeometry()`. |
| `android/app/src/main/kotlin/com/chesslab/tracker/cnn/**` | 02 | 01 must NOT touch it — specs/22 phase 02 just landed there. |
| `android/app/src/main/assets/cnn_model/**` | 02 | the shipped asset. |
| `data/calibration/phone.yaml` | **nobody** | 00 measures alternative `board_size` values in memory. Changing the profile re-stamps every dataset built from it and is a separate decision. |
| `specs/23-.../STATUS.md` | all | append only. |

## The rule about the profile — binding

**No phase edits `data/calibration/phone.yaml`.** `board_size` is what the corpus was sliced at; a
new value means the crops on disk and the crops served stop matching, which is a retraining
question, not a serving one. Phase 00 overrides it **in memory only**, and its report says what a
change would be worth — it does not make one.

## Artifact authority

Phase 00's table in `STATUS.md` is the authority for which `infer_size` ships. Phase 02 reads it and
does not re-derive it. If 00 recorded STOP, **02 does not run** — the shipped model stays as it is
and that is a valid end state for this pack.
