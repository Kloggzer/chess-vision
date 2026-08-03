# 41 — Status

| Phase | State | Note |
|---|---|---|
| 00 — a ruler you can trust | `done` | `alignment.alignment_of` / `alignmentOf`; unpinned, truth-calibrated, absolute |
| 01 — find the grid | `done` | projective refit on the board's own 18 lines; the replay commits 22 plies |
| 02 — both trackers | `done` | Python live warp at Android parity; `board_corners_from_lines` DELETED |

**The headline.** `data/testclip-raw/VID_20260802_222741.mp4` produced `moves: []`. It now produces
a reviewable move list of 22 plies — 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nxe4 4.f3 Nf6 5.d4 d6 6.Ng4 d5
7.Qe2+ Qe7 8.Bg5 h6 9.Bh4 g5 10.h3 Nc6 11.Nc3 Nxd4 — with no alarm latched, 95 review frames, and
`confirmed: false`. Worst square offset over the whole video went from **median 29.61 px** to
**median 2.00 px** on a 100 px cell. It took three separate fixes, only one of which was geometry.

---

## The instrument, before anything else (phase 00)

Everything below is measured with the NEW instrument, which reads **higher** than the old one on
the same frames because it no longer assumes the part of the board where the error is largest.
Numbers from before 2026-08-03 are not comparable to these.

| Change | Why |
|---|---|
| `grid_lines` measures all **9** lines per axis in a padded warp (`warp_for_grid`, `GRID_PAD_CELLS` 0.25) | `line_positions` pinned index 0 and 8 at 0 and `board_size` — values the warp puts there by construction. `tests/test_alignment.py` asserted the resulting 25 % under-report as *structural*; it now asserts the true size. |
| A line that cannot be found is **unread**, and `unread > 0` FAILS the verdict | The pinned version certified 302 frames whose grid the eye can see is wrong |
| `alignment_of` returns a verdict, not a number: worst offset ≤ **4 % of a cell** AND all 18 lines read | Argued from `docs/data-pipeline.md` §12 — damaging band starts at 3.2 %, repaired sessions reach 3.3 % max 4.3 %, so the gate sits at the seam. A fraction, so it means the same at cell 100 and cell 200. |
| `_notch_centre` refuses a dark run still going at both ends of the centroid window | A 3D piece leaning over the groove behind it is wide and dark, and the old estimator accepted it as a groove. On frame 900, where ranks 7 and 8 are a solid row of black pieces, every band of the line between them reported the pieces: the fitted line came out tilted by 36 mrad and the metric FAILED a quad that was in fact correct, at 16.3 px. Reporting the line as unread is the honest answer. |
| The slope is pooled per axis as `a + b·k` | Nine independent 8-sample regressions invent tilt; two parameters over ~70 samples do not. Linear in `k` and not one constant, because a residual homography fans a family of parallel lines into a pencil — a single constant would leave the projective component of the error unmeasurable, and that is the whole component a three-marker quad's error consists of. |

**Truth calibration** (`tests/test_alignment.py`, `AlignmentTruthTest.kt`): reported vs analytic
worst offset within **0.5 px** on a bare board and **1.0 px** with pieces on the grooves, over
shift, rotation, shear, **scale** and **perspective**. The last two are new; scale used to be
impossible to test because the metric could not see it.

### The old metric's blind spots, closed and measured

| Displacement | Old (pinned) | New | Truth |
|---|---|---|---|
| uniform scale 1.005 | 0.75 × truth, asserted as correct | within 0.5 px of truth | 1.99 px |
| pure perspective | untested | within 0.5 px of truth | — |
| shear 0.7° | visible (band-wise fix, 2026-07-31) | visible | — |

### What the honest metric does to numbers already on record

Eight already-realigned real sessions, worst square offset per frame, **median (max)**:

| | as recorded | after `correct_quad` |
|---|---|---|
| pinned metric (what `docs/data-pipeline.md` §12 records) | 2.0 – 3.3 | — |
| **unpinned metric** | **3.0 (3.2) – 5.8 (9.3)** | **2.0 (2.2) – 3.3 (4.9)** |

The corpus is not worse than it was; the ruler is longer. Every session still improves under the
new fit, none regresses.

---

## Phase 01 — the grid, on this footage

### The one change that mattered: the fit is PROJECTIVE

`resolve_board_corners` degrades to `cv2.getAffineTransform` at three markers — a parallelogram
standing in for a perspective view of a plane — so the residual **is** projective and no affine
correction can remove it. `_fit_affine`'s docstring justified the affine choice with "the quad is
already nearly right"; true of a four-marker quad, false of a three-marker one.

Six frames of `VID_20260802_222741.mp4`, worst square offset in rectified px (cell = 100):

