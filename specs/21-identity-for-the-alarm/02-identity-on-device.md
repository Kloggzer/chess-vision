# Phase 02 — Carry identity from the graph to the observation, on both sides

> **Depends on phase 01.** Do not start before it reports a run that met the bar.

## Why

`OccupancyObservation.label` / `.conf` are already declared and already consumed
(`guess_illegal_move`, `board_matches_identity`, `derive_moves_identity`). Nothing fills them, because
the shipped graph emits 2 logits. This phase carries the 14 through.

## Design (decided — do not redesign)

**The graph.** Export phase 01's run as `[64,3,128,128] → [64,14]`. `evaluate.ONNX_BATCH` stays 64 —
a dynamic batch makes the Android session answer with `[1,2]` and kills the CNN silently; it has
shipped that way three times, and `BundledGraphShapeTest` exists to stop a fourth. That test reads the
class count from the bundled `config.json`, so it follows 2 → 14 by itself. **Verify that, do not
assume it.**

**Python.** Wherever the observation is built from logits, fill `label` and `conf` from the argmax and
its softmax value, and keep `p_occ`/`p_empty`/`p_occluded` derived exactly as today so occupancy
behaviour is bit-identical. Find the construction site with
`grep -rn "OccupancyObservation(" src/chesslab`.

**Kotlin.** `core-cnn`'s classifier already asserts the class list against the asset's `config.json`
(`SquareClassifier`, `requireExpectedClasses`). Extend the observation type the engine consumes so it
carries the same two optional maps, and fill them. **`EXPECTED_CLASSES` is the 14-class list already**
— check before adding anything.

**The threshold.** If phase 00's verdict was `GO WITH A HIGHER THRESHOLD`, add
`alarm_conf_thr` to `config.py TRACK_DEFAULTS` (default: the value phase 00 named) and use it in the
alarm path *only*; `cnn_conf_thr` keeps governing commits. One knob, one meaning. If the verdict was a
plain `GO`, add nothing.

**The safety property, restated because this is the phase that could break it:** identity feeds the
alarm and nothing else. Occupancy remains the accept/reject axis for `_verify_tick`,
`_verify_pair_tick`, `resync_check` and the recovery search. A change that makes any commit path read
`obs.label` is out of scope and must be rejected in review.

## Steps

### 1. `src/chesslab/training/evaluate.py` + the export — commit `feat(export): carry 14 class logits to the device`
### 2. Python observation — commit `feat(tracker): fill label/conf so the alarm can name a move`
### 3. `uv run pytest -m clips` — **21/21**. Then regenerate fixtures and **describe the diff** — commit `chore(parity): regenerate fixtures after identity plumbing`
Fixtures run `cnn_run=None`; an empty diff is the expected result and must be stated.
### 4. Kotlin — commit `feat(cnn): fill label/conf on the device observation`
### 5. `ClipReplayParityTest` **18/18, zero divergence**
### 6. Cost — commit `docs(specs): 21 phase 02 — identity on device, and what it costs`
Measure the observation time on the desktop CPU provider for 2-class vs 14-class at batch 64, and the
node count and file size of both graphs. The device baseline to compare against is **44–70 ms, p50 53**
(SM8650, XNNPACK, 2026-07-28). If the 14-class graph is materially slower, say by how much — the
verify window is counted in observations, so this is latency the user feels.

## Tests (write, run once, targeted)

1. **`guess_illegal_move` returns a move** when the observation carries confident labels that
   contradict the board by exactly one vacated and one received square — the `Bxc3` shape it exists to
   catch. This is the test that would have been impossible to write before this pack.
2. **It still returns `None`** when labels are absent (`obs.label is None`), so an occupancy-only model
   degrades to today's behaviour instead of crashing.
3. **Occupancy is unchanged**: for a fixed logit tensor, `p_occ`/`p_empty`/`occupied()`/`confident()`
   match the 2-class path exactly.
4. Kotlin: mirror 2 and 3.

`uv run pytest -q tests/test_cnn_recovery.py tests/test_move_tracker.py`

**Prove red first**: test 1 against `HEAD~` (where `label` is never filled) must fail.

## Acceptance criteria

- `grep -rn "obs.label" src/chesslab/move_tracker/` hits only the alarm/identity helpers — no commit
  path.
- `BundledGraphShapeTest` passes against the 14-class asset, unmodified except for what it reads from
  `config.json`.
- clips 21/21; fixture diff described; parity 18/18.
- The cost measurement is in STATUS.md with both graphs' node counts.

## Do NOT / Out of scope

- Do not weaken `BundledGraphShapeTest` or make the batch dynamic. Ever.
- Do not wire identity into any commit decision.
- Do not change `cnn_conf_thr`.
- Do not ship the new model into `android/app/src/main/assets/` in this phase — phase 03 decides that,
  after the alarm is proven to fire correctly.
