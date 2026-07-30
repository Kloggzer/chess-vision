# STATUS — 29 widen the output band

Branch: `spec-29-00-thirteen-classes`, cut from the pack commit on `spec-24-frame-the-board`,
**not from `main`**. Agent works in its own `git worktree`.

## Phases

| Phase | Concern | State | Notes |
|---|---|---|---|
| 00 | 13 classes instead of 2, one variable | todo | PC only — no device needed. Step 1 (scoring) gates the training. |

## Why this pack exists

Every other lever traded quality for speed and lost. This one costs **no measurable compute**: the
classifier is `1280 → 2`; `1280 → 13` is 16 640 parameters against 2 560, at 1×1 spatial. Against
6.7 MMAC per crop that is rounding noise — and specs/28 has now measured the cost function exactly,
`session ms = 26.9 + 2.731 × MMAC/crop`, so a head-width change is provably free.

It buys two things. Occupancy quality may improve, because the model must learn *what* stands there
rather than only *that* something does. And an entire verify rung wakes up: specs/27 measured
`boardMatchesIdentityFull` at **zero evaluations across 18 clips**, unreachable because
`classesHaveIdentity` is false for every bundled 2-class model. The machinery is written, tested and
idle.

## Occlusion is excluded, and the corpus is why

`data/manifests/squares.jsonl`, all rows: `empty 42 848 · wP 3 055 · bP 2 982 · bR 807 · wR 716 ·
wB 694 · bB 670 · bN 561 · wN 511 · wK 441 · bK 441 · bQ 378 · wQ 360`. **Zero `occluded`** — capture
only happens when the board is clear. A 14-class run would carry a class with no training examples,
whose logit can still win an argmax on unusual input, and unusual input under a hand is exactly the
case that matters. Hence 13, not 14.

## The bar

Control `occ-v6-f5nd` and candidate measured **in the same run**, 80 px, `occ-real6` test, path A.
Today's reference for the control: **1 phantom / 12 misses / margin 0.316 / 0.512**. Phantoms are
the veto, then margin, then misses (below ~8 is noise). A model that reads identity beautifully and
adds a phantom is rejected.

## Results

| Run | Classes | Phantoms | Misses | Anchor · Phone | Margin p99.9 / max | `classesHaveIdentity` |
|---|---|---|---|---|---|---|
| `occ-v6-f5nd` | 2 | — | — | — | — | false |
| `occ-v8p-f5nd` | 13 | — | — | — | — | — |

## Established — do not re-derive

- **Normalisation is closed from both sides** (specs/25; specs/26 phase 04). Use GroupNorm.
- **The graph is not the cost**: coalesced is 1.7x slower, NNAPI 4.9x, QNN not in the binary.
- **80 px is the resolution optimum** across `[48, 64, 80, 96]`.
- **Capacity has a price**: `session ms = 26.9 + 2.731 × MMAC/crop` (R² 0.99972, specs/28). The
  fixed 26.9 ms is 64 % of the shipped observation but it is a constant, not a ceiling; the
  inflection is at 9.8 MMAC/crop and the shipped model sits at 6.7. **Widening the backbone is not
  free — widening the head is.**
- **`val_acc` does not predict the veto metric** — it ranked runs in reverse in specs/25.
- **`--patience 25`** on every run: `occ_board_acc` is floored below ~`val_acc` 0.98.
- Piece **type** is historically the hard part (N/B/R drove the synthetic pipeline). Mediocre
  identity accuracy is expected and is **not** what this phase measures.

## Session log

| Date | Phase | What happened |
|---|---|---|
| 2026-07-31 | — | Pack written. specs/28 closed with STOP: latency is affine in MACs, so the backbone cannot grow — but the output band can. |
