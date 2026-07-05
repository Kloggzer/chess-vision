# Training & Accuracy Improvements for Move Tracking

Deep-dive result: why the previous models are insufficient for move tracking, and the
prioritized path forward. Key takeaway upfront: **Occupancy detection (empty/occupied) is already
the strongest capability of the models (0.78–0.91) — and that's exactly what the move_tracker needs.
The piece type is the bottleneck (52–59 % type errors), but secondary for move tracking,
because the tracker knows the piece identity from the game history.**

## 1. Current State: Run Results

| Run | Dataset | Train/Val | Backbone | Head | val_acc | macro_recall | board_acc |
|---|---|---|---|---|---|---|---|
| exp-warp-none-combined | bakeoff (2 Sessions!) | 704 / 512 | smallcnn | combined | 0.633 | 0.548 | 0.000 |
| exp-warp-clahe-combined | " | " | smallcnn | combined | 0.714 | 0.531 | 0.000 |
| exp-warp-*-factored (4×) | " | " | smallcnn | factored | 0.49–0.64 | 0.34–0.39 | 0.000 |
| exp-warp-none-twostage | " | " | smallcnn | twostage | 0.713 | 0.450 | 0.000 (occ_acc **0.914**) |
| run-20260626-155023 | S1 | 540 / 796 | mobilenet_v3s | combined | 0.658 | 0.475 | 0.186 |
| run-20260626-163320 | S2 | 4222 / 2324 | mobilenet_v3s | combined | **0.840** | 0.706 | 0.127 |
| run-20260630-091605 | s5 | 8684 / ? | smallcnn | combined | 0.825 | 0.693 | 0.000 |

Diagnosis axes (Bake-off): color_err 0.01–0.06 (color is solved), type_err 0.52–0.59
(type is the problem), occ_acc 0.78–0.91 (occupancy nearly solved, twostage best).

**Important:** The live-observed "near-random" performance of the exp-warp models was (also) a
serving problem, not a pure training problem: `predict_arrays()` does not apply photometry —
a clahe/gamma model sees different images during inference than during training. → Issue C1 / R1.

## 2. Root Causes (ranked by evidence)

1. **Position overfitting (critical).** In the recording sessions, each piece type always stands on
   the same line; multiple classes exist only in a single session (split.json warned
   12×, Test-Split empty). The model can learn "line index → type" instead of piece shapes —
   val_acc overestimates true generalization, and the type collapses on new positions.
2. **Type confusion as the dominant failure mode.** Rare pieces (Q, K: 1–2 exemplars per
   board) have too few examples; N↔B, R↔Q are similar from the top-down view.
3. **Datasets too small.** Bake-off: 1536 crops = 24 frames. Simply too little for 14 classes with
   class imbalance; s5 (8684) already shows the jump to 0.83.
4. **board_acc as a metric is too harsh and too high-variance.** 0.84 square_acc ⇒ as expected
   board_acc ≈ 0 with independent errors; the measured 0.13–0.19 come from correlated
   errors (empty ≈ perfect). With 8–70 val frames the metric is nearly noise — unsuitable as
   a checkpoint criterion.
5. **Augmentation too conservative** for real camera day-to-day (brightness ±0.2, blur σ≤0.8 —
   real: shadows, focus drift, color casts).

## 3. Roadmap (prioritized)

### P0 — Achieve serving parity (prerequisite for everything)
Build `crops_for_model` facade (recommendations.md R1): apply geometry **and** photometry from the
run config on every inference. Without this, every model improvement in the move_tracker remains
invisible. *Effort: 1 day. Effect: photometry models become usable at all.*

### P1 — Diversify data: random piece-to-line assignment
New sessions where the piece→line mapping is **random per session** (Session A:
a=K, b=Q,…; Session B: a=R, b=P,…), plus at least one session with an actual game position and
different lighting conditions (daylight/LED/shadow). Target ≥4 sessions, ≥4000 crops/session.
After that, make split validation strict (R5) so this does not happen again.
*Effect (estimated): board_acc 0.35–0.50, real type progress instead of line memorization.*

### P2 — Occupancy-first for the move_tracker
The tracker primarily needs from the CNN "which square became empty / is no longer empty" — the
piece type it knows from the move history. Consequences:
- **twostage head as default** (best occ_acc 0.914 already on mini-data) or, when consuming
  a combined model, collapse the 14 classes to binary (empty/occluded vs. rest) — that is
  significantly more robust than the argmax class.
- **Switch checkpoint selection to occupancy:** change the early stopping score from `(macro_recall, board_acc)`
  to `(occ_board_acc, occ_acc)` or a mixture `0.7·occ_board_acc + 0.3·piece_acc`
  (training/train.py, score tuple ~line 192).
- Use confidence for recovery purposes: only reconsider squares with high occupancy confidence.
*Effect: The metric relevant for move tracking (occupancy board accuracy) is already nearly
usable and will be directly optimized.*

### P3 — Leverage pretraining (chesscog/ChessReD/synth)
The ingest paths already exist: first pretrain on pretrain-chesscog (+ ChessReD), then
finetune with low LR (1e-4) on the live sessions. The custom synth pipeline (Blender,
top-down, custom pieces) is the best long-term lever against data scarcity — but first implement
H5/R6 (reproducible paths) and the corner-order test (C3/R2), otherwise you risk
a silently incorrectly labeled synth dataset.
*Effect: faster convergence, less live-collection effort for the same quality.*

### P4 — Adapt augmentation to camera reality
Brightness/contrast ±0.35, gamma 0.6–1.8, blur σ up to 1.5; rotation/flip remain prohibited
(fixed camera, square color!). Measure A/B on s5. (`config.py` AugmentPolicy, ~lines 130–149.)
*Effect: +2–5 % val_acc under lighting variance, more robust color.*

### P5 — Class balance for rare types
Weight Q/K/N higher in the loss (3–5×) or oversample them in batches to ~50 % of occupied squares.
Only meaningfully evaluable after P1 (before that, one measures line memorization).

### P6 — Deferred
- **Debug factored head:** empirically inferior everywhere; only bring back after P1 with >5k diverse
  crops, otherwise discard.
- **Larger backbones:** mobilenet_v3_small suffices; the problem is data, not capacity.
- **"Repair" board_acc:** not necessary — keep as a reporting metric, replaced as a steering metric
  by P2.

## 4. Expectation once P0–P4 are implemented

val_acc 0.88–0.95, board_acc 0.45–0.65 — and, crucially for the tracker:
**Occupancy accuracy > 0.96 per square**, i.e., a reliable basis for CNN recovery
("which square actually became empty / is no longer empty") and later full resync from
any arbitrary position.

## 5. Direct relevance to the planned CNN recovery in the move_tracker

For the upcoming feature ("only check which square became empty / is no longer empty"):
1. P0 first — otherwise the recovery classifies on incorrectly preprocessed crops.
2. Model selection until P1 is complete: use run-20260626-163320 (val_acc 0.84, combined, S2) with
   **binary collapsed** classes; not the exp-warp photometry models, as long as
   P0 is missing.
3. Recovery algorithm: diff CNN occupancy image vs. believed board occupancy; apply all legal
   moves on a board copy and choose the move whose resulting occupancy best matches the CNN
   observation (covers captures, castling, en passant). Only count squares with high
   confidence; on a tie, make no decision (the existing
   ambiguity mechanism applies).
