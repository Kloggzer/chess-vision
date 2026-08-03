# 00 — A ruler you can trust

**Nothing else in this pack may be attempted first.** Every number in specs/40 that pointed the
wrong way was produced by a metric that could not fail: `quad_spread` compares each frame's quad
against the median of the same quads, so a consistently wrong quad scores p90 0.93 px and 99.9 %
"detected". The pack spent a day inside that number.

## What to build

An **absolute** alignment measurement, calibrated against truth, that answers one question about
one frame: *how far, in rectified pixels, is the real square edge from where this quad says it is?*

`tests/test_alignment.py` already calibrates the band-wise `square_offsets` against analytic truth
(0.05 px mean error bare, 0.18 with pieces) — that harness is the model. Extend it, do not replace
it.

Two properties it must have that the current one does not:

1. **No pinned constants.** `line_positions` fixes index 0 and 8 at 0 and `board_size`. Those are
   values the warp puts there by construction, and their presence is why a uniform SCALE error
   reads ~25 % short (`CLAUDE.md`). A metric blind to the failure mode being tested is not a gate.
2. **A verdict, not a number.** It must say pass/fail against a stated threshold, and every path
   that produces a quad must go through it: `raw_corners`, `board_corners_for_frame`,
   `calibration.ensure_profile`, Android's `LiveAlign`.

## The threshold

Argue it from `docs/data-pipeline.md` §12, do not invent it. The corpus sat at 3.2-6.5 px median
square-edge offset and re-fitting it moved the champion's phantom margin by 5.5x — 1 phantom /
margin 0.316 / 0.512 to 0 / 0.050 / 0.093 — with the quads as the only changed variable. So the
band above ~3 px is measured as damaging. Pick the gate under it and say why.

## Acceptance

- The gate reports a truth-calibrated error on synthetic frames with a KNOWN quad, including a
  pure scale error, a pure shear, and a pure rotation. The old metric reported 0.01 px for a
  3.05 px shear; a gate that repeats that is not done.
- Run against `data/testclip-raw/VID_20260802_222741.mp4` with the 3-marker quad it must FAIL, and
  say by how much. Measured 2026-08-03 with `worst_offset`: 26.9-32.7 px.
- No path in either tracker can produce a quad that has not been through it.
