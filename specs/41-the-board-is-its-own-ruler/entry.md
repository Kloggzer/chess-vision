# 41 — The board is its own ruler

Grid-based alignment in BOTH trackers. Requested by the user on 2026-08-03 after the 2026-08-02
game video was traced to a geometry failure that four markers would have prevented and that the
board's own grid can see directly: *"dazu sollte dann ja das grid des schachbrettes benutzt werden
um das alignment zu machen — ich dachte das würden wir schon lange machen, wenn nicht muss das in
beide tracker rein."*

## Why now, in numbers

The video's fourth ArUco marker never decodes. `resolve_board_corners` degrades to
`cv2.getAffineTransform` at three markers — a PARALLELOGRAM standing in for a perspective view of a
plane, which cannot be right by construction — and the result was:

| Measured 2026-08-03 on `VID_20260802_222741.mp4` | Value |
|---|---|
| Markers decoded, every one of 9576 frames | **3 of 4** (ids 0, 1, 3; id 2 = `h1`) |
| Worst square offset of the 3-marker quad (cell = 100 px) | **26.9 – 32.7 px** |
| The band `docs/data-pipeline.md` §12 already calls damaging | 3.2 – 6.5 px |
| Grid lines the detector locates on this board | **x 9/9, y 8/9** |
| Worst square offset after `alignment.correct_quad` | **5.1 – 13.6 px** |
| Changed squares at t=3.0 s, static board, marker quad | **7** — over `max_changed = 6`, jammed |
| Changed squares at t=3.0 s, grid-corrected quad | **6** — `too_many_changed` gone |

The last two rows are the proof by intervention: improving nothing but the geometry moved the
symptom. The tracker still does not commit (it reaches `no_legal_move` instead), which is what the
remaining 5-13 px buys.

**The measurement that hid this for a day** was `quad_spread`: it compares each frame's quad against
the MEDIAN OF THE SAME QUADS. A consistently wrong quad scores beautifully — p90 0.93 rectified px,
99.9 % "detected". Precision reported as accuracy. Any acceptance gate this pack adds must be
absolute, never self-referential.

## Where each tracker stands today

- **Android** already applies a grid correction: `LiveAlign.correction` is a rectified-space
  offset fitted once per pose on top of the ArUco quad, with `fittedAt` guarding against the pose
  changing under it. It is a correction, not a source.
- **Python** does not. `MoveTracker._warp` goes through `board_corners_for_frame` — markers only.
  `alignment.improve_quad` / `square_offsets` exist and are wired only into the web session-repair
  path (`web/routers/sessions.py`) and offline scripts. **This is the gap the user is pointing at.**
- **Fully markerless** (`board_corners_from_lines`, ported to Android as `BoardDetector`) exists in
  both and is called by NEITHER — vulture reports it `unused function` at confidence 60, and only
  `scripts/dump_warp.py` touches it.

## The open design question, deliberately not answered here

`alignment.correct_quad` reaches 5-13 px. A direct refit — take the located inner lines, fit a
homography from the 7×7 lattice to the ideal one, compose — was tried on 2026-08-03 and came out
**worse** (11-18 px, one frame worse than its input at 31.7 px). Two reasons are known and neither
is obviously the whole story:

1. `line_positions` **pins index 0 and 8** to 0 and `board_size`. Those are constants the warp puts
   there by construction, not measurements. Including them in the fit anchors it to the assumption
   being tested; excluding them helped (31→18 px) but did not close the gap.
2. The same pinning is why a uniform SCALE error is unmeasurable by this metric at all
   (`CLAUDE.md`). So `worst_offset` has a blind spot in exactly the direction a bad quad fails.

Whoever takes this must decide whether the answer is a better fit over the existing 1D line
positions, or 2D line detection that does not collapse the axes. **Do not improvise it.** Mis-aligned
crops cost this project 5.5x its empty-crop margin once already, and the failure mode is silent.

## Scope

1. Establish an ABSOLUTE alignment gate — `worst_offset` against truth, not spread about a median —
   and put it in front of every path that produces a quad.
2. Python: grid correction in the live warp, to parity with Android's `LiveAlign.correction`.
3. Both: refuse or flag a quad reconstructed from fewer than four markers, loudly. `raw_corners`
   is done (2026-08-03); the live paths are not.
4. Decide the fate of `board_corners_from_lines` in both trackers: wire it as the cold-start source,
   or delete it. It has been dead code in two languages for a month.

## The video stays

The user's call, 2026-08-03: *"dann ist das video ja total gut um genau all diese dinge zu
verifizieren, das kann ja so auch mal in der echten welt passieren."* A marker half out of frame is
what a hand-placed phone does. `VID_20260802_222741.mp4` is therefore the acceptance case for this
pack, not footage to be replaced — three markers must be refused loudly, the grid must be able to
stand in, and a replay that has never committed must still re-anchor.
