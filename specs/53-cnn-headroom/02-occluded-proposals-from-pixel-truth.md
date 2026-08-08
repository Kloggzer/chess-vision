# Phase 02 — Occluded proposals from pixel truth

> Owns `src/chesslab/occluded.py` (new) and the proposal artifact
> `data/realgames/<name>/occluded-proposals.jsonl` (schema pinned in entry.md — this phase is
> its authority). Depends on 01. Runs in parallel with 03 (disjoint files).

## Why

The only honest producer for `occluded` (DIRECTION.md, producers 1-3): the model's own reads
are circular, the ledger's `occl=` field is structurally zero on 13-class models, but INSIDE a
confirmed interval the position is known — a cell whose pixels differ grossly from that
interval's clean appearance holds an occluder. Shadows are the named false-positive class:
a shadow darkens but keeps structure; an occluder replaces content. The engine already
separates the two live (HSV gamut + census, `census_thr` 40 prior art in the Blender clips) —
this phase reuses the arithmetic offline, against a stable reference no live frame has: the
interval's clean median.

## Design (decided — do not redesign)

```
chesslab realgames propose-occluded <name> [--hi 0.7] [--lo 0.3]
```

1. **Clean median per interval:** over the QUIET rows of the exported session (phase 01),
   per interval, per cell: median gray patch (the warped cell at detection size — reuse the
   warp helpers `slice` uses; do not re-derive geometry).
2. **Score per dirty row per cell:** structural difference between the dirty cell and its
   interval median — census/sign-pattern mismatch fraction (shadow-invariant) combined with an
   HSV-gamut escape term (skin/foreign-object detector, the resting-hand veto's logic). Exact
   weighting is free; the CALIBRATION is not (step 3). Score normalised to [0,1].
3. **Calibrate against the review PNGs:** take 30 cells the author hand-classifies once from
   `data/realgames/<name>/frames/*.png` (occluder / shadow / clean — the PNGs show the
   rectified board with verdicts). Report the confusion table at `--hi/--lo` in STATUS.md and
   pick thresholds so that **precision of `score > hi` on "occluder" is ≥ 0.9** — the
   bucket-grid UX (phase 03) depends on high-confidence pages being boringly right.
4. **Emit proposals** for every dirty-row cell: `proposed: "occluded"` when score > hi,
   `"keep"` otherwise, always with the raw score and the interval's `fen_label` (entry.md
   schema). `lo` is not used by the producer — it is the UI's Tinder-band boundary; emit it in
   a header line `{"_thresholds": {"hi": 0.7, "lo": 0.3}}` as line 1.

This phase proposes; it NEVER writes corrections.jsonl and never touches session `labels`.

## Steps

### 1. `src/chesslab/occluded.py` (new) — commit `feat(occluded): proposals from pixel truth — the one producer that is not circular`

### 2. Calibration + confusion table — commit `docs(specs): 53-02 — the shadow/occluder boundary, measured`

STATUS.md entry with the 30-cell table and the chosen thresholds.

### 3. Tests — part of commit 1

## Tests (write, run once, targeted)

`uv run pytest tests/test_realgames.py -q` (extend the file per the ownership registry)

- `median_is_per_interval_not_global`: two intervals with different piece on e4 → different
  medians.
- `a_replaced_cell_scores_high_a_darkened_cell_scores_low`: synthetic 3-frame interval, one
  dirty frame with (a) cell overwritten by noise → score > 0.7, (b) cell multiplied by 0.5
  (shadow) → score < 0.3. This is the phase's contract in one test; prove it red first
  against a naive absolute-diff scorer if convenient.
- `proposals_conform_to_the_pinned_schema` (keys, types, header line).

## Acceptance criteria

- `occluded-proposals.jsonl` exists for both confirmed videos; line 1 is the thresholds
  header; every row validates against the entry.md schema (`python -c` one-liner in STATUS).
- The 30-cell confusion table is in STATUS.md with precision(hi) ≥ 0.9 on occluder, or an
  honest note that the pixel channels cannot reach it (a negative result is acceptable and
  gates phase 04 accordingly).
- Targeted tests green; no new ruff findings.

## Do NOT

- Do not write corrections.jsonl (phase 03's human owns labels).
- Do not use any CNN output anywhere in the scoring (circularity is the failure mode this
  producer exists to avoid).
- Do not tune engine constants (`census_thr` etc.) as a side effect — copy values, cite them.