| | f0 | f900 | f1800 | f3600 | f5400 | f7200 |
|---|---|---|---|---|---|---|
| input, 3-marker affine quad | 24.13 | 24.00 | 23.75 | 37.09 | 37.21 | 28.15 |
| `alignment.correct_quad`, **affine** (before) | 12.06 | 6.76 | 17.82 | 12.44 | 8.60 | 12.36 |
| **projective, 2D lattice, unpinned** | **1.89** | **2.10** | **2.04** | **1.87** | **1.86** | **1.91** |

All six read 18/18 lines and PASS. The input row is what the alignment gate says about the
three-marker quad itself — phase 00's acceptance was that it must FAIL and say by how much, and it
fails on every frame by 24-37 px against a 4 px limit.

### The whole video, sampled every 10th frame (958 of 9576)

| | median | p90 | max |
|---|---|---|---|
| worst square offset, ArUco alone | **29.61** | 36.34 | 38.35 |
| worst square offset, after the grid fit | **2.00** | 2.43 | 5.31 |

- Markers decoded per sampled frame: **3 in 940, 2 in 17, 1 in 1**. Never four.
- **923 of 958 pass the absolute gate (96.3 %).**
- The 35 failures: **34 are a hand over the board**, 1 sees a single marker. Rendered in
  `data/realgames/game-2026-08-02/probes/probe_all_failures.png` — every tile is an arm.
  Their worst offsets are still 1.6–5.3 px; what fails is `unread`, i.e. the honest refusal.
- Per-frame max corner distance to the median quad, in IMAGE px: median 0.65, p90 1.22, max 4.67.
  One static quad does stand for this footage — once it is the right one.
- Per-corner shift, median 3-marker quad → median measured quad, in IMAGE px:
  a8 4.6 · h8 4.0 · **h1 68.9** · a1 8.2. `h1` is id 2, the marker that never decodes — the affine
  reconstruction puts it 69 px from where the board's own grid says it is, and the other three
  corners (which the markers DO see) move by less than 9.

### Cost

`correct_quad` is **~70–85 ms per frame** at `board_size` 800 (4 iterations, 8 bands, 18 lines) on
the dev machine. Too slow for per-frame on the phone, which is why both trackers measure it **once
per pose** and re-apply the rectified-space correction for free (four points through a 3×3). The
geometry scan in `label_real_game` samples every 10th frame for the same reason
(`--geometry-every`); the output is one static quad and a thousand samples fix its median far below
the measurement noise.

---

## Approaches measured and REJECTED

⚠ The CLAHE and affine-lattice rows were measured during exploration, with the OLD pinned metric.
They rank the variants against each other correctly — same instrument on both sides of each
comparison — but their absolute values are not comparable to the tables above.

| Approach | Result | Verdict |
|---|---|---|
| **`cv2.findChessboardCornersSB`** (Duda & Frese, BMVC 2018) — never tried in this project | **Zero of 30 configurations found the 7×7 interior lattice**: {raw frame, rectified warp} × {σ 0, 0.8, 1.5, 3.0, 5.0 blur} × {NORMALIZE+EXHAUSTIVE+ACCURACY, NORMALIZE only, no flags}. With `CALIB_CB_LARGER` it reaches a 3×3 or 4×4 sub-grid on the raw frame at 1.2–1.6 s/frame, and 7×3 on the piece-free middle strip. | **Rejected.** The literature predicted both failure modes: a hard valley wider than its ±4 px box kernel collapses the response, and its occlusion cliff is at a blob ≈ 0.8 × cell — real chess pieces sit exactly there. |
| **CLAHE before the line search** | Within measurement noise, slightly worse: 3.04 / 2.22 / 1.93 / 2.37 / 2.67 / 2.32 px against 3.12 / 2.21 / 1.80 / 2.24 / 2.46 / 2.25 without | **Rejected on measurement.** `_notch_centre` already removes a *local* baseline over a third of a cell, so the 6× illumination gradient never reaches it. The gradient is real (per-square mean luma 25 → 168 in one frame) and simply is not the problem. |
| **Affine fit over 2D lattice intersections** (i.e. only the lattice fixed, not the fit) | 22.60 / 21.19 / 8.31 / 19.75 / 13.11 / 21.14 px — worse than the affine fit over 1D samples | **Rejected.** Confirms the DOF, not the correspondences, was the limit. |
| **Per-line slope regression** (9 independent 8-sample fits) | Frame 900: 36 mrad of invented tilt on the rank-7/8 line, 16.3 px at the board edge, on a quad that was in fact correct | **Rejected** for the pooled `a + b·k` model. |
| **Mean band collapse** vs median | Within 0.1 px on clean frames; median keeps a line or two on cluttered ones | Median kept, but the win is small — the BANDS and the notch-width test do the work. |
| `board_corners_from_lines` (the existing markerless detector) | See phase 02 | **Deleted.** |
| Direct 7×7 lattice refit over `line_positions` (tried 2026-08-03, before this pack) | 11.1–18.0 px, and 14.1–31.7 px including the pinned outer lines | Already recorded as a dead end; the fix was 2D correspondences + a projective fit, not a better 1D fit. |

