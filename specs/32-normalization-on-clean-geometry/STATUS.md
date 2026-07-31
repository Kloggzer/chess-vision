# specs/32 — normalization, re-asked on clean geometry

> Opened 2026-07-31. `CLAUDE.md` says the normalization question is settled and should not be
> reopened. It is being reopened deliberately and for one reason: **the exclusion chain in
> specs/25 was measured on mis-aligned crops.** One of its five measured causes was "the data", and
> the data changed on 2026-07-31 — every session was re-fitted and re-sliced, taking the corpus from
> a 3.2–6.5 px median square-edge offset to 2.0–3.3 (`docs/data-pipeline.md` §12). A conclusion
> whose input moved is worth re-testing once. If BatchNorm loses again on clean data, the chain is
> closed for good and this file is the record of that.

## The reference everything is measured against

Path A, 80 px, `occ-real6a` test (110 boards / 7 040 crops), which is the aligned twin of
`occ-real6` — same sessions, same split, same dedup and balancing policy, only the pixels differ
(built with `chesslab dataset build --like`).

**The champion is not a new run.** `occ-v6-f5nd`, simply re-measured on the corrected geometry,
scores 0 phantoms / 3 misses at the phantom-free point / margin **0.050 / 0.093**. Retraining its own
recipe on the aligned data (`occ-v7gn`) did *not* beat it. That is the first result of this pack and
it is worth stating plainly: the geometry was the problem, the weights were not.

## Runs

All: `mobilenetv4_conv_small_035`, head `combined`, batch 256, seed 42, `erase_p 0.25`, `bg_p 0.6`,
patience 25, dataset `occ-real6a`. "Scratch" means random init; the warm ones resume `occ-v6-p2`
(the synthetic pretrain the champion also came through).

| run | norm | init | lr | epochs | scales | phantoms | miss @ 0 ph | margin p99.9 / max |
|---|---|---|---:|---:|---|---:|---:|---|
| `occ-v6-f5nd` | GN | — (champion, re-measured) | — | — | — | **0** | **3** | **0.050 / 0.093** |
| `occ-v7gn` | GN | warm | 3e-04 | 20 | 48,64,80,96 | 0 | 4 | 0.105 / 0.215 |
| `occ-v7bn` | BN | warm | 3e-04 | 20 | 48,64,80,96 | 1988 | — | 1.000 / 1.000 |
| `occ-v7bn-s` | BN | scratch | 3e-04 | 60 | 48,64,80,96 | **0** | 82 | 0.298 / 0.491 |
| `occ-v7gn-s` | GN | scratch | 3e-04 | 60 | 48,64,80,96 | **0** | 16 | 0.313 / 0.422 |
| `occ-v7bn-s-lr1e3` | BN | scratch | 1e-03 | 60 | 48,64,80,96 | **0** | **16** | **0.055** / 0.381 |
| `occ-v7gn-s-lr1e3` | GN | scratch | 1e-03 | 60 | 48,64,80,96 | **0** | **0** | 0.213 / 0.320 |
| `occ-v7bn-s-lr3e3` | BN | scratch | 3e-03 | 60 | 48,64,80,96 | **0** | **0** | **0.035** / 0.299 |
| `occ-v7gn-s-lr3e3` | GN | scratch | 3e-03 | 60 | 48,64,80,96 | **11** | — | 0.990 / 0.994 |
| `occ-v7bn-s1scale` | BN | scratch | 3e-04 | 60 | **80 only** | — | — | — |

## What each row is for

