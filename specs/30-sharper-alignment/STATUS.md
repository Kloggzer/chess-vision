# specs/30 — sharper alignment: what shipped, and what lost

> **Status:** done. Branch `spec-30-sharper-alignment`, cut from `spec-24-frame-the-board`, not merged.
> Every number below is from session `20260731-102458`, board_size 800 (1 cell = 100 px),
> flag threshold 7.7 px, measured on **2026-07-31 in the same runs as the reference row**.

## What the gap turned out to be

The brief's suspect was right and its remedy was wrong.

Right: the 1-D collapse averages a line's TILT away, and the tilt is what the human was fixing.
Decomposing what the human's hand did to the 14 quads they corrected shows the same signature on
every one of them — a rotation between −0.09° and −0.36°, an anisotropy of +0.08° to +0.49° (the
same sign on all 14), and a scale of 0.989 to 1.006 — and a measurement built from two collapsed
profiles cannot see the first two at all.

Wrong: the fix is **not** to detect the 81 intersections in 2-D. A saddle-point detector loses to
the collapsed profile on precision by more than 2x, because collapsing 800 rows is an enormous
amount of averaging and a 45 px window is not. What works is to keep the collapse and just do it
**band by band**: 4 samples per line instead of 1, at sqrt(4) worse noise each, which the fit
averages straight back out — and the tilt survives.

Three other things mattered as much as the measurement:

- **`correct_quad` used to feed 32 assumed points into its own fit.** The 9x9 lattice includes the
  playing-field edges, which the warp pins at 0 and `board_size` by construction. Handing 32 of
  those to `findHomography` as if they had been measured anchors the fit to the quad it is supposed
  to be correcting. Dropping them and changing nothing else takes the distance to the human from
  8.68 px to 7.26 px.
- **One pass is not enough.** A badly placed grid puts every groove near the edge of its search
  window, where the measurement is worst. Iterating three times removes the dependence on how bad
  the input was: the new fit lands in the same place from a 9 px error as from none (3.76 vs 3.29),
  where the old one was start-dependent (7.54 vs 2.37).
- **Affine, not homography.** The quad is already nearly right, so the leftover error has no real
  perspective component — but a homography fit spends its two perspective parameters on noise
  anyway, and it cost 1.5 px.

## The table

### 1. Against the human — the bar the brief set

The 14 frames with `corners_source: "hand"`, started from their recorded `corners_prev`. Distance
from the produced quad to the human's quad, in rectified px over the 800x800 board.

| | max, median | max, p90 | rms, median |
| --- | --- | --- | --- |
| the quad as recorded (no correction) | 12.83 | 16.95 | 5.30 |
| `correct_quad` as it was | 8.68 | 14.64 | 3.20 |
| **`correct_quad` now** | **5.14** | **7.32** | **2.87** |

Not all of the remaining 5.1 px is method error: what the measurement reads on quads a human placed
scatters by 1.0–1.7 px sd from frame to frame, which is the human's own hand on a corner drag.

### 2. Perturb and recover — exact ground truth

Truth is the hand quad; a known rectified-space transform is applied and the fit must undo it.
14 / 56 / 56 trials.

| start error | as recorded | old | new |
| --- | --- | --- | --- |
| none (0.00 px) | 0.00 | 2.37 | 3.29 |
| small (2.28 px) | 2.28 | 2.85 | 3.27 |
| large (9.37 px) | 9.37 | 7.54 | **3.76** |

Read the last two rows together: the old fit is better when there is nothing to fix and much worse
when there is. The new one is flat, which is what a fit is supposed to be.

### 3. The whole session, from the pre-fix marker quads

267 frames (every 2nd), quads from `log.jsonl.bak.20260731-110326`.

