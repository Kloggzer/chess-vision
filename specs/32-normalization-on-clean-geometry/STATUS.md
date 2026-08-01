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
| `occ-v7bn-s1scale` | BN | scratch | 3e-04 | 60 | **80 only** | 2 | 105 | 0.415 / 0.519 |

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

## The multi-scale explanation does not survive either

specs/25 named multi-scale as BatchNorm's failure cause: one running statistic cannot serve four
input sizes. `occ-v7bn-s1scale` removes that entirely — trained at 80 px only, evaluated at 80 px,
so the statistic serves exactly one size and it is the serving size.

| BN, scratch, lr 3e-04 | phantoms | miss @ 0 ph | margin p99.9 / max |
|---|---:|---:|---|
| scales 48,64,80,96 | 0 | 82 | 0.298 / 0.491 |
| scale 80 only | **2** | 105 | 0.415 / 0.519 |

Narrowing to one scale made it **worse on every axis**, including the phantom count it was supposed
to fix. Whatever was wrong with BatchNorm at 3e-04, one statistic for four resolutions was not it.

One confound worth naming rather than hiding: scale jitter is also augmentation, so the single-scale
run trains with strictly less variety. The two effects cannot be separated by this run alone. But
the direction is unambiguous — the change that was supposed to rescue BN cost it two phantoms — and
the rate change, on the same recipe, took it to zero phantoms and zero misses.

So of specs/25's five measured causes, the two this pack could re-test both fail to reproduce: the
data was mis-aligned, and the rate was the wrong one. The remaining three were measured under both
of those conditions.

## Warm-light training data: the fear was reasonable and wrong

`occ-warm` adds three of the four warm sessions to `occ-real6a`'s train split and holds the extreme
one out — 20260731-222906, colour slider pushed to warm, R:B **51** against the corpus's 1.1–1.2.
Training becomes 72 % warm start-position material, which is what made this look risky.

Path A, 80 px, `occ-warm` test, both models in one run:

| run | anchor | phone | **222906** (held out) | margin p99.9 / max |
|---|---|---|---|---|
| `occ-v7gn-s-lr1e3` (no warm data) | 0 / 0 | 0 / 0 | **657** / 0 | 0.126 / 0.320 |
| `occ-v8gn-warm` | **0 / 0** | **0 / 0** | **126** / 0 | **0.002** / 0.262 |

misses / phantoms.

**Nothing was paid.** The two normal sessions stay at zero misses and zero phantoms despite 72 % of
the training set being warm material.

**The held-out extreme improves 5.2x.** Trained on R:B 4.8, 2.3 and 1.35, measured on R:B 51 — four
times further out than anything it saw. Colour robustness generalises rather than being memorised,
which is the result that decides whether more warm sessions are worth recording (they are, and they
do not have to cover the target condition exactly).

**The margin is 0.002.** Sixty-three times better than the same recipe without warm data and by far
the best number this project has measured — the previous best was 0.035. Across 4 687 empty crops
essentially nothing reads as occupied at all.

Worth naming plainly: the session that produced this was the one that looked too extreme to use.

## What BatchNorm costs at inference — the reason it was wanted in the first place

Both models exported at 80x80, same backbone, same batch:

| | ONNX nodes | composition |
|---|---:|---|
| **BatchNorm** | **89** | 46 Conv, 30 Relu, 10 Add, 3 head |
| GroupNorm | 503 | 138 Constant, 92 Reshape, 56 Add, 46 Conv, **46 InstanceNormalization**, 46 Shape, 46 Mul, 30 Relu |

BatchNorm disappears at export: a BN layer is a fixed per-channel affine at inference and folds into
the preceding convolution. GroupNorm adds 414 nodes, and on device those are exactly what runs on
the CPU EP — 30 ms of the shipped model's 66 ms session (specs/26 phase 00).

Desktop CPU EP, 64 crops, 4 threads, 30 runs: **BatchNorm 3.9 ms median against GroupNorm 20.2 ms**.

**That 5.2x does NOT transfer to the phone, and saying so matters.** The desktop CPU EP has no
XNNPACK, so it runs the convolutions far worse than the device does and the norm overhead is
therefore a much larger share of the total here. On the SM8650 the split was measured as ~36 ms of
convolutions under XNNPACK plus ~30 ms of norm decomposition on the CPU EP. Removing the second
term projects to roughly **66 → 36 ms, a factor near 1.8**, not 5.

What that buys, at the measured price of capacity (`session ms = 26.9 + 2.731 x MMAC/crop`,
specs/28): ~30 ms of freed budget is ~11 MMAC/crop on top of the current 6.7 — about 2.6x the MACs,
and since MACs scale with the square of the width multiplier, roughly **width 0.35 → 0.55 at
today's latency**. specs/28 closed with a STOP because latency is affine in MACs and the backbone
could not grow. It could not grow *while paying for GroupNorm*.

### And it settles a pitfall from the other side

89 nodes is exactly what specs/26 phase 04 reached by folding the champion's GroupNorm into a static
affine — same node count, all 30 ReLUs intact — where the weights did not survive the fold and the
model collapsed to 2 350 phantoms. `CLAUDE.md` concludes from that: "a foldable net cannot be
trained to this quality, and this net cannot be folded."