**Literature consulted** (full notes in the commit trail): Duda & Frese BMVC 2018 (the SB detector);
chesscog (Wölflein & Arandjelović, *J. Imaging* 2021) — its "rectify first, then recover the missing
lines in the rectified frame" is exactly the architecture used here, and its RANSAC-over-homography
lattice fit is what `_fit_projective` does deterministically; ChESS (Bennett & Lasenby 2014);
ROCHADE; OCPAD (graph matching for partially occluded boards — no public implementation);
libcbdetect / PyCBD; LSD (present in cv2 4.13 main, restored after relicensing); ELSED; Steger's
unbiased sub-pixel line extraction; Frangi/Sato/Meijering valley filters (scikit-image, **not
installed**); phase congruency / phase symmetry (`phasepack`, not installed); ChessReD2K (2 078 real
smartphone images with hand-annotated corners — the obvious external benchmark, not used here).
The environment has `opencv-python`, **not** contrib: no `ximgproc`, no `createFastLineDetector`,
no `createStructuredEdgeDetection`.

**Why the groove-centroid approach was kept over all of them.** It is a *valley* detector with a
*local* baseline, which is the physically correct model (the lines are grooves, not step edges — a
Canny would return two edges per line, ~4 px apart, and then need de-duplication) and is
structurally immune to a global illumination gradient for the same reason SB is. It already
located 9/9 and 8/9 lines before this pack; what it lacked was 2D correspondences and a projective
fit.

---

## Two things that were NOT geometry, found because the geometry stopped hiding them

