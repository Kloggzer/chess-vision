# specs/30 — sharper alignment

> **Status:** open. One phase, one agent, one branch.
> **Owner branch:** `spec-30-sharper-alignment`, cut from `spec-24-frame-the-board` (NOT from `main` —
> `main` has neither `src/chesslab/alignment.py` nor `scripts/check_alignment.py`).

## The complaint

`src/chesslab/alignment.py` measures where the board's squares really sit in a rectified frame and
can pull a bad quad back onto the grid. It works: on session `20260731-102458` it separated 534
frames into 98.7 % clean and 7 real outliers, and the auto-fix moved every one of those below
tolerance. The user's verdict after using it is exact and is the whole brief:

> *"das tool taugt okay, aber manuell gehts immernoch besser"*

A human dragging corners in the web editor still lands a better quad than `correct_quad` does. That
is the gap to close. Not "add features" — make the automatic correction as good as the manual one on
the frames where a human currently wins.

## What the module can and cannot do today

Read the module first; it documents its own limits, and they are honest ones. In short:

- `line_positions` collapses the rectified board to two 1-D intensity profiles (`g.mean(axis=…)`)
  and finds the 7 interior grooves per axis as the **centroid of the dark band**, not the peak of a
  gradient. The centroid change alone halved the noise floor (median 2.56 → 1.32 px, p90 3.70 →
  1.74).
- `square_offsets` reassembles those lines into 64 cells and reports, per square, the largest
  displacement of any of its four edges from nominal.
- `correct_quad` fits a homography measured-lattice → nominal-lattice over the ≤ 81 intersections,
  chains it onto the corner homography, and reads new corners back out in frame pixels.
- `improve_quad` returns `None` rather than a worse quad.

**The known structural weakness, stated in the module's own docstring:** collapsing along an axis
measures a line's POSITION but averages away its TILT. So a rotation or shear of the grid inside the
warp is invisible to the measurement and therefore uncorrectable by the fit. That is a prime suspect
for "manual still wins" and the first thing to test — but test it, do not assume it.

## The physical tolerance, already derived — do not re-derive it

The reference board: grooves 2 mm wide, playing field 29.3 cm across including the outer grooves,
warped to `board_size` 800 → 1 px = 0.364 mm → a groove is 5.5 px → a crop tolerates
`pad_side (5 px) + half a groove (2.7 px)` = **7.7 px**. The user independently eyeballed 9 px. Use
7.7 px as the flag threshold; it is not the thing under investigation.

## Scope

**In scope:** `src/chesslab/alignment.py` and `scripts/check_alignment.py`. New helper modules are
fine if they earn their place.

**Out of scope — do not touch:**
- `src/chesslab/web/**` — the review UI was just restructured by another agent and merged; it calls
  `worst_offset`, `improve_quad`, `frame_offsets`. **Keep those four public names and their
  signatures.** Improve what happens inside them.
- `src/chesslab/calibration.py`, `camera.py`, `lens.py` — you may READ and CALL anything there
  (`warp_from_corners`, `compute_homography`, the lens calibration in `data/lens/calib.npz`), but
  changing board or lens calibration is a different problem with a different blast radius.
- Anything under `data/` is gitignored. **Never commit it, never delete a session.** Writing a
  montage into the scratchpad is fine.

## The bar

A change lands only if it is **measured on the real session**, `20260731-102458` (534 frames, ~100
px per square, mixed lighting, rotating board — the session that motivated the module).

Baseline as of this brief, `scripts/check_alignment.py --session 20260731-102458 --max-off 7.7`:
worst-square-offset per frame **median 3.8 px, p90 4.6, max 5.4** on a 9-frame sample; the full-scan
numbers and the 7 outliers are in the session log's `corners_source` field (`auto-corrected` marks a
frame the current fix already touched, and `log.jsonl.bak.*` holds the pre-fix quads, so a
before/after on exactly those frames is available without re-running anything).

Two numbers decide it:

1. **The noise floor** — the median offset over frames that are already fine. Lower is better and it
   is the honest measure of the MEASUREMENT, because those frames are not actually misaligned; what
   the number shows is the method's own jitter.
2. **The residual after correction** on frames that start out bad. Lower is better and it is the
   measure of the FIT.

A method that improves 1 and worsens 2, or vice versa, has not won. Report both, always, as a table
against the current implementation re-measured **in the same run** — path-A-style numbers move with
the calibration profile, so a row carried over from this brief is not evidence.

**And the thing the user actually asked for:** take frames where a human's manual quad beat the
automatic one, and show that the new fit reaches or passes the manual result. `corners_prev` in the
session log records what a quad was replaced with, so manually corrected frames are identifiable.

## Directions worth trying — you are free to research and free to reject these

You may use WebSearch/WebFetch. Checkerboard and fiducial geometry is a well-covered literature and
this project has no pride of authorship in its own method.

- **Measure the 81 intersections directly** instead of two 1-D profiles. Saddle-point / X-corner
  detectors (`cv2.findChessboardCornersSB`'s underlying idea, Geiger et al.'s corner response,
  or a local quadratic fit to a saddle) give a 2-D position per intersection and therefore see
  rotation and shear, which the current method cannot. This is the most likely single win.
- **Iterate.** `correct_quad` runs once. Re-measuring in the corrected warp and re-fitting is nearly
  free and may converge somewhere the one-shot fit does not reach.
- **Robustify the fit.** `cv2.findHomography(..., 0)` is plain least squares over every intersection
  that was measurable, so one groove hidden under a piece — and pieces sit ON grooves — drags the
  whole fit. RANSAC or a Huber loss is a small change with a plausible payoff.
- **Weight by confidence.** `_groove_centre` already knows how deep and how clean each band was; it
  currently throws that away. A weighted fit costs nothing.
- **Undistort first.** The lens calibration is applied in `camera.open_capture`, so frames that came
  in through the video importer may still carry barrel distortion; a straight line in the world is
  then not straight in the frame and the whole model is slightly wrong. Check whether this session's
  frames are undistorted before assuming either way.
- **Model the residual.** Frames 230 and 380 showed a monotone ramp across the board, which looks
  like a constant marker asymmetry rather than per-frame noise. If it is constant, it belongs in the
  profile once, not in a per-frame fix.

## Deliverable

1. The improved module, with the four public names unchanged and the existing tests still green.
2. `specs/30-sharper-alignment/STATUS.md` with the before/after table, the manual-comparison
   result, and every direction you tried — **including the ones that lost**. A negative result
   measured on this session is worth as much here as a positive one; this repo keeps them.
3. A visual probe: a before/after montage at native rectified resolution with the nominal grid drawn
   on, holding the SAME square across both halves. (A tile that picks its own worst square per side
   compares two different squares and looks like a win when it is not — that bug has already been
   made once.) The user iterates visually and expects a probe with any geometry change.

## Gates

```
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe -m ruff check src scripts tests
.venv/Scripts/python.exe -m vulture
```

`uv run` fails while the web server is running; use `.venv/Scripts/python.exe -m …`. All three must
be green before you report done. Commit on your branch; do not merge.
