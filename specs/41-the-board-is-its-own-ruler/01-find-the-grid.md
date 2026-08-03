# 01 — Find the grid, on this footage, per frame if that is what it takes

The user, 2026-08-03: *"es gibt algorithmen die auch bei diesem bild die kanten markieren können
also müssen wir das auch irgendwie hinkriegen ohne marker, und wenn es per frame ist."* They drew
all fourteen lines on frame 0 by hand and called them excellent to see. The grid is there. The task
is to extract it as well as a human does.

## What is already known, so it is not re-derived

| Fact | Value | Source |
|---|---|---|
| Lines the current detector locates | x **9/9**, y **8/9** | measured 2026-08-03 |
| Line residual against the ideal grid | x max 9.4 px (mean -4.9), y max 18.9 px (mean +6.2) | same |
| `alignment.correct_quad` from the 3-marker quad | 26.9-32.7 px → **5.1-13.6 px** | same |
| Direct 7x7 lattice refit, inner lines only, 4 iterations | **11.1-18.0 px** — worse than the above | same |
| The same refit including the pinned outer lines | 14.1-31.7 px, once worse than its own input | same |

So the naive refit is a dead end already walked. `line_positions` collapses each axis to a 1D
profile, which is exact under translation and **silent under rotation and shear** — the same blind
spot that certified 302 bad frames in 2026-07. A fit built on a 1D collapse inherits it.

## The direction

2D line geometry, not 1D projection. The board's lines are long, straight, high-contrast and
nine-per-axis with known spacing — that is a strongly constrained problem, and it is the classic
one. **Use established algorithms and libraries; this project does not homebrew geometry.**
Candidates worth measuring, in no particular order: LSD / EDLines segment detection, Hough with
angle clustering into two families (`board_corners_from_lines` already does exactly this and is
dead code — read it first), vanishing-point estimation from the two families, saddle-point / X-corner
detection at the 49 interior crossings (`cv2.findChessboardCornersSB` exists and is built for
precisely this pattern), and per-frame refinement seeded by the previous frame.

`cv2.findChessboardCornersSB` deserves the first hour: it is OpenCV's own detector for a chessboard
lattice, it is sub-pixel, it is robust to the contrast unevenness this board has (a3 reads 26 while
g6 reads 165 in the same frame), and the fact that this project never tried it is not evidence
against it.

**Contrast is a named suspect.** The user raised it. The h-file side is ~6x brighter than the
a-file side in the same frame, and the marker that fails to decode is on the bright side. CLAHE or
local normalisation before line finding is cheap and may be the whole difference — but note the
project's standing rule that live camera frames get no software post-processing: this is analysis
of an already-captured frame for GEOMETRY, which is a different thing, and must not leak into the
frames the CNN sees.

## Stage it — the user's steer, and the shape the project already has

The user, 2026-08-03: *"es geht ja auch das der agent mehrere tools kombiniert, ggf erst das grid
aligned anhand einer groben erkennung und dann das feinausrichten wie wir es machen für unsere
datenaufbereitung."*

That is the right architecture and it is not new to this codebase — it is what the session-repair
path in `web/routers/sessions.py` already does: a coarse quad from markers, then
`alignment.improve_quad` refining it against the board's own grooves, and refusing to write when
the refinement did not actually improve the frame. The live trackers simply never got the second
stage. So:

1. **Coarse.** Whatever locates the board at all — ArUco (even three markers), the previous frame's
   quad, `board_corners_from_lines`, or a stored profile. It only has to be close enough to bring
   the grid into the search window; it is explicitly allowed to be wrong by tens of pixels, which
   is what the 3-marker affine quad is.
2. **Fine.** The grid fit of this phase, seeded by the coarse quad, iterated.
3. **Refuse.** `improve_quad`'s discipline is the model and is not optional: it returns the
   correction only when the frame actually got better, so a caller can apply it unconditionally and
   never make a frame worse. Every stage here must be able to say "I did not improve this" — a
   silently worsened quad is the exact failure this pack exists to end.

Combining tools is encouraged. Nothing says one detector has to win: taking the ArUco quad as the
seed, `findChessboardCornersSB` for the interior lattice when it succeeds, and a line-family fit
when it does not, is a better answer than any one of them alone — provided the phase-00 gate picks
between them per frame on measured error rather than on preference.

## Budget

Per-frame is allowed. The user said so explicitly. But measure it: the phone's whole-frame budget
is 23.1 ms median / 32.4 p90 at 26-28 fps, and the CNN takes 16 ms of it for 64 crops. If the grid
fit costs more than the budget, it belongs on the align cadence (`align_every`, currently every 3rd
frame) or on its own thread — say which, with the number.

## Acceptance

1. On frame 0 of `VID_20260802_222741.mp4`: the phase-00 gate **passes**, from the 3-marker quad as
   the only geometric input. The bar is the gate's threshold, not "better than 5 px".
2. Over the whole video: report the distribution, not the best frame. State how many frames fail
   and what they have in common (a hand over the board is a legitimate failure; refusing to answer
   is a legitimate output).
3. **The replay commits moves.** `scripts/label_real_game.py` on this video currently produces
   `moves: []`. A move list that a human can review is the point of the whole exercise.
4. A visual probe with the montage the user asks for on every geometry change: the frame, the
   detected grid drawn on it, and the resulting warp — before and after.
