# Phase 00 — What is `board_size` costing, and which input size should ship?

**Measurement only. Change no consumer, no profile, no asset. Gates phase 02.**

## Why

Every accuracy number this project has is a number about a **110 px crop box**: the rig profile
warps to `board_size: 800` with `pad_side: 0.05`. The default is 1600, and the 4K val session carries
173 px/square at the sensor — 42 % of its linear resolution is discarded before the network sees
anything.

Two questions, one sweep:

1. **Is the discarded detail worth anything at inference alone?** The model was trained on crops
   built at 800. Serving it from a 1600 warp gives *sharper* crops than it ever trained on — a domain
   shift that may help, may hurt, and must be measured rather than assumed. If it helps without
   retraining, that is the largest free win on the table. If it only helps after retraining, that is
   a much bigger project and this pack should say so.
2. **Which `infer_size` should ship?** 96 px won on 110 px boxes. The phone warps at
   `boardSize = 1600`, `padSide = 0.10` → a **240 px** box that *downsamples* to 128. Its optimum has
   never been measured, and phase 02 needs it.

## Design (decided — do not redesign)

One script, `scripts/sweep_warp_resolution.py` (new), committed. Model the deployment path the way
`specs/22` phase 00's path A does — re-slice from the session frames, do not touch the 128 px crops
on disk. Read `scripts/sweep_infer_size.py` first and reuse its structure; it already solves the
awkward parts (seeding `serving._CACHE` per size, `CHESSLAB_DISABLE_CUDA_GRAPH=1`).

```python
WARPS  = (800, 1200, 1600)        # profile's 800; the 1600 default; one in between
SIZES  = (64, 96, 128)            # TRAINED scales only — 80 px costs 133 misses, see entry.md
RUNS   = ("occ-v4-f3e20", "occ-r3s-f3")   # the candidate and the incumbent
SPLITS = ("test", "val")
```

`board_size` is overridden **in memory**: load the profile, replace `board_size`, pass it to
`labeling.crops_for_frame`. Do not write the profile back. Note in the report that `pad_side` stays
the profile's 0.05, so the box is `board_size/8 × 1.10` — 110 / 165 / 220 px — and that Android's
240 px comes from its `padSide = 0.10`, i.e. the 1600 row is the closest available proxy for the
phone, not an exact match. **Say that explicitly rather than presenting the 1600 row as "the
phone".**

Per cell report: argmax misses/phantoms, phantoms at a matched 43 misses, and misses at the most
permissive phantom-free threshold. Same three columns specs/22 used, so the tables are comparable.

### What to conclude, and how to say it

- **Which `infer_size` phase 02 ships**, named as one of `[32, 64, 96, 128]`, chosen on the **test**
  leg (val is the checkpoint-selection set — see entry.md) at the warp the app actually uses. If the
  best size at 1600 differs from the best at 800, say both and say which one the phone gets.
- **What `board_size` is worth**, in misses and phantoms, as a number. If 1600 beats 800 at
  inference alone, that is a finding about the profile and it goes in `STATUS.md` as a recommendation
  with its cost — re-slicing the corpus — spelled out. **Do not change the profile.**
- If the sweep says the shipped model should stay where it is, record **STOP** for phase 02 and say
  why. That is a valid end state.

**A negative result is expected and must be reported as one.** "The extra warp resolution does
nothing at inference" is the most likely outcome and is worth knowing.

## Steps

### 1. `scripts/sweep_warp_resolution.py` (new) — commit `feat(scripts): sweep warp resolution against input size`

### 2. `specs/23-.../STATUS.md` — commit `docs(specs): phase 00 — what board_size costs, and the size that ships`

## Tests

None. A measurement script, not a behaviour. Do not pin accuracy numbers in a test.

## Acceptance criteria

- `.venv/Scripts/python.exe scripts/sweep_warp_resolution.py --log data/_perf/sweep_warp.log` runs
  to completion and prints one table per run × split covering all 3 × 3 cells.
- `STATUS.md` names the `infer_size` phase 02 must ship, or `STOP`, and states which leg it was
  chosen on.
- `STATUS.md` quantifies what `board_size` 1600 is worth against 800, in misses and phantoms.
- `git diff --stat -- data/calibration` is **empty**.
- `uv run ruff check scripts/sweep_warp_resolution.py` clean.

## Do NOT / out of scope

- Do not edit `data/calibration/phone.yaml`, any dataset, or any asset.
- Do not add untrained sizes to `SIZES`. 80 px is not a data point, it is a trap.
- Do not retrain, even if the numbers beg for it. A retraining recommendation is a sentence in
  `STATUS.md`, not a run.
- Do not touch anything under `android/` — phase 01 is working there concurrently.
- Do not evaluate on the train split.
