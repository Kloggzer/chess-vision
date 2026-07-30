# 29 — Widen the output band

> Entry file. Read completely, then your phase file. The protocol of
> `specs/22-inference-resolution/entry.md` applies verbatim. Branches are cut from the pack commit
> on `spec-24-frame-the-board`, **not from `main`**.

## Why this is the one lever that costs nothing

Every idea this project chased over the last two days traded quality against speed and lost. This
one does not: **widening the output band costs no measurable compute.** The classifier is
`1280 → 2` today; `1280 → 13` is 16 640 parameters against 2 560, at 1×1 spatial resolution.
Against 6.7 MMAC per crop that is rounding noise.

What it buys is not speed. It is quality, and a dormant safety rung.

**A whole verify rung is unreachable today.** `specs/27` measured it: `boardMatchesIdentityFull`
(`core-cnn/.../Recovery.kt:267`) had **zero evaluations across 18 clips**, because
`classesHaveIdentity` (`core-cnn/.../Observations.kt:11`) is false for every bundled model — all
three are 2-class. The engine is already built for it; `Observations.kt:16` says in as many words
that class indices are derived for "2-, 13- and 14-class runs". The machinery is written, tested and
idle.

## Occlusion is excluded, and the corpus says why

`data/manifests/squares.jsonl`, all 53 000 rows:

```
empty 42 848 | wP 3 055 | bP 2 982 | bR 807 | wR 716 | wB 694 | bB 670
bN 561 | wN 511 | wK 441 | bK 441 | bQ 378 | wQ 360
```

**Zero `occluded`.** By construction — capture only happens when the board is clear, and `occluded`
is documented as never coming from FEN. A 14-class run would therefore carry a class with **no
training examples at all**, whose logit is shaped only by whatever the initialisation left there.
That is not a neutral cost: an untrained output can win an argmax on unusual input, and an unusual
input under a hand is exactly the case that matters.

**So the candidate is 13 classes, not 14.** If the 13-class path does not exist in `config.py` /
`dataset_build` / the CLI, phase 00 adds it — it is the point of the pack, not a workaround. If it
turns out 14 is unavoidable, measure it *and* report what the dead class does to the veto metric.

## The bar

`occ-v6-f5nd`'s recipe is the control and the candidate changes **one thing**: the class list.
Same backbone, same GroupNorm, same `--scales 48,64,80,96`, same `occ-real5nd`, same
`--patience 25`, same seed.

Scored at 80 px on `occ-real6` test, path A, **both measured in the same run** — never quoted;
path-A numbers move with the calibration profile. Today's reference for the champion is
**1 phantom / 12 misses / margin 0.316 / 0.512**.

Phantoms are the veto. Then margin. Misses below ~8 are noise. **A 13-class model that reads
identity beautifully and adds a phantom is rejected.**

## The measurement problem this pack must solve first

`scripts/sweep_infer_size.py` — the measurement of record — **cannot score an identity model**:
`occupied_index` (`:190`) raises unless `classes == ["empty", "occupied"]`.

So the sweep is unfrozen for exactly one change: derive occupancy probability for identity models as
the **summed mass of the piece classes**, which is what both ports already do
(`Observations.kt:17`, `cnn_recovery.py:63 observation_from_probs`). Copy that definition; do not
invent a second one — a metric that disagrees with what the tracker computes would measure a model
nobody runs.

**The 2-class path must produce byte-identical numbers after the change.** Prove it by re-scoring
`occ-v6-f5nd` and diffing against `data/_perf/v6_resolution_curve.log`.

## Established — do not re-derive, do not reopen

- **Normalisation is closed from both sides** (specs/25; specs/26 phase 04). Use GroupNorm.
- **The graph is not the cost.** A coalesced graph is 1.7x slower, NNAPI 4.9x, QNN is not in the
  binary. Do not chase node counts.
- **80 px is the resolution optimum** across `[48, 64, 80, 96]`.
- **`val_acc` does not predict the veto metric** — it ranked runs in reverse in specs/25. Only the
  path-A sweep decides. `occ-v4bn-f3` scored `occ_acc` 0.982 in training and 154 phantoms on test.
- **`--patience 25`**: `occ_board_acc` is floored at 0 below ~`val_acc` 0.98, which early-stops an
  unconverged run *and* picks its checkpoint blindly.
- Piece **type** is the historically hard part (N/B/R drove the whole synthetic pipeline). Expect
  identity accuracy to be mediocre. **That is not the question** — the question is whether occupancy
  survives.

## Heavy-compute contract

One chain, `--num-workers 4`, `--patience 25`. Take `data/_perf/.gpu-lock` before training, release
after. The GPU is the user's own machine and is also used for gaming. No sweeps, no seeds, no
"one more try".

## Repo rules

- `.venv/Scripts/python.exe -m ruff check <your files>` and targeted `pytest`, once, at the end.
  Prefer `-m ruff` / `-m pytest` over `uv run`, which rebuilds and fails while `chesslab.exe` runs.
- **Worktree bootstrap**: no `data/` and no `.venv`; junction `data/` in, set `PYTHONPATH` to your
  own `src/`, and **verify `chesslab.__file__` resolves inside your worktree** before measuring.
  **Remove the junction before finishing** — a teardown that follows it can delete the real data
  directory.
- The canonical class list lives in exactly one place, `config.CLASSES`. A 13-class list is a
  derivation of it, not a second copy.
- Never commit anything under `data/`.

## Definition of done

Both rows measured in one run; the 2-class scoring path proven unchanged; a STATUS row with
phantoms, misses, per-session split and margin for control and candidate; and an explicit statement
of whether `classesHaveIdentity` would now be true, i.e. whether the dormant rung wakes up.

**Negative results are complete deliverables.** This project has landed eight of them in two days
and they are the reason nobody will re-run those experiments.
