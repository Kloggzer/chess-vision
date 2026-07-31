# 01 — mine the 13-class model's phantoms and train against them

**Result: the intervention works and the model still fails. 1 165 → 602 phantoms, and the bar
is 1.** Run on branch `spec-29-01-mine-and-finetune`; model `occ-v8p-f5nd-hn`.

## The question

`occ-v8p-f5nd` reads 1 165 of 4 687 empty crops as occupied (24.9 %) against the 2-class
champion's 1. Phase 00 attributed that to the reader: occupancy is `1 − P(empty) − P(occluded)`,
so an undecided 13-way softmax lands at 0.923 "occupied" and **545 of the 1 165 phantoms still
have `empty` as their argmax**. If that is structural, hard negatives cannot reach them, and only
the other 620 — the ones where a piece class actually wins — should improve.

That prediction is wrong, and backwards.

## What was done

Mined with `mine_hard_empty.py --criterion occupancy --infer-size 80`, i.e. on the phantom
condition itself (`p_occ > p_empty`) at the size that serves. **9 290** hard empties out of 41 607
real empty crops scanned (22.3 %), excluding the held-out phone session `20260730-145846`.

Then fine-tuned from the `occ-v8p-f5nd` checkpoint on `occ-real5nd-13c` — the same dataset, the
same recorded split, the same 13 332 empty / 4 444 piece distribution. The **only** variable is
which 13 332 empties: 7 745 were swapped so that all 6 944 keep-list crops that fall in the train
split survive the cap (the old draw kept 2 970 of them by chance). 10 epochs, `--lr 3e-5`,
`--scales 48,64,80,96`, `--patience 25`, seed 42.

## Numbers — `occ-real6` test, 80 px, path A, both models in one run

| Run | Session | Phantoms | piece_argmax | summed_mass | Misses | margin p99.9 / max |
|---|---|---|---|---|---|---|
| `occ-v8p-f5nd` | `20260721-212830` (anchor) | 950 | 547 | 403 | 44 | 0.995 / 0.997 |
| `occ-v8p-f5nd` | `20260730-145846` (phone) | 215 | 73 | 142 | 0 | 0.965 / 0.973 |
| `occ-v8p-f5nd-hn` | `20260721-212830` (anchor) | **505** | 208 | 297 | **0** | 0.997 / 0.998 |
| `occ-v8p-f5nd-hn` | `20260730-145846` (phone) | **97** | 47 | 50 | 1 | 0.943 / 0.972 |

Totals: **1 165 → 602 phantoms (−48 %)**, **44 → 1 misses**. Reference bar (`occ-v6-f5nd`,
2 classes): **1 phantom / 12 misses / margin 0.316 / 0.512**.

**Neither test session was trained on.** `20260721-212830` is the *test* split of
`occ-real5nd-13c`, and the keep list only acts on the train split, so mining it changed nothing
about it; `20260730-145846` is not in `occ-real5nd-13c` at all and was excluded from mining too.
The phone session — never mined, never trained on — improved *more* in relative terms (−55 %) than
the anchor (−47 %). The improvement is generalisation, not memorisation.

## The finding: the "structural" half was the EASY half

Fate of each of the baseline's 1 165 phantoms under the fine-tune — "fixed" means it stopped
being a phantom of any kind:

| Baseline kind | n | Fixed entirely | Still a phantom | of which merely demoted to `summed_mass` |
|---|---|---|---|---|
| `piece_argmax` | 620 | **131 (21 %)** | 489 | 236 |
| `summed_mass` | 545 | **443 (81 %)** | 102 | — |

The half phase 00 called structurally unreachable was fixed at **four times the rate** of the
classic hard examples. It is obvious in hindsight: a `summed_mass` phantom is one whose `P(empty)`
sits just under 0.5 and needs a nudge, while a `piece_argmax` phantom has a piece class already
winning and needs the argmax overturned. 236 of the piece-argmax ones only *demoted* — they lost
the piece but stayed phantoms.

So the reader arithmetic is real but it is **not a floor**. Hard negatives move it.

## Why it is still a rejection

- **602 phantoms against a bar of 1.** A 48 % cut off a number that is 1 165x too large is not
  progress toward deployment.
- **The margin did not move.** 0.995 → 0.997 on the anchor: the worst empty crops are still read
  as ~1.0 occupied. Halving the count did nothing to the tail, and the tail is what produces live
  phantoms on unseen material.
- **`m@ph` is unchanged: 1 718 → 1 719.** To reach zero phantoms either model must give up ~73 %
  of the 2 353 occupied squares. There is no operating point on this curve.
- 9 290 mined crops is 22 % of the entire real empty corpus. There is no larger dose available.

## Landmines walked into

1. **The keep list had never reached a single batch.** `dataset_build` honoured
   `hard_empty.jsonl`; `run_train` re-ran `subsample_classes` on the uncapped manifest without
   `priority_paths` and re-drew it away. Fixed in `ebbc784` — without it this phase would have
   measured nothing and reported a null result.
2. **The miner's criterion could not see the failure.** `argmax != empty AND conf >= 0.5` misses
   all 545 summed-mass phantoms by construction, and the 620 piece-argmax ones win at a mean
   confidence of 0.252. Zero of the 9 290 clear the tracker's 0.85 gate.
3. **The brief's "contaminated leg" is not reachable.** Training on the anchor requires moving it
   out of test, which the recorded split forbids. Reusing `split.json` verbatim yields two clean
   legs instead of one — better, but the anchor must not be described as contaminated.
4. **99.7 % of the mined crops are dark squares** (9 260 of 9 290). Whatever this is, it is the
   dark-square domain gap wearing a 13-class hat.

## Verdict

Phase 00's veto stands. Widening the output band costs no compute and buys `classesHaveIdentity`,
but its occupancy quality is not recoverable by hard negatives — the best available dose moves
1 165 phantoms to 602 and leaves the margin at 1.0. **Do not ship a 13-class occupancy reader.**
If identity is wanted for the verify rung, it has to come from a head that does not have to pay
for it in occupancy — a separate occupancy output, not a summed piece mass.