| | old | new |
| --- | --- | --- |
| noise floor (already-fine frames): median / p90 / max | 4.48 / 5.39 / 6.72 | 5.27 / 5.96 / **6.14** |
| frames flagged over 7.7 px | 39 | 42 |
| after correction: median / p90 | 4.72 / 5.83 | **3.59 / 3.99** |
| still over 7.7 px after the fix | 3 | **0** |
| refused (no fit) | 0 | 0 |

**The noise floor went UP, and that is the honest direction.** Split into its two causes over 73
already-fine frames: old estimator 4.45, new notch estimator without the tilt term 4.49 (i.e. the
estimator change is worth nothing, see the losers), new estimator **with** the tilt term 5.27. The
tilt measured on exactly those frames is 2.04 / 2.08 mrad, which is 0.82 px at the board edge — the
entire increase. The old number was not lower because the board was straighter; it was lower
because the metric could not see the tilt.

That the tilt is real and not slope noise: estimating it twice per frame from two disjoint halves
of the bands gives a correlation of **+0.912**, a real-tilt sd of 3.88 mrad (1.55 px at the edge)
and an estimator noise sd of 0.86 mrad (0.34 px).

### 4. What each metric can actually see

One known error at a time, on 6 hand frames, median reading. `true worst` is the worst square-edge
displacement the transform really produces.

| perturbation | true worst | OLD reads | NEW reads |
| --- | --- | --- | --- |
| none | 0.00 | 3.95 | 4.67 |
| translate 6 px | 6.00 | 6.41 | 7.87 |
| scale 1 % | 4.00 | 6.63 | 7.11 |
| rotate 0.6° | 3.69 | 5.03 | 7.45 |
| **shear 0.6°** | **3.67** | **4.46** | **8.89** |

The old metric moved 0.51 px for a 3.67 px shear — less than its own noise. That is the hole the
module was written to close, and it was open in the module's own metric.

### 5. Cost

`square_offsets` 2.0 → 4.3 ms per warped board; `improve_quad` 9.5 → 28.2 ms per frame. Both sit
under the 35 ms it takes to JPEG-decode one 4K frame, which is what a UI scan actually spends its
time on.

## The visual probe

`scripts/check_alignment.py --before-after out.png` — the worst flagged frames, before and after,
at native rectified resolution with the nominal grid drawn on, **holding the same square on both
sides**. Rendered from the pre-fix quads:

    C:\Users\mariu\AppData\Local\Temp\claude\C--Users-mariu-project-chess-vision\45d7f663-51d5-4134-b598-f33c3c47d202\scratchpad\a30\spec30-probe.png

Frames 258, 186, 183, 189, 192: g8 goes 20.4 → 3.0, 19.7 → 2.8, 19.6 → 3.3, 18.6 → 2.3,
17.7 → 1.8 px.

## What lost

Every one of these was measured on this session, against the same referees.