The replay still committed **0 plies** after the geometry was correct. Both causes were measured
before anything was changed, and **no tracker threshold was touched** (specs/40's rule).

### 1. The replay harness cut the CNN's crops at the wrong size

`ClipDriver` built its profile with `CropParams.default`, i.e. `config.CROP.pad_side` = **0.10**,
where the `phone` profile the model is trained and served against says **0.05** — a 120 px crop box
against 110.

| `pad_side` | conflicts against the UNTOUCHED start position, frames 0/60/63/70 |
|---|---|
| 0.05 (the profile) | `[]` `[]` `[]` `[]` |
| 0.10 (the harness) | `a7 c7 b8` · `a7 c7 b8 h8` · same · same |

Those four squares are exactly what the tracker named at t = 0.4 s before the desync streak
escalated to the ILLEGAL MOVE alarm at t ≈ 2.9 s, after which nothing can commit by design. A clip
entry now carries `crop`; the 20 Blender clips carry no `crop` key and keep the defaults, byte for
byte.

### 2. The footage's first second is not yet the scene

Per-square mean luma through the fixed quad:

| frame | whole board | a1 | a2 | b1 | h8 |
|---|---|---|---|---|---|
| 0 | 81.0 | 41.6 | 87.0 | 76.6 | 38.0 |
| 20 | 86.1 | 44.2 | 95.1 | 85.7 | 37.5 |
| **30** | 84.4 | **60.4** | **115.0** | **107.6** | **32.5** |
| 120 | 79.5 | 60.4 | 113.2 | 104.1 | 30.0 |

The a-file corner gains **32–38 %** of its luma between frame 20 and 30 while h8 loses 20 % and the
whole-board mean does not move — a local light change, not auto-exposure. A reference taken at
frame 0 then reads **a1, a2, b1** as changed in 178 of the next 200 frames, forever. `--start-frame`
drops leading frames; that is specs/40's "cut the clip where it happened" as an argument, not an
override. See `probes/a1_corner_over_time.png`.

**What the diff detector was doing all along:** with the geometry right, its changed-square sets
read `[e2,e4]` → `[e2,e4,e5,e7]` → `+[f3,g1]` → `+[f6,g8]`. That is 1.e4 e5 2.Nf3 Nf6, detected
correctly, while a latched alarm forbade committing any of it.

---

## Phase 02 — both trackers

### Python

`MoveTracker._warp` now calls `_on_grid` on the ArUco alignment branch — parity with Android's
`LiveAlign.onGrid`, which Python had no equivalent of at all. Measured once per pose through
`improve_quad` (which never returns a quad that did not improve the frame), carried as a
rectified-space `grid_correction`, expired when the quad drifts a quarter cell (`quad_drift_cells`,
the same threshold `QuadDriftTest` pins on Android). `grid_align=False` turns it off. Never raises:
every failure path falls back to the ArUco quad.

`board_corners_for_frame` and `profile_from_frame` now log **loudly, once per marker count**, that a
quad reconstructed from fewer than four markers is an affine parallelogram or a similarity and not
a measurement. A warning and not a refusal, because a degraded quad is now a usable coarse seed.

### Android

`:core-geometry` ported in full: `warpFromCornersPadded` / `warpForGrid`, `gridLines` → `BoardGrid`
(all 9 lines per axis), `AxisFit.kt` (pooled slope), `ProjectiveFit.kt` (IRLS Huber over a
Hartley-normalised DLT — never RANSAC, because the fixtures are asserted byte-identical across
runs), `alignmentOf`, `refineQuad`. `AffineFit.kt` **deleted**. `linePositions` / `boardLattice` /
`lineGeometry` removed with it. `BoardGray` now takes medians down a band.

No `@Suppress`, no baseline entry: the 21 detekt findings the first run produced were fixed by
splitting the file along its seams and naming the DLT block offsets.

### The dead detector, decided

**`board_corners_from_lines` is deleted.** Measured on the only real footage on record before the
decision:

| frame | 0 | 900 | 1800 | 3600 | 5400 | 7200 | no profile |
|---|---|---|---|---|---|---|---|
| result | None | None | None | None | quad | quad | None |
| distance from the board's measured corners | — | — | — | — | **775.6 px** | **897.5 px** | — |

Both quads it returns have locked onto the desk and monitor edges, and even after the grid refit
they fail the gate (12.8 and 13.2 px). Its own docstring already said lines cannot tell 90° from
180°, so it never had the orientation anchor a cold start needs. Dead code for a month, called only
by `scripts/dump_warp.py`, invisible to `vulture` at the configured confidence 80.

**Correction to the pack:** there is **no Kotlin port of it**. Android's `BoardDetector` is the live
ArUco interface `ArucoCalibrator` implements and `CalibrationViewModel` consumes. Nothing markerless
was ever ported, so there was nothing to delete on that side.

`CLAUDE.md`'s non-goal now reads: markers are the **coarse** geometry source, the board's own grid
is the **fine** one, and a fully markerless cold start is not supported.

---

## Corrections to earlier records

- **"0–8 of 14 grid lines located"** (`specs/40/STATUS.md`) is wrong for this board — the earlier
  probe passed a single-channel image to `line_positions`, which raises. Confirmed again here:
  **18/18** lines including the outer ones on every clean frame.
- **`worst_offset` was a lower bound** because of the pinning. That is closed; the numbers in this
  file are from the unpinned metric and are **higher** than the pre-2026-08-03 ones on the same
  frames.
- **`quad_spread` must never be read as a correctness gate.** It scored this video p90 0.93 px with
  98 % of frames under 2 px while every quad in it was 27–33 px out. It is kept in
  `label_real_game.py` only as a board-**movement** check, relabelled as such, and the absolute
  `ALIGN_PASS_MIN` gate is what refuses footage now.
- **`entry.md`'s "Changed squares at t=3.0 s: 7 → 6"** understates the result. With the full fix the
  static board reads **0** changed squares at the reference and 3 only once the local light change
  at frame ~25 arrives; past that transient the changed sets track the real moves exactly.

---

## What is NOT done, honestly

- **The replay commits 22 plies of a game that ran 83 plies live.** It is a reviewable move list,
  which is what phase 01 asked for, but it is not the whole game. After ply 22 (`Nxd4`) the tracker
  goes back to `too_many_changed` and does not recover. That is now a tracker/CNN question with the
  geometry out of the way, and it needs its own pack — the diff evidence and the CNN observations
  are both good at that point, so the failure is in how they are combined, not in what they see.
- **The gate is not yet in front of `ensure_profile` / `calibrate auto`.** `raw_corners`,
  `board_corners_for_frame`, `profile_from_frame`, the live warp and the video path all go through
  the verdict or the loud warning; the interactive calibration commands do not.
- **`data/realgames/game-2026-08-02/candidate.json` is `confirmed: false`** and must stay that way
  until a human reviews it in the web UI. Nothing downstream may use it.
- The 4 % gate is argued from §12's numbers, not swept. A sweep against phantom count on a rebuilt
  corpus would be the honest calibration and is a training-scale job.

## Visual probes

`data/realgames/game-2026-08-02/probes/` (gitignored):

- `probe_before_after.png` — the camera frame with each quad's grid drawn back onto it, the warp
  with the measured lines over the nominal grid, and one 3×3 square region at native rectified
  resolution. Before and after, side by side.
- `probe_all_failures.png` — all 35 frames that fail the gate. Every one is an arm.
- `probe_committed_moves.png` — the first six committed plies with the static quad's grid on them.
- `a1_corner_over_time.png` — the local light change, frames 0 to 120.
