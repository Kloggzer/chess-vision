# STATUS — 25 normalization endgame

Branch per phase, cut from `main`: `spec-25-00-warm-start`, `spec-25-01-dsbn`,
`spec-25-02-normalizer-free`. Each agent works in its own `git worktree`.
This file is the ONLY hand-off between agents. Append to your own phase's row and to the session
log; never rewrite another phase's entry.

## Phases

| Phase | Concern | State | Owner | Notes |
|---|---|---|---|---|
| 00 | Precise-BN warm start: real statistics before the finetune | todo | — | No code. Runs **first, alone**. Its verdict informs 01. |
| 01 | DSBN: joint synth+real training, one statistic per domain | todo | — | Read 00's row first. Shares `model.py` with 02 — one branch each. |
| 02 | Normalizer-free: ScaledStdConv2d + SkipInit | todo | — | Independent of 00. Shares `model.py` with 01. Full chain, ~1 h GPU. |

States: `todo` → `in progress` → `done` | `blocked`.

**Exactly one training run may be in flight across the pack** — take `data/_perf/.gpu-lock` before
any `chesslab train` (see `entry.md`, *Heavy-compute contract*). Evaluation needs no lock.

## The bar

`occ-v6-f5nd` @ 80 px on `occ-real6` test: **0 phantoms / 11 misses**, margin (empty p99.9 / max)
**0.238 / 0.343**, anchor 9/0 · phone 2/0. Phantoms are the veto; then margin; misses below ~8 are
noise. A phase that does not beat 0 phantoms has not produced a shipping candidate — say so plainly.

## Results

| Run | Phase | px | Phantoms | Misses | Anchor · Phone | Margin p99.9 / max | Verdict |
|---|---|---|---|---|---|---|---|
| `occ-v7bn-warm` | 00 | 80 | — | — | — | — | — |
| `occ-v7dsbn` | 01 | 80 | — | — | — | — | — |
| `occ-v7nf-f5nd` | 02 | 80 | — | — | — | — | — |

## What is already established

See `entry.md`, *What is already established*. In one line: GroupNorm ships at 0 phantoms and cannot
fold; BatchNorm folds and was excluded on 2026-07-30 across three causes (data, scale band,
statistics of the finished model), leaving the convolution weights as the unexplained residual —
`val_acc` 0.93 against GroupNorm's 0.987.

Do not re-run: AdaBN on a finished BN model (measured, 660 → 1140 phantoms), a BN chain at
`scales 32,64,96,128` (measured, 154 and 244 phantoms), a BN chain at `scales 48,64,80,96` on
`occ-real5nd` (measured, 660 phantoms).

## Session log

| Date | Phase | Agent | What happened |
|---|---|---|---|
| 2026-07-30 | — | orchestrator | Pack written. `occ-v4bn-p2-warm80` (phase 00's input) already produced: shift 0.042 σ mean / 0.381 max, var 0.14x. |

## Open questions for the orchestrator

- If 00 reports that a correct warm start does **not** move the plateau, 01's mechanism is dead
  before it is built. 01's agent must ask before spending the GPU.
- Nothing in this pack is expected to beat GroupNorm. If all three land negative, the deliverable is
  the closed question plus the exclusion chain in this file — and the remaining speed lever is
  outside the model (small-batch export: the verify window counts observations, not squares, and
  needs 4 crops instead of 64).
