# Phase 00 — Thirteen classes, one variable

## Why

See `entry.md`. In short: a wider output band costs no measurable compute, and an identity-capable
model wakes a verify rung that has been unreachable in every shipped model
(`boardMatchesIdentityFull`, zero evaluations across 18 clips in specs/27). The only question is
whether **occupancy quality survives** the change.

## Design (decided — do not redesign)

### Step 1 comes before any training: teach the sweep to score identity models

`scripts/sweep_infer_size.py:190 occupied_index` raises unless `classes == ["empty", "occupied"]`,
so the measurement of record cannot score the candidate at all. Extend it — this is the one
authorised change to that file.

For an identity model, P(occupied) is the **summed mass of the piece classes**. That definition
already exists twice and both must be matched, not paraphrased:

- `android/core-cnn/.../Observations.kt:17` — "pOcc is the summed mass of the 12 piece classes,
  clamped at 0 against float drift"
- `src/chesslab/cnn_recovery.py:63 observation_from_probs` — the Python original

Read both, implement the same arithmetic, and say in STATUS which one you took as authoritative.
A metric that disagrees with what the tracker computes would measure a model nobody runs.

**Regression gate:** after the change, re-score `occ-v6-f5nd` at 80 px and diff against
`data/_perf/v6_resolution_curve.log` (1 phantom / 12 misses / margin 0.316 / 0.512 at 80 px). The
2-class path must be **byte-identical**. If it is not, stop and fix before training anything.

### Step 2: does a 13-class path exist?

`config.CLASSES` is the canonical 14-class list and `occluded` has **zero examples** in the corpus.
Find out what the CLI actually offers — `chesslab dataset build --classes` documents
`pieces` (14) and `occupancy` (2). If there is no 13-class mode, add one as a derivation of
`config.CLASSES` (the 14 minus `occluded`), never as a second hardcoded list. Wire it through
`dataset_build.build_dataset(class_mode=…)` the way `occupancy` already is: it **collapses existing
labels at build time, re-labels no crop and loses no row**.

If 13 turns out to be structurally impossible in the time available, train 14 instead — and then
report explicitly what the untrained `occluded` logit does: how often it wins an argmax, and on
which crops.

### Step 3: the run

One chain, the champion's recipe, one variable changed:

```
BASE="--backbone mobilenetv4_conv_small_035 --norm groupnorm --batch-size 256 \
      --scales 48,64,80,96 --loss ce --num-workers 4 --seed 42 --patience 25"
chesslab train --dataset <13-class p1v4> --out data/models/occ-v8p-p1 --epochs 20 --lr 3e-4 $BASE
chesslab train --dataset <13-class p2v4> --out data/models/occ-v8p-p2 --resume occ-v8p-p1 --epochs 20 --lr 1e-4 $BASE
chesslab train --dataset <13-class real5nd> --out data/models/occ-v8p-f5nd --resume occ-v8p-p2 --epochs 20 --lr 3e-5 $BASE
```

The synthetic stages need 13-class datasets too — building them is part of the phase. Take
`data/_perf/.gpu-lock` for the whole chain; release it at the end.

### Step 4: the measurement

```
scripts/sweep_infer_size.py --runs occ-v6-f5nd,occ-v8p-f5nd --dataset occ-real6 \
    --splits test --sizes 80 --paths a --log data/_perf/v8p_real6.log
```

Both rows, one command, one day, one profile. Report phantoms, misses, per-session split and margin
for each.

Then, separately, the thing that motivated the pack: **would `classesHaveIdentity` be true for this
model?** (`core-cnn/.../Observations.kt:11` — any class outside `{empty, occluded, occupied}`.) Say
yes or no, and note that a `yes` means `boardMatchesIdentityFull` starts running in the tracker,
which is a behaviour change nobody has exercised.

## Steps

1. `scripts/sweep_infer_size.py` — commit `feat(scripts): score identity models on the occupancy metric`
2. `src/chesslab/config.py` + `dataset_build.py` + `cli.py` — commit `feat(dataset): a 13-class mode, derived from CLASSES`
3. Build the three 13-class datasets — no commit
4. Train the chain — no commit
5. Measure both models — no commit
6. Report — commit `docs(specs): 29 phase 00 — what thirteen classes cost`

## Tests

`tests/test_identity_scoring.py`:

1. `test_pocc_matches_the_python_original` — for a handmade probability vector, the sweep's derived
   P(occupied) equals `cnn_recovery.observation_from_probs`'s to 1e-9.
2. `test_two_class_path_unchanged` — the 2-class branch returns exactly what it did before.
3. `test_thirteen_class_list_is_derived` — the 13-class list is `config.CLASSES` minus `occluded`,
   in the same order, not a literal.

```
.venv/Scripts/python.exe -m pytest -q tests/test_identity_scoring.py tests/test_training.py
.venv/Scripts/python.exe -m ruff check <your files>
```

## Acceptance criteria

- [ ] The 2-class regression gate passes **before** training starts.
- [ ] Both models scored in one run; four numbers each.
- [ ] An explicit `classesHaveIdentity` yes/no and what it implies.
- [ ] If 14 classes were used instead of 13: how often the untrained `occluded` logit wins.
- [ ] GPU lock taken and released; nothing under `data/` committed; the `data` junction removed.

## Do NOT / Out of scope

- Do **not** change the backbone, norm, resolution, scales, dataset or seed. One variable.
- Do **not** try to make identity *accurate*. Piece type is historically the hard part and it is not
  what this phase measures. Occupancy is.
- Do **not** ship the model or touch the Android assets. This produces a candidate and a verdict.
- Do **not** add an `occluded` class to the training data. There is none, and manufacturing it is a
  synthetic-rendering project, not this phase.
