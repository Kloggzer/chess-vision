# Stage 4 — Dataset Management (`dataset.py`)

## Purpose

Turn the labeled crops into a trainable dataset: statistics, class balance,
**session-based** split, and a clearly defined augmentation policy. This stage is
the reason the model later works in real-world operation instead of only looking
good on the training set.

## CLI

```
chesslab stats   [--manifest data/manifests/squares.jsonl]
chesslab split   [--val-frac 0.15] [--test-frac 0.15] [--max-empty-ratio 1.5] [--seed 42]
chesslab dataset verify
```

## `stats` — Dataset Report

Aggregate and output from the manifest (table + optional `--json`):
- Total number of crops, number of sessions, crops per session.
- **Per-class distribution** (all 13). Highlights under-/over-representation.
- Per piece class: coverage on light vs. dark squares (`square_color`).
- Warnings when a non-`empty` class falls below a threshold
  (default: < 200 examples) or a piece only appears on one square color.

## Class Imbalance (Mandatory Treatment)

`empty` dominates massively (over half the time a square is empty). Two levers, both
implemented, combination configurable:

1. **`empty` subsampling during split:** `--max-empty-ratio R` limits `empty` to
   `R` times the **largest piece class**. Excess `empty` crops are (seeded)
   randomly discarded — but **before** the split, consistently.
2. **Class weights for training:** compute `class_weights` (inverse to frequency)
   and write them into the split output so Stage 5 can use them in the loss.

> Note: rare classes (e.g., two queens) are better addressed through targeted collection in
> Stage 2 (`collect live --start-fen`) than through pure oversampling.

## Split — Session-Based (Critical Against Data Leakage)

Frames from the same session/position are nearly identical. A **random** crop split
would distribute almost identical images across train and val -> artificially high scores.

Rules:
- Splitting is done **at the session level**: entire sessions go completely into
  train **or** val **or** test. Never split crops from a single session.
- Target fractions `val-frac`/`test-frac` refer to the crop share; assign sessions
  (seeded) so the fractions are approximated as closely as possible (greedy by session size).
- Ideally all classes are represented in every split; if a class exists in only a single
  session -> WARN (clean evaluation of that class is then impossible).

### Split Output
```
data/manifests/split.json
```
```json
{
  "seed": 42,
  "val_frac": 0.15, "test_frac": 0.15, "max_empty_ratio": 1.5,
  "classes": ["empty","wP","wN","wB","wR","wQ","wK","bP","bN","bB","bR","bQ","bK"],
  "class_weights": {"empty": 0.12, "wP": 1.0, "...": 0.0},
  "splits": {
    "train": ["20260625-201500", "..."],     // Session-IDs
    "val":   ["..."],
    "test":  ["..."]
  },
  "counts": {"train": 12345, "val": 1800, "test": 1750}
}
```
Stage 5 reads **only** this file + the manifest and filters crops by session membership.

## Augmentation Policy (Definition Here, Application in Stage 5)

The camera is **fixed** — from this follows what is allowed and what is not:

- **Allowed (in training):** brightness/contrast/gamma (most important lever — real
  lighting variation), mild Gaussian blur/sharpen, slight
  translation/scale jitter (±a few percent, catches small homography drift),
  subtle color jitter.
- **Forbidden:** horizontal/vertical flipping and 90°/180° rotation. That would
  distort square color and geometry (a fixed camera never sees a mirrored board)
  and place rare pieces into impossible contexts.
- Val/Test: **no** augmentation except deterministic resize/normalize.

Store the policy as configuration (e.g., `data/manifests/augment.yaml` or in `config.py`),
not hardcoded in the training code.

## `dataset verify`

Consistency checks: every manifest line points to an existing file; every file is
loadable and has the expected `out_size`; all labels are in the class list; no
session is in two splits simultaneously.

## Acceptance Criteria (Definition of Done)

- `stats` outputs a complete 13-class distribution + light/dark coverage and
  warns about gaps.
- `split` produces `split.json` in which **no** session ID appears in more than one split
  (verified by test), and respects `max_empty_ratio`.
- `class_weights` sum plausibly and are smallest for the largest class.
- `dataset verify` fails when a file is missing or a session lies in two splits.
