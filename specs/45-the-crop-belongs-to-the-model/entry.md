# 45 — The crop belongs to the model

`padSide` and `padUp` decide how much of a square's surroundings one crop carries — that is, what a
training example LOOKS like. They are the model's input contract, not the board's geometry, and
today they are neither recorded by the model nor reconciled with it.

The user, 2026-08-03: *"sollten padup und padside nicht model agnostisch sein und daher bestimmt
werden anhand des benutzen models? auch die cropsize."*

## The code already half agrees, which is what makes the gap visible

`ModelCropSize.kt`:

> *"Only the crop's OUTPUT size follows the model. `boardSize`, `margin`, `padSide` and `padUp` are
> the board's own geometry and stay exactly as calibrated."*

The first clause is right and is already wired: `infer_size` is a per-model key with its own pack
(specs/22, specs/23), because a 96 px model attached to a 128 px geometry died on its first
observation. The second clause is half wrong. `boardSize` and `margin` ARE board geometry — where
the board sits in the image. `padSide`/`padUp` are not: they compose the picture the model is shown.
A model trained at 0.05 and served 0.10 is being shown a different photograph of the same square.

## Measured 2026-08-03, before the pack was written

| | Value |
|---|---|
| All 23 real sessions — profile `default` (9) and `phone` (14) | `pad_side` **0.05** |
| Android runtime default, `CalibrationProfile` **and** `:core-geometry.Corners` | **0.10** |
| Synth profiles | mostly 0.1 |
| What the seven bundled `config.json` declare | `out_size`, `infer_size` — **no `pad_side`, no `pad_up`** |
| Cost of the difference, measured by specs/41 | at 0.10 the CNN disagrees with the **untouched start position** on a7/c7/b8/h8; at 0.05 on nothing |

specs/41 found that as a defect in the replay harness (`ClipDriver` built its profile from
`CropParams.default`) and fixed it there. But the harness was reproducing what the device does. The
same mismatch on the device has never been measured.

**State the uncertainty honestly.** That the defaults diverge and the corpus is 0.05 is certain.
That the phone SERVES 0.10 is strongly indicated and not directly measured: the device's stored
calibration could not be read on 2026-08-03 because the app data had been wiped that morning and no
calibration had been run since. Measure it before changing anything.

## Scope

1. **Measure first.** What `padSide` does the device actually use, end to end, after a real
   calibration? And what does the difference cost — the same run at 0.05 and at 0.10, counted in
   phantoms and misses by `scripts/sweep_infer_size.py --paths a`, which is the only thing in this
   project that decides accuracy. A training log is not a result.
2. **The model declares its crop.** The export writes `pad_side` and `pad_up` into `config.json`;
   both are known at build time because the dataset records them.
3. **`ModelSpec` reads them and the geometry takes them.** `withCropSizeOf` becomes `withCropOf`:
   the model supplies `out_size`, `pad_side`, `pad_up`; the profile keeps `boardSize` and `margin`.
   One direction of flow, as the existing comment already demands.
4. **A model without the fields is legacy and says so LOUDLY.** It keeps the profile's values and
   surfaces that it did. A silent fallback here is the whole bug again.
5. Python must agree. `config.CROP.pad_side` = 0.10 is a global default that no profile in the real
   corpus uses; decide whether it survives at all.

## Why this outranks the calibration gate

A wrong crop margin shifts **every one of the 64 squares in every frame**, in training and at
inference, and nothing fails. It is the same shape as the mis-alignment that held the champion's
margin for months — a few percent of consistent, silent difference — and unlike that one it has
never been measured even once.

## Acceptance

- A number: phantoms and misses at 0.05 against 0.10 on the same dataset and model, from
  `sweep_infer_size.py --paths a`, both rows measured in the SAME run (a profile change silently
  invalidates an older row).
- The bundled models declare their crop composition, or are explicitly marked legacy.
- No path can crop at a padding the model did not declare without saying so.
- `uv run pytest -q`, `ruff`, `vulture`; Android gate green with `--rerun-tasks`.
