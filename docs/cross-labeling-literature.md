# Cross-labeling — what the literature says, and how the audit is built

> Written 2026-08-15 for the "two-halves cross-test" plan: train one model per session half, let
> each score the other half, turn model-vs-label disagreement into re-labeling flags. Sources were
> retrieved 2026-08-15; numbers quoted from papers are the papers' numbers, not measurements here.
> *(inference)* marks a claim that is mine, not a paper's. Full source notes: git history.

## 0. Short answer

The method is established, but not in the shape the plan stated. What the audit does now:

1. **k = 4 session-grouped out-of-fold folds, not two halves.** Confident learning fixes k = 4
   across all its cross-validation experiments (Northcutt et al. 2021, §5); cleanlab defaults to 5.
   At k = 2 each model trains on half the corpus and every extra model error arrives as a false
   flag on the other half. `chesslab dataset folds -k 4` writes the splits.
2. **Per-class thresholds, not argmax disagreement.** The threshold `t_j` is the mean
   self-confidence `p̂(ỹ=j; x)` over the cells labelled `j` (Eqn. 2); a cell labelled `i` counts
   for `j` only when `p̂(ỹ=j; x) ≥ t_j` (Eqn. 1). On CIFAR-10 at 20 % noise this raised precision
   from 56 % (argmax) to 65–70 % at somewhat lower recall (Table 4). Rank found errors by the
   normalized margin `p̂(given) − max_{other} p̂`.
3. **Split by session.** Required for non-circularity (a model never scores a session it trained
   on) and it matches the use case — but it buys that at the price of domain shift, and the flags
   contain the shift (Saeb et al. / Little et al. 2017, GigaScience).

**Expect about half the flags to be false alarms**: 51 % of confident-learning flags were confirmed
by human validators across ten datasets (Northcutt, Athalye & Mueller 2021). Plan one wasted human
decision per real error, and measure your own ratio on a small first batch.

## 1. The limits no fold count fixes

- **The assumption does not hold here.** Confident learning assumes **class-conditional** noise
  (Angluin & Laird): the flip depends on the true class, not on the image. A mis-set quad, a hand
  over a square, a transposed bridge are all **instance-dependent**. The method still finds real
  errors, but its guarantees stop and its recall is unknown — a clean audit is not evidence of a
  clean corpus.
- **Both halves go blind the same way.** Brodley & Friedl (1999) built their filters from
  *different* algorithms so the biases would not coincide. Same architecture, camera, light and
  quad code on every fold is one detector run k times. **Random noise is what this method finds;
  systematic noise is what it learns.** A geometry error in *one* session lights up; the same
  error in *all* sessions produces zero flags. Only a ground truth built by a different mechanism
  (hand-placed boards, independently re-derived geometry) sees it.
- **Low-prevalence classes**: `t_j` is an average over the cells labelled `j`, estimated from the
  labels under audit — weak for rare classes *(inference)*.
- **Noise ceilings** (Brodley: filtering stops helping near 40 % noise; CL Thm. 2 needs the correct
  label to stay the most likely per class) are far above FEN-derived label noise, unless one
  session is catastrophically misaligned.

## 2. Practice

- **Aggregate before showing a human.** A mis-set quad should appear as a dense, spatially coherent
  block in one session, not as 40 unrelated crops. Check per-session flag density: far above the
  median is either misalignment (fix once at the source) or domain shift (the flags are noise).
- **Spot-check the unflagged.** A flag review measures E1 (good data flagged); only a random blind
  audit of unflagged cells measures E2 (bad data kept), i.e. recall *(inference, Pickler et al.
  2025 propose FNR at the noise rate as the metric)*.
- **Human disagreement is a signal.** Beyer et al. 2020 discarded the images where the human
  labelers disagreed instead of forcing a label.

## 3. Only classes the model outputs (found 2026-09-08)

The fold models have 13 classes; occlusion is a separate sigmoid (`coverage_output`), cut off
before the softmax. `occluded` still arrived as a threshold class from old hand-painted ledger
rows — and Eqn. 2 gives a class the model cannot output a threshold of **0**, which every cell
passes. Whenever the given label failed its own threshold, `occluded` won the argmax at
probability 0.000: **3 548 of 9 807 flags**.

Fix: `read_proposals` returns the `_classes` from each `model-reads.jsonl` header, and
`confident_class` decides only over those
(`test_a_class_the_model_cannot_output_never_wins`). After it: 6 259 flags.

Occlusion has one owner: the **matte** measures it (`--visible` drops every cell over
`PIECE_VISIBLE_MAX = 0.15`), the model's `model_cov` travels with each flag as a second opinion, and
hand-painted `occluded` rows are **no candidate**.

## 4. Narrowing a foreign proposer (measured 2026-08-21)

The first corpus-wide audit used the composite pretrain `comp13-occ-bn-lr1e2-bs512`, the only
model that had trained on none of the 20 recordings. Over 470 016 cells it raised **84 800 flags
(18.0 %)** — a measure of what the proposer cannot do, not of label quality. Two cuts, both options
on `realgames audit-flags`:

| | flags | share |
|---|---:|---:|
| everything (`--all --any-coverage`) | 84 800 | 18.0 % |
| `--occupancy` | 18 260 | 3.9 % |
| `--occupancy --visible` | **4 359** | **0.9 %** |

- **`--occupancy`**: 72 % of the flags disputed the piece TYPE at the right colour — a model trained
  on rendered pieces has never seen this set's shapes. A foreign proposer trades circularity for a
  domain gap, and Eqn. 2 makes it worse: a class the model reads *badly* gets a *low* threshold and
  attracts more flags (`empty → piece` rose from 2.3 % of argmax disagreements to 14.7 %).
- **`--visible`**: 78 % of the rest sat on cells the matte measured as covered. `OcclusionLoss`
  masks those out of the class loss, so a human ruling on them changes nothing.
  `audit_flags.covered_cells` reads the matte directly.

What survives is worth a human: 4 359 cells on 685 `(session, square)` pairs (a lifted piece
stays lifted, one verdict clears ~6 cells). `piece → empty` was high precision (281 of 286 sampled
at p ≥ 0.99 genuine, 5 on a neighbouring square — no systematic offset); `empty → piece` was mixed
(real pieces, hands the matte missed at `coverage 0.0`, hallucinations on dark squares). **282 of
the 286 were not named by the row's `unknown_squares`** — the gate meant to catch a lagging FEN is
the thing to fix, not the labels.