- **Detecting the 81 intersections in 2-D (the brief's most likely single win).** A quadratic
  saddle fit finds 27–38 of 49 interior crossings and its lattice residual rms is 2.32 px against
  the collapsed profile's 1.10. Against the human it reaches 7.89 px where the band lattice reaches
  5.14, and *adding* it to the band lattice makes things worse (5.73). `cv2.cornerSubPix` seeded at
  the nominal positions lands between the two (1.80 px residual at a 15 px window, 2.38 at 11).
  The reason is not subtle: a whole-board collapse averages 800 rows, a corner window averages 45x45
  pixels, and this board's grooves are narrow, low-contrast and often under a piece.
- **RANSAC.** 7.28 px against Huber's 5.35 on perturb-and-recover. The bad samples here are not
  sparse outliers, they are a systematic minority (grooves under pieces), and a hard inlier/outlier
  cut throws away good data with them.
- **Weighting by the notch depth.** 5.37 against 5.35 — nothing. `_groove_centre` was throwing away
  a confidence signal that turns out not to carry any.
- **Symmetrising the notch estimator** (averaging it with itself on the reversed window, which
  cancels any left/right asymmetry exactly). Bit-identical results — the half-depth segment
  centroid that ships is already symmetric, so there was no asymmetry to cancel.
- **Every other notch estimator.** The shipped one (linear baseline, centroid of the connected run
  above half depth) against the old p90-baseline centroid, a plain linear-baseline centroid, a
  3-point parabola and a half-depth parabola: 5.13 / 5.28 / 5.28 / 5.13 / 5.23 against the human,
  and 4.49 vs 4.45 on the noise floor. All inside the noise. **The estimator was never the problem.**
- **The number of bands.** 2 / 4 / 8 give 5.26 / 5.13 / 5.23. Flat, as the noise algebra predicts —
  splitting into B bands costs sqrt(B) per sample and buys B samples.
- **A similarity fit instead of affine.** Best of all in the small-error regime (2.66) and worst
  from the real recorded quads (7.37): the error it refuses to model is really there.
- **Modelling the board's own line irregularity.** It exists and it is stable — estimated from two
  disjoint halves of the session, the per-line offsets agree to 0.17 px — but after removing what a
  homography can absorb anyway it is only ±0.75 px peak to peak, and putting it into the fit changed
  nothing. Worth knowing: the board's grooves really are not at exact eighths, and the effect is
  far too small to matter.
- **Removing the leftover bias as a constant.** The residual after correction is 97 % systematic
  per frame (4.07 px systematic against 0.28 px random over 5 draws), which looked like a constant
  worth subtracting. It is not constant across frames: subtracting the leave-one-out mean over the
  14 hand frames made it worse (5.47 against 5.13).
- **Undistorting first.** `session.yaml` says `undistorted: true` while
  `scripts/ingest_video_session.py` says it stores frames raw, so it was worth testing rather than
  reading. Undistorting the frame and its quad with `data/lens/calib.npz` takes the lattice residual
  from 1.48 px to 4.24 px — these frames are already corrected, and the flag is right.
- **Blur before measuring.** 5.25 against 5.13. The notch is 3–5 px wide; blurring it is throwing
  away the signal.

## Notes for whoever comes next

- The remaining 5.1 px to the human is **bias, not noise** — the fit converges to the same answer
  to within 0.28 px, it just is not quite the human's answer. Chasing it with a better estimator is
  proven not to work (see the losers). What has not been tried: giving the fit the FEN, so grooves
  under a piece can be excluded instead of down-weighted. `improve_quad` does not get the position
  today.
- `square_offsets` now reports a tilt-aware number, so **offsets recorded before this branch are
  not comparable to offsets recorded after it**. Frames flagged went 39 → 42 on the same 267 frames
  for that reason alone.
- The four names the web UI calls — `worst_offset`, `frame_offsets`, `square_offsets`,
  `improve_quad` — are unchanged in signature and semantics. `board_lattice` and `line_geometry`
  are new; `line_positions` still returns exactly what it did.

## Is the METRIC accurate? (added after the merge, on the user's challenge)

The visual said the new quads were better. That is worth nothing unless the number agrees with the
eye, so the metric was calibrated against analytic truth: a board rendered rectified — truth exactly
zero before any perturbation, so every number below is absolute, not a difference — then displaced
by a known homography. The truth column mirrors `square_offsets`' own definition (largest
displacement of any square edge, evaluated where that edge passes the square), so this is a
calibration and not a restatement.

Bare board, and the same board cluttered with dark discs sitting on the grooves the way pieces do:

| displacement | truth | old reports | err | new reports | err | | old (pieces) | err | new (pieces) | err |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
| none | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | | 0.50 | +0.50 | 0.06 | +0.06 |
| shift 2 px | 2.00 | 2.00 | 0.00 | 2.00 | 0.00 | | 2.40 | +0.40 | 2.03 | +0.03 |
| shift 10 px | 10.00 | 10.00 | 0.00 | 10.00 | −0.00 | | 10.64 | +0.64 | 10.10 | +0.10 |
| rotation 0.10° | 0.61 | **0.00** | −0.61 | 0.61 | 0.00 | | 0.52 | −0.09 | 0.66 | +0.05 |
| rotation 0.50° | 3.07 | **0.01** | −3.06 | 3.06 | −0.01 | | 0.58 | −2.49 | 3.23 | +0.16 |
| rotation 1.00° | 6.17 | 0.52 | −5.65 | 6.16 | −0.01 | | **21.18** | +15.01 | 7.08 | +0.91 |
| shear 0.25° | 1.53 | **0.00** | −1.52 | 1.51 | −0.01 | | 0.49 | −1.03 | 1.55 | +0.02 |
| shear 0.50° | 3.05 | **0.01** | −3.05 | 3.04 | −0.02 | | 0.50 | −2.56 | 3.14 | +0.09 |
| **mean \|error\|** | | | **1.45** | | **0.05** | | | **2.24** | | **0.18** |

**The old metric was exact on a translation and silent on everything else.** Not imprecise —
silent: 0.01 px for a 3.05 px shear. That is why it certified frames the eye can see are wrong, and
it is the reason the old auto-fix looked like it worked. On a cluttered board at 1° it does not
merely under-report, it goes wild in the other direction (21 px for a 6 px truth), so its number was
not usable in either direction.

Locked in `tests/test_alignment.py::test_the_reported_number_is_the_true_number`. Bar: 0.5 px on the
bare board, 1.0 px with pieces (a piece on a groove genuinely drags its centroid).

### The one blind spot, in both metrics

A uniform SCALE error is under-reported by 25 %: truth 2.00, reported 1.50. `line_positions` pins
index 0 and 8 at 0 and `board_size` because the warp puts them there by construction, and a scale
error is largest at exactly those outer edges. The metric sees only what is left at the innermost
measurable lines. Structural, not a bug, and recorded as
`test_a_uniform_scale_is_under_reported_and_that_is_structural` so it is not rediscovered as one.

### What that means for the session's history

Scored on the quads the old system left behind — 302 of them its own corrections, the rest declared
inside tolerance — the two metrics agree only loosely (r = +0.71), and the old one's **maximum over
178 frames is 5.59 px**, i.e. it could not report a failure on this session at all. Ten of those
frames are over tolerance under the new metric and every one of them is a frame the old fix had
already "corrected".

## The corpus, re-aligned (2026-07-31, after the merge)

`scripts/survey_alignment.py` measures every session through its own profile. Before the re-fit no
session sat near zero — the floor was 3.2 px and the two largest sessions of 2026-07-21, which
dominate the training corpus, were the worst at 5.4 and 6.5 px median, 12.2 and 14.8 px max. After
re-fitting all 19 sessions (`check_alignment.py --sample 0 --max-off 0.5 --fix`, 1 336 frames,
1 refused): every session 2.0–3.3 px median, corpus max 4.3 px, nothing over tolerance.

The signed per-line residuals say why a per-frame fit was the right instrument and a single global
constant would not have done: two sessions of the same setup agree to 0.1 px (so the error is
systematic, not noise) but different setups disagree in sign, and the between-session spread
(1.1–2.5 % of a cell) is as large as the corpus mean. There is one corpus-wide component — the y
residual runs +1.2 +3.1 +1.8 −1.6 −0.7 −1.1 0.0 % of a cell on every rig, phone included — which is
a candidate for a profile-level fix and is NOT what the per-frame fit removes.

**What it bought, on the metric that decides.** Champion `occ-v6-f5nd`, path A, 80 px, `occ-real6`
test, corner quads the only changed variable:

| geometry | phantoms | misses @ 0 phantoms | margin empty p99.9 / max |
|---|---:|---:|---|
| as recorded | 1 | 13 | 0.316 / 0.512 |
| re-aligned | **0** | **3** | **0.050 / 0.093** |

Restoring the backups reproduced `0.316 / 0.512` exactly, so this is the geometry and not drift.
The margin had not moved through specs/25, 26, 28 or 29.