**`occ-v7bn` (warm BN) is not evidence about BatchNorm.** Loading GroupNorm weights into a BN net
leaves the normalization starting from nothing, and `lr 3e-04` is a finetune rate — the rate you use
to nudge a finished model, not to learn a layer. It collapsed exactly as one would expect
(train_loss 4.39 at epoch 0 against GN's 0.126) and is recorded only so nobody re-runs it.

**The lr grid is symmetric on purpose.** Tuning BN's recipe against GroupNorm's inherited default
would be a comparison rigged in BN's favour, so both norms get the same three rates. If a tuned BN
beats an untuned GN, that is not a result.

**`occ-v7bn-s1scale` is the discriminating row.** specs/25 measured BN's failure cause as
multi-scale: one running statistic cannot serve four input sizes, and at 32 px BN read every
occupied square as empty. No learning rate and no epoch count can fix an averaged statistic. If BN
at a single scale reaches GN-like numbers, the cause is structural and the rate was never the issue.

## Two things about the recipe that were not known when specs/25 ran

**`CosineAnnealingLR(T_max=epochs)`.** The schedule is tied to the epoch count, so "the same run,
longer" does not exist — a 60-epoch and a 200-epoch run are different trajectories, and a plateau in
the last third of a run may be the cosine floor rather than convergence. Any earlier reading of
"it had converged" from a training curve in this repo is suspect for that reason.

**`lr 3e-04` was never chosen.** It is the project default. Bjorck et al.
([arXiv:1806.02375](https://arxiv.org/abs/1806.02375)) report that BN's primary benefit is
tolerating larger learning rates, and that unnormalized nets diverge at rates BN handles. Testing BN
at a rate picked for GroupNorm therefore removes the one advantage the literature credits it with.
`scripts/lr_range_test.py` measures each norm's own band (Smith,
[arXiv:1506.01186](https://arxiv.org/abs/1506.01186)) rather than sampling three guessed points.

## Still open

- The champion is a three-stage chain (synthetic pretrain `occ-v6-p1` → `occ-v6-p2` → real
  finetune). **BatchNorm has never been given that chain.** Every BN run on record is either a
  cold start on 17 776 real crops or a warm start from GroupNorm weights. A BN pretrain on the
  synthetic sets followed by a real finetune is the only genuinely like-for-like comparison, and it
  has not been run.
- Learning-rate-free and schedule-free optimizers (Prodigy,
  [arXiv:2306.06101](https://arxiv.org/abs/2306.06101); Schedule-Free AdamW,
  [arXiv:2405.15682](https://arxiv.org/abs/2405.15682)) would remove both the guessed rate and the
  `T_max` coupling. Caveat from a 2025 comparison
  ([arXiv:2507.01724](https://arxiv.org/abs/2507.01724)): these methods do well on selected tasks
  and are **not reliable across settings**, so neither can be adopted on reputation — it would have
  to win on phantoms like everything else here.

## The first real surprise: BatchNorm is not a phantom problem any more

`occ-v7bn-s` and `occ-v7gn-s` are the same recipe from random init, and both are **phantom-free**.
BN's p99.9 margin is even slightly the better of the two (0.298 against 0.313); only its max is
worse (0.491 against 0.422). What separates them is accuracy, not phantoms: 82 misses at the
phantom-free point against 16.

specs/25 recorded BN at **293 phantoms against GroupNorm's 0** on the same kind of comparison. On
aligned crops that gap is gone. The failure that closed the normalization question does not
reproduce on clean geometry — which does not make BN the better choice, but does mean the argument
that excluded it no longer holds in the form it was written.

Both are far behind the champion (3 misses, margin 0.050 / 0.093), and they should be: neither has
been through the synthetic pretrain chain. That makes the missing experiment — BN pretrained the way
the champion was — the one that now matters most.

**Caveat on these two rows:** measured on the CPU EP while the GPU was busy with the rate grid.
Every other row is a GPU measurement. All rows will be re-measured in one GPU pass before any
conclusion is drawn from the table, per the project's own rule that a reference has to be measured
in the same run as its candidate.

## The second surprise, and it is the bigger one: the rate was the whole story

`occ-v7bn-s-lr1e3` is `occ-v7bn-s` with one character changed — peak rate 1e-03 instead of 3e-04.

| run | norm | lr | phantoms | miss @ 0 ph | margin p99.9 / max |
|---|---|---:|---:|---:|---|
| `occ-v7bn-s` | BN | 3e-04 | 0 | 82 | 0.298 / 0.491 |
| `occ-v7gn-s` | GN | 3e-04 | 0 | 16 | 0.313 / 0.422 |
| `occ-v7bn-s-lr1e3` | BN | **1e-03** | 0 | **16** | **0.055** / 0.381 |

BatchNorm at the higher rate matches GroupNorm's miss count exactly and carries a **5.7x better
p99.9 margin** — 0.055 against 0.313, with a better max as well (0.381 against 0.422). For scale:
the champion, which came through two stages of synthetic pretraining, sits at 0.050. This run is a
cold start on 17 776 real crops and nothing else.

The training log said the same thing in advance and we would have thrown it away: at 3e-04 BN's
`occ_board_acc` was 0.0000 for all 60 epochs; at 1e-03 it reaches 0.6667. `val_acc` went 0.920 to
0.982.

This is precisely what Bjorck et al. ([arXiv:1806.02375](https://arxiv.org/abs/1806.02375)) predict:
BN's benefit *is* tolerating a larger learning rate, so measuring BN at a rate chosen for another
normalizer measures nothing about BN. Every BN-vs-GN comparison in this repo, including the whole
exclusion chain in specs/25, was run at 3e-04.

**Not yet a conclusion.** The GroupNorm control at 1e-03 is still running. If GN improves by the same
margin, the finding is "the inherited default was bad for both norms" — still worth having, but a
different sentence. That control is the reason the grid was symmetric.

## The control lands, and it is bigger than the BN finding

| run | norm | init | lr | phantoms | miss @ 0 ph | margin p99.9 / max |
|---|---|---|---:|---:|---:|---|
| `occ-v6-f5nd` | GN | 3-stage chain | (3e-05 final) | 0 | 3 | **0.050** / 0.093 |
| `occ-v7bn-s` | BN | scratch | 3e-04 | 0 | 82 | 0.298 / 0.491 |
| `occ-v7gn-s` | GN | scratch | 3e-04 | 0 | 16 | 0.313 / 0.422 |
| `occ-v7bn-s-lr1e3` | BN | scratch | 1e-03 | 0 | 16 | 0.055 / 0.381 |
| `occ-v7gn-s-lr1e3` | GN | scratch | **1e-03** | 0 | **0** | 0.213 / 0.320 |

**The inherited `3e-04` was wrong for both normalizers, not just for BatchNorm.** GroupNorm at
1e-03 goes from 16 misses to **zero** — the only run on record that gets every occupied square on
both test sessions with no phantom anywhere. From a 60-epoch cold start on 17 776 real crops, with
no synthetic pretraining at all, against a champion that came through two pretrain stages and still
misses three.

So the BN story has to be restated more carefully than the previous section did. Both norms gain
from the higher rate; BN gains more (82 → 16 misses against GN's 16 → 0). What separates them at
1e-03 is which axis they win on: BN takes the margin (0.055 against 0.213), GN takes the misses
(0 against 16). Neither is the crippled loser that specs/25 recorded, and neither is measured at a
rate anyone chose — 1e-03 is the next point on a guessed grid, not an optimum. The range test is
what would find the optimum.

**What this does to specs/25.** That exclusion chain ran on mis-aligned crops *and* at a rate now
shown to cost the better normalizer 16 misses and the worse one 66. Two of its five causes may still
stand on their own — the multi-scale statistic argument is not a rate artefact — but the chain as a
whole cannot be cited as settled any more. `occ-v7bn-s1scale` is still queued and speaks to exactly
that.

**Still to re-measure.** The scratch rows were scored on the CPU EP while the GPU trained; the
champion and the warm rows were scored on the GPU. The effect sizes here are far larger than any
CPU/GPU numerical difference, but the whole table gets one GPU pass before it is quoted anywhere.

## BatchNorm at 3e-03 is the best model this project has produced

| run | norm | init | lr | phantoms | miss @ 0 ph | margin p99.9 / max |
|---|---|---|---:|---:|---:|---|
| `occ-v6-f5nd` (champion) | GN | 3-stage chain | 3e-05 final | 0 | 3 | 0.050 / 0.093 |
| `occ-v7gn-s-lr1e3` | GN | scratch | 1e-03 | 0 | **0** | 0.213 / 0.320 |
| `occ-v7bn-s-lr1e3` | BN | scratch | 1e-03 | 0 | 16 | 0.055 / 0.381 |
| **`occ-v7bn-s-lr3e3`** | **BN** | **scratch** | **3e-03** | **0** | **0** | **0.035** / 0.299 |

It wins on both axes at once: every occupied square on both test sessions, nothing invented
anywhere, and the tightest empty-crop margin measured here — 0.035 against the champion's 0.050.
Sixty epochs from random init on 17 776 real crops. The champion needed two synthetic pretrain
stages and still misses three squares.

And it is monotone in the rate, which is the part that makes it a result rather than a lucky seed:
82 misses at 3e-04, 16 at 1e-03, 0 at 3e-03, with the margin falling 0.298 → 0.055 → 0.035 in step.
That is the shape Bjorck et al. describe — BatchNorm's usable rate band simply lies higher than the
one this project has been testing it in.

**The normalization conclusion in `CLAUDE.md` is now wrong as written.** It says BatchNorm was
excluded across five measured causes. Those measurements were taken on mis-aligned crops at 3e-04.
On aligned crops at a rate that suits it, BatchNorm is not merely viable — it is the best occupancy
model on record. That pitfall entry needs rewriting once the GPU re-measurement confirms the table,
and the BatchNorm exclusion should be retired rather than amended.

**Do not act on this yet.** Three things are still outstanding and each could move it:
the GroupNorm control at 3e-03 (running), whether 3e-03 is past the peak or still climbing (the
range test), and a single GPU pass over the whole table — every scratch row here was scored on the
CPU EP while the GPU trained, and the champion's 0.050 was not.

## The control that makes it a finding: GroupNorm breaks where BatchNorm is still improving

| lr | BatchNorm | GroupNorm |
|---|---|---|
| 3e-04 | 0 ph, 82 miss, margin 0.298 | 0 ph, 16 miss, margin 0.313 |
| 1e-03 | 0 ph, 16 miss, margin 0.055 | 0 ph, **0** miss, margin 0.213 |
| 3e-03 | 0 ph, **0** miss, margin **0.035** | **11 phantoms**, margin 0.990 |

GroupNorm's usable band ends between 1e-03 and 3e-03. BatchNorm's does not — it is still improving
at 3e-03, on both axes, and has not been tested higher.

This is Bjorck et al.'s claim reproduced on this project's own data and own metric: BatchNorm
tolerates a learning rate that breaks the alternative. It is no longer an argument from a paper
about why BN *should* have been tested differently; it is a measured band, and the two bands do not
coincide. Any protocol that picks one rate and applies it to both normalizers will therefore
mis-rank them, whichever rate it picks.

**And GroupNorm at 3e-03 has the best training curve in the entire grid** — `val_acc` 0.9993,
`occ_board_acc` 0.9583, both by a clear margin — while being the only run here disqualified by
phantoms. `CLAUDE.md`'s warning that `val_acc` has ranked runs in REVERSE did not need re-proving,
but it just got its cleanest example: the checkpoint selector chose that model *because* of the
score that is uncorrelated with the thing we care about.

**Open:** whether 3e-03 is BatchNorm's peak or merely the last point on the grid. `occ-v7bn-s-lr1e2`
has been queued to find the far edge, and the range test will show the shape between the points.
