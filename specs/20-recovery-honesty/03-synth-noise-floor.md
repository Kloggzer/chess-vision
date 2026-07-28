# Phase 03 — The cleanest synthetic crops carry too little sensor noise

## Why

The user's read: *"ich finde die synthetischen Daten sau gut, dann muss da aber etwas Kamerarauschen
rein"*. Measured 2026-07-28 on 400 **empty** crops each (empty only, so piece texture cannot confound
it), as the std of the residual after a σ=1.2 blur — the energy above that cutoff:

| high-frequency energy | p10 | p50 | p90 |
|---|---:|---:|---:|
| real | 5.87 | **7.29** | 9.30 |
| synth (`occ-synth`) | 3.19 | **7.09** | 8.24 |

**At the median they already match** (ratio 1.03×). `degrade.py` adds σ 2–6 to the board render and
enough of it survives the warp to 128×128. So the intuition "add camera noise" is, as a blanket
change, **fixing a gap that is not there** — and a naive increase would push the median past real.

What the measurement *does* show is a missing **floor**: the cleanest tenth of synthetic crops sits
at 3.19 against real's 5.87. Those are crops a model can tell from real material by smoothness alone.
This phase raises the floor and leaves the median where it is.

## Design (decided — do not redesign)

In `synth/degrade.py:degrade_image`, step 4 is `im + rng.normal(0, rng.uniform(2.0, 6.0))`. The low
end of that range is what produces the clean tail — but the noise is applied at **board** resolution
and the crop is warped down, so the surviving level depends on the downscale factor, which
`degrade.py` cannot see.

Therefore: **do not guess a new range. Calibrate it.**

1. Add `synth/measure_noise.py` — the measurement above as a reusable tool: given a directory of
   crops or a packed dataset, print p10/p50/p90 of the HF residual for `empty` crops.
2. Determine, by running `degrade_image` at several σ over the *existing* renders and re-cutting
   crops, the σ range whose crop-level p10 lands at or above the real p10 (5.87) while the p50 stays
   within ±10 % of real's 7.29.
3. Encode that range in `degrade_image` with the measured numbers in the docstring, and note that
   the range is calibrated for the current render→crop scale factor and must be re-measured if
   `board_size` changes.

**Do not re-degrade the existing renders in place.** `degrade.py` is destructive (it rewrites the
PNGs) and running it twice double-degrades. Work on copies under `scratch/`.

## Steps

### 1. `synth/measure_noise.py` (new) — commit `feat(synth): measure the crop-level noise gap between real and synth`

### 2. Calibrate — no commit
Copy a sample of renders to `scratch/`, sweep σ, re-cut crops, measure. **ONE worker, minimum
sample** — a few hundred crops is enough for a p10.

### 3. `synth/degrade.py` — commit `fix(synth): give the sensor noise a floor, calibrated at crop level`
The new range, with the measured before/after table in the docstring.

### 4. Visual probe — commit `docs(synth): real-vs-synth crop montage after the noise floor`
A montage: real crops, synth-before, synth-after, same squares, same scale, written to
`docs/synth-pipeline-noise.png` and referenced from `docs/synth-pipeline.md`. **This is required** —
the standing rule in this repo is that synth/texture/pipeline changes always ship with a visual
sample, because the user iterates visually.

### 5. `docs/synth-pipeline.md` — same commit
A short section: what was measured, why the median was already right, what the floor fixes.

## Tests (write, run once, targeted)

`tests/test_synth_degrade.py` (new):

1. **`degrade_image` never returns a crop below the floor.** Feed a perfectly flat synthetic patch,
   degrade it 200 times with different seeds, assert the minimum HF residual clears the measured p10.
2. **The median is not inflated.** On the same input, assert the median HF stays within the band the
   docstring claims.
3. **Determinism per seed** is preserved — same seed, identical output.

`uv run pytest -q tests/test_synth_degrade.py`

**Prove red first**: restore the old σ range, confirm test 1 fails.

## Acceptance criteria

- `docs/synth-pipeline-noise.png` exists and is referenced from `docs/synth-pipeline.md`.
- The docstring of `degrade_image` carries the measured p10/p50/p90 before and after.
- `uv run ruff check synth tests` clean.
- STATUS.md states plainly that the median gap did **not** exist — a negative result is the point of
  having measured.

## Do NOT / Out of scope

- **No retrain and no re-render of the corpus.** This phase changes the tool and proves it on a
  sample; deciding whether to re-render 256k crops is the user's call, not this phase's.
- Do not add low-light rendering. That is a separate, larger piece (new render variants, new
  dataset, pretrain + finetune) and needs its own spec once this floor is settled.
- Do not touch `src/chesslab/**` or anything under `android/`.
- Do not run `degrade.py` over `data/synth_occ_v1/` — those renders are already degraded and the
  operation is destructive.