The first half is now false. `occ-v7bn-s-lr3e3` **is** that folded graph, trained as one from the
start, at 0 phantoms and margin 0.035. The second half still stands — this particular GroupNorm net
still cannot be folded after the fact.

**Not yet measured on the device.** The models are bundled as app assets, so a real SM8650 number
needs an app build. The node counts and the mechanism are certain; the 1.8x is a projection.

## Width, once BatchNorm has paid for it

`occ-v9bn-wide` is `mobilenetv4_conv_small` at full width — 2.50 M parameters against 0.63 M,
27.0 MMAC/crop against 6.7 — with BatchNorm, on `occ-warm`, otherwise identical to the 0.35 runs.

| run | width | norm | anchor | phone | 222906 (held out) | margin p99.9 / max | device ms |
|---|---|---|---|---|---|---|---:|
| `occ-v8bn-warm` | 0.35 | BN | 0/0 | 0/0 | 254 | 0.013 / 0.170 | 7.9 |
| `occ-v8gn-warm` | 0.35 | GN | 0/0 | 0/0 | 126 | 0.002 / 0.262 | 30.0 |
| **`occ-v9bn-wide`** | **1.0** | **BN** | **0/0** | **0/0** | **3** | **0.003 / 0.008** | **24.0** |

misses / phantoms.

**Three misses** on a session at R:B 51 that was never trained on, against 254 for the same
normalizer at 0.35 width and 126 for GroupNorm. And a **maximum** margin of 0.008 — the previous
best anywhere in this project was 0.093, and this session's own corpus start of day was 0.512.

It is also **faster than what ships**: 24.0 ms against the shipped GroupNorm graph's 30.0 ms, at
four times the model. specs/28 closed with a STOP on exactly this idea because latency is affine in
MACs; the arithmetic was right and the line was GroupNorm's.

So the width question and the normalization question turn out to be one question. GroupNorm costs
per convolution, so it taxes precisely the thing that buys accuracy, and at 0.35 width the tax looks
survivable. It is not: at the same latency budget BatchNorm can afford four times the network, and
four times the network is worth 84 misses per one of GroupNorm's.

**Caveats.** Scored on the CPU EP while the GPU trained; the whole table still owes one GPU pass.
Early-stopped at epoch 55 by `--patience 25` keyed on `occ_board_acc`, so it may not be finished.
And the 24.0 ms was measured on an untrained graph of the same architecture — latency is a property
of the graph, but the trained export has not itself been timed.

## Aligning the corpus narrowed the models, and the clips found it

Both real test clips are read WORSE by every model trained on the re-aligned corpus than by the old
champion, which was trained before the re-alignment. Six models — two normalizers, three widths, with
and without the synthetic pretrain chain — produce byte-identical move lists, and all six differ from
the champion. That rules out norm, width and pretraining as the cause and leaves the corpus.

| clip | truth | champion `occ-v6-f5nd` | all six new models |
|---|---|---|---|
| `live-1244-fastplay` | d4 d5 Nf3 Nf6 Nc3 | **exact** | d4 d5 Nf3 Nf6 **Qd3 Ne4** |
| `clip01-illegale-rochade` | 13 plies then an illegal placement | first 8, then **parks** | first 8, then invents Qxd4 Nxe4 Bd3 Bc5 O-O |

On the second clip the invented `Bc5` and `O-O` are the very moves the clip contains as deliberate
rule violations — committed as legal, because by then the tracker's own position had diverged. The
alarm the clip exists to test never fires.

**Measured cause.** `alignment.square_offsets` on the clips' own pinned corners:

| material | offset | as % of a cell |
|---|---:|---:|
| `live-1244-fastplay` | 7.0 px of an 80 px cell | **8.8 %** |
| `clip01-illegale-rochade` | 7.1 px of an 80 px cell | **8.9 %** |
| our corpus, re-aligned | 2.0–3.3 px of 100 px | 2–3 % |
| our corpus, BEFORE re-aligning | 3.2–6.5 px, worst 12–15 | 3–15 % |

The clips sit three times further out than anything the new models were trained on — and inside the
band the champion was trained on, because back then the corpus itself was that badly cut.

**So the alignment work is a gain AND a narrowing.** It bought the margin (0.512 → 0.008 across the
day) and it removed a robustness the corpus had been supplying by accident. That is not an argument
for un-aligning anything; it is an argument for putting the variation back where it belongs, in the
augmentation:

    jitter_translate: float = 0.03  # ± fraction of crop size

The crop spans 110 px of board (a 100 px cell plus 2 x 5 px of pad), so 3 % of the crop is ~3.3 % of
a cell — about a third of what the clips demand. Raising it to ~0.09 and retraining is a
one-parameter experiment, and there is no CLI flag for it yet (only `--erase-p` and `--bg-p` are
plumbed).

**Two of my own claims were wrong on the way here and are corrected in place:** the synthetic
pretrain chain is NOT what separates the champion (`occ-v9bn-chain` has it and behaves like the
others), and reading `live-1244`'s final board occupancy as proof that it contains ten moves was too
weak a test — occupancy cannot tell a knight from a queen, and the manifest's own note says the
game ends in an illegal placement the tracker should alarm on rather than explain away.
