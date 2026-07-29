# Phase 00 — Is 96 px a property of the model or of one session?

**No code changes in this phase. Measure, decide, record. Do not fix anything.**

## Why

The 96 px optimum was measured on a test split that is **one session**, `20260708-021722`, whose
native resolution is **96.9 px/square**. The optimum and the session's native resolution being
the same number is either the finding or the trap:

- **R-FIXED** — 96 px is this model's best operating size, whatever the source resolution.
- **R-NATIVE** — the crop must not be upscaled; 96 wins here because that is what the camera
  delivered, and a 173 px/square source would prefer 128.

The val split is a second, independent session at **173.2 px/square**. Under R-NATIVE its optimum
must sit clearly above 96; under R-FIXED it sits at 96 too. That is the discriminator, and it is
one evaluation run away.

A second flaw in the existing measurement, and it is the deeper one: **the curve never left the
128 px crops.** The files under `data/squares/` were written at 128×128 by the slicer, so every
number so far describes a 128 px crop shrunk to `s` — `F.interpolate` without antialiasing, in
that measurement. Serving does something else entirely: `crops_for_model` cuts the square out of
the warped board **straight to `s`** and never passes through 128. Those are different pixels, and
the difference is exactly the interpolation this pack claims is costing accuracy.

So the measurement has to re-slice from the session frames. `labeling.crops_for_frame`
(`src/chesslab/labeling.py:140`) takes `out_size` and is the same function serving calls; the
frames are `data/sessions/<id>/frames/*.png` and the corners are in that session's `log.jsonl`,
one JSON object per frame. Labels come from the manifest rows for that session (`square` + `label`
per `frame`).

## Design (decided — do not redesign)

One script, `scripts/sweep_infer_size.py` (new), committed. It runs the sweep **twice, and reports
both**, because the gap between them is itself the finding:

- **path A — re-sliced** (authoritative): crops cut from the session frames at each size via
  `labeling.crops_for_frame(..., out_size=(s, s))`, then `predict_arrays`. This is what serving
  does.
- **path B — from the 128 px crops** (cheap cross-check): the dataset rows through
  `eval_transform_for(cfg, out_size=(s, s))` (`src/chesslab/training/torch_data.py:99` — the
  override parameter already exists).

If A and B disagree about the optimum, **A wins and B's disagreement goes in the report** — it
would mean the crop pipeline, not the network, is where the resolution is lost.

It reports, per model × split × size × path:

- argmax misses / phantoms,
- **phantoms at the threshold that holds misses at 43** — the matched operating point, because
  argmax is an arbitrary point on each model's curve and comparing at it is how this project
  previously mis-ranked two models,
- misses at the largest phantom-free threshold.

```python
SIZES = (48, 64, 80, 96, 112, 128, 160)
RUNS  = ("occ-v4-f3e20",)          # the multi-scale GroupNorm champion
SPLITS = ("test", "val")           # 96.9 and 173.2 px/square, one session each
```

Also report the bundled run, so phase 02 knows whether the asset it re-exports is improved by the
change. Find its name via its `config.json`:

```bash
grep -h '"resumed_from"' android/app/src/main/assets/cnn_model/config.json
# then locate the matching run under data/models/ and add it to RUNS
```

Native resolution per session, for the report:

```python
c = json.loads(open(f"data/sessions/{sid}/log.jsonl", encoding="utf-8").readline())["corners"]
px_per_square = sum(math.dist(c[i], c[(i + 1) % 4]) for i in range(4)) / 4 / 8
```

### The decision rule — apply it literally

Let `best(split)` be the size with the fewest misses at zero phantoms, **on path A**.

- `best(test) ≈ 96` **and** `best(val) ≈ 96` → **R-FIXED**. Record: `infer_size` default is 96 for
  every deployment.
- `best(test) ≈ 96` **and** `best(val) ≥ 128` → **R-NATIVE**. Record: `infer_size` is a
  per-deployment value; 96 for the fixed rig, and the phone's value must be measured separately
  before it is set to anything but its current 128.
- Anything else — in particular `best(test) ≠ 96` on path A — **STOP**. The premise of this pack
  is wrong; write what you measured into `STATUS.md` and do not proceed to 01.

**A negative result is a valid outcome and must be reported as one.** If path A erases the
43 → 18 gap, say exactly that: it would mean the gap was an artefact of shrinking an already-128
px crop, and this pack should not be implemented.

**Attribute the cause explicitly.** If A and B differ, name which of these it is and justify it
from the numbers: (a) the network genuinely prefers 96, (b) the crop pipeline loses detail when it
goes through 128 first, (c) the test session's native 96.9 px/square is being fitted. They imply
different fixes and only (a) and (c) are about resolution at all.

## Steps

### 1. `scripts/sweep_infer_size.py` (new) — commit `feat(scripts): sweep inference resolution on the deployment path`

Model loading: `_load_run` from `chesslab.training.evaluate`; rows via `load_manifest` /
`load_split` / `filter_rows_by_split` from `chesslab.training.data`; dataset via
`PackedSquareDataset` when `load_packed(cfg["dataset"])` returns a memmap, else `SquareDataset`
(`chesslab.training.torch_data`). `--num-workers 4`, `--batch-size 256`, one process, CPU or GPU
via `get_device(require_gpu=False)`.

### 2. `specs/22-inference-resolution/STATUS.md` — commit `docs(specs): phase 00 result — R-FIXED or R-NATIVE`

The full table, the px/square of every session involved, the named verdict, and the sentence
"phase 01 may proceed" or the blocker.

## Tests

None. This phase writes a measurement script, not a behaviour. Do not add a test that pins
accuracy numbers — they change with every retrained model.

## Acceptance criteria

- `.venv/Scripts/python.exe scripts/sweep_infer_size.py` runs to completion and prints a table
  per model × split covering all seven sizes.
- `STATUS.md` names exactly one of `R-FIXED`, `R-NATIVE`, `STOP`, with the two `best(split)`
  values it was derived from.
- `grep -n "96.9\|173.2" specs/22-inference-resolution/STATUS.md` hits — the native resolutions
  are recorded next to the verdict, not left in this spec file only.
- `uv run ruff check scripts/sweep_infer_size.py` clean.

## Do NOT / out of scope

- Do not change `evaluate.py`, `serving.py`, `ModelSpec.kt` or any asset. That is 01 and 02.
- Do not retrain, re-render, or export anything.
- Do not add sizes above 160 or below 48 — outside that band the model was never trained and the
  numbers only add noise.
- Do not evaluate on the **train** split to "get a third data point": the model has seen it and
  its optimum there is contaminated.
