# Phase 00 — Precise-BN warm start: real statistics before the finetune

## Why

The AdaBN measurement on 2026-07-30 tested the **wrong end**. It recalibrated the *finished*
`occ-v6bn2-f5nd`, found its statistics already correct (0.034 σ), and concluded the damage sits in
the weights. That is sound as far as it goes, but it leaves one variant untested: the BN
real-finetune **starts** at `val_acc` 0.74 while GroupNorm starts at 0.972, because on resume BN
adopts 278 tensors — 138 more than GN — and the extra ones are running statistics measured on the
synthetic `p2v4`. If the finetune spends its 20 epochs walking those statistics to the real domain
by EMA, it is not spending them on the weights, and the 0.93 plateau would be a budget problem
rather than a capacity problem.

This phase hands the finetune correct statistics on day one and sees whether the plateau moves.
It is the cheapest open question in the pack: the warm-started checkpoint **already exists**.

## Design (decided — do not redesign)

`data/models/occ-v4bn-p2-warm80` is the synthetic pretrain `occ-v4bn-p2` with its BN running
statistics re-estimated on 200 real boards from `occ-real5nd`'s train split, re-sliced at 80 px
through the serving path. It was produced by:

```
.venv/Scripts/python.exe scripts/adabn_recalibrate.py --run data/models/occ-v4bn-p2 \
    --size 80 --frames 200 --calib-dataset occ-real5nd --out data/models/occ-v4bn-p2-warm80
```

Recorded shift: **mean 0.042 σ, max 0.381** (the maximum is `bn1.0`, the stem), variance 0.14x
relative. Note this is already a partial answer — the synthetic statistics are *not* wildly wrong —
so a large improvement would be surprising. Report what happens, not what was hoped for.

The experiment is one finetune, identical to `occ-v6bn2-f5nd` in every respect except the resume
parent:

| | `occ-v6bn2-f5nd` (the control, already measured) | `occ-v7bn-warm` (this phase) |
|---|---|---|
| resume | `occ-v4bn-p2` | `occ-v4bn-p2-warm80` |
| everything else | identical | identical |

Single variable. If `occ-v7bn-warm` lands materially better than 660 phantoms, the statistics-at-
resume mechanism is real and phase 01 becomes worth its cost. If it lands at ~660, the mechanism is
dead and phase 01 should be reconsidered before it is built — say so in `STATUS.md`.

## Steps

### 1. Train — no commit (artefacts are gitignored)

Take the GPU lock first (`data/_perf/.gpu-lock`, see `entry.md`). Then:

```
.venv/Scripts/chesslab.exe train --dataset occ-real5nd --out data/models/occ-v7bn-warm \
    --resume occ-v4bn-p2-warm80 --epochs 20 --lr 3e-5 --patience 25 \
    --backbone mobilenetv4_conv_small_035 --norm batchnorm --batch-size 256 \
    --scales 48,64,80,96 --loss ce --num-workers 4 --seed 42 \
    2>&1 | tee data/models/v7bn-warm.log
```

`--patience 25` is mandatory: `occ_board_acc` is floored at 0 for any model below ~`val_acc` 0.98
and would early-stop this run at epoch 9 (see `entry.md`, *Traps*). Release the lock when it exits.

Watch `epoch 0`'s `val_acc`. The control started at **0.7357**. This is the number the phase exists
to move; record it whatever it does.

### 2. Set the inference size and export

```
.venv/Scripts/chesslab.exe export --run data/models/occ-v7bn-warm --format torchscript --infer-size 80x80
```

80 is inside `scales`, so the exporter accepts it silently. If it warns, stop — something about the
run is not what this spec assumes.

### 3. Measure

```
.venv/Scripts/python.exe scripts/sweep_infer_size.py --runs occ-v7bn-warm \
    --dataset occ-real6 --splits test --sizes 80 --paths a \
    --log data/_perf/v7bn_warm_real6.log
```

### 4. Report — commit `docs(specs): 25 phase 00 — precise-BN warm start, measured`

Fill the phase-00 row of `specs/25-normalization-endgame/STATUS.md` with the six fields from
*Artifact authority*, plus:

- `epoch 0` `val_acc` and the final `val_acc` (against the control's 0.7357 → 0.93 plateau),
- the verdict: does the warm start move the plateau, and by how much,
- an explicit recommendation for phase 01 — **proceed** or **reconsider** — with the reason.

## Tests (write, run once, targeted)

No new code, so no new tests. Run the existing training tests once to prove nothing was disturbed:

```
.venv/Scripts/python.exe -m pytest -q tests/test_training.py
```

If you *did* touch `scripts/adabn_recalibrate.py` (only phase 00 may), lint it scoped:

```
.venv/Scripts/python.exe -m ruff check scripts/adabn_recalibrate.py
```

## Acceptance criteria

- [ ] `data/models/occ-v7bn-warm/config.json` exists with `"infer_size": [80, 80]` and
      `"norm": "batchnorm"` — check with
      `.venv/Scripts/python.exe -c "import json;print(json.load(open('data/models/occ-v7bn-warm/config.json'))['infer_size'])"`.
- [ ] `data/models/v7bn-warm.log` contains 20 `epoch` lines (no early stop).
- [ ] `data/_perf/v7bn_warm_real6.log` contains a `@ 80px` per-session line.
- [ ] The STATUS row states phantoms/misses/margin and a proceed-or-reconsider recommendation for 01.
- [ ] No file under `data/` is staged in any commit.

## Do NOT / Out of scope

- Do **not** re-run AdaBN on the finished model — that measurement exists and is negative.
- Do **not** tune the learning rate, epochs, augmentation, loss or scales. One variable.
- Do **not** touch `src/`. This phase changes no library code.
- Do **not** delete `occ-v6bn2-f5nd` or any other failed run; they are the exclusion chain.
- Do **not** conclude from `val_acc`. The verdict is the path-A phantom count on `occ-real6`.
