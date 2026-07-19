# Phase 02 — Orientation: solve a8 once, carry it through motion

## Why

A checkerboard is symmetric — detectors return a geometrically-ordered quad but cannot tell
a8 from h1/a1/h8 (90°/180° ambiguity). ArUco resolves this for free; markerless does not.
Because the board identity is continuous across frames, orientation only has to be
**established once** at lock and then **carried by tracking**. This phase adds the anchor and
the carry/re-anchor logic so the engine's output is correctly labelled `[a8,h8,h1,a1]`.

## Design (decided — do not redesign)

All in `src/chesslab/board_geometry.py` (`BoardGeometryTracker`).

### 1. Anchor establishment (priority order, at first lock / after LOST)

`_resolve_orientation(frame, quad) -> [a8,h8,h1,a1] | None` picks the rotation of the
4-corner `quad` (4 cyclic rotations × optional mirror) that best matches an anchor:

1. **ArUco** — if `detect_board_corners_aruco(frame)` returns corners, choose the quad
   rotation minimizing summed corner distance to the ArUco corners. Authoritative.
2. **Profile proximity** — else if `profile.image_corners` has ≥4 points, reuse the exact
   rotation-picking already in `_finish_quad` (`calibration.py:757-763`): pick the cyclic
   rotation minimizing squared distance to `profile.image_corners`. (Factor that inner loop
   into a shared `_best_rotation(quad, ref)` in calibration.py and call it from both, OR
   replicate the ≤6-line loop — prefer factoring; if factoring risks touching tested code,
   replicate and note it.)
3. **Operator confirm / start-position** — else return the quad in raw order and set
   `self._orientation_confirmed = False`; expose `needs_orientation` in `status()` so the UI/
   CLI can prompt a one-time confirm. Out of scope to build UI here — just surface the flag
   and accept an `orientation_rotation: int` override on the engine that the caller can set
   (0/1/2/3 quarter-turns) once confirmed.

Store the chosen rotation index `self._orient_k` (and mirror flag if used). Apply it to
every subsequent detector output.

### 2. Carry through tracking

Tracking is continuous, so `_orient_k` established at lock stays valid while `state ==
TRACKING` — apply the SAME rotation to tracked corners without re-resolving. Only
`_try_detect` (cold/periodic re-detect) re-runs `_resolve_orientation`; on a **periodic**
re-detect (still tracking, `prior` available) prefer proximity-to-`prior` (cheap, no ArUco
needed) so orientation can't flip mid-game from a spurious ArUco read. On re-detect **after
LOST** (no reliable prior), use the full priority order (ArUco first).

### 3. Integration point

`_try_detect` (phase 01) currently returns geometric-order corners. Wrap its result:
`corners = self._resolve_orientation(frame, quad)` before storing/seeding. Tracked-path
corners get `_apply_orient(self._orient_k, mapped_corners)`. Net effect: `update` always
returns a8-correct corners once an anchor exists; returns geometric-order (flagged
`needs_orientation`) only in the no-anchor cold-start case.

## Steps

### 1. Orientation resolution + carry — commit `feat(geometry): resolve a8 orientation once and carry it through tracking`

`_resolve_orientation`, `_best_rotation` (shared or replicated), `_orient_k`/`_apply_orient`,
`needs_orientation` + `orientation_rotation` override, `status()` additions.

### 2. Tests — commit `test(geometry): orientation anchored and carried under motion`

## Tests (write, run once, targeted)

Extend `tests/test_board_geometry.py`:
1. `test_orientation_from_aruco_anchor` — synthetic frame with the 4 ArUco markers present
   (reuse the marker-drawing helper from `test_calibration.py` if one exists, grep
   `DICT_4X4_50`/`drawMarker`); assert the engine labels a8 at the ArUco-implied corner even
   when the raw quad order is rotated.
2. `test_orientation_from_profile_proximity` — no markers, profile with `image_corners`; a
   quad rotated 180° is corrected to match the profile.
3. `test_orientation_carried_through_motion` — anchor once, then track a moving sequence;
   assert a8 stays the same physical corner every frame (no flips).
4. `test_needs_orientation_flag` — no ArUco, no profile corners → `status()["needs_orientation"]`
   is True and the `orientation_rotation` override rotates the output deterministically.

Run once:
`.venv/Scripts/python.exe -m pytest tests/test_board_geometry.py tests/test_calibration.py -q`

## Acceptance criteria

- [ ] `grep -n "_resolve_orientation\|_orient_k\|needs_orientation" src/chesslab/board_geometry.py` hits.
- [ ] If `_best_rotation` is factored into calibration.py, `_finish_quad` still uses it and
      `tests/test_calibration.py` stays green (orientation behavior unchanged).
- [ ] Tracked-path corners are NOT re-resolved every frame (grep shows `_resolve_orientation`
      called only in `_try_detect`, not the LK branch).
- [ ] New tests pass; scoped ruff clean; `test_calibration.py` green.

## Do NOT / Out of scope

- Do NOT build UI/CLI confirm flow — only surface `needs_orientation` + accept the
  `orientation_rotation` override (phase 03 exposes it if wanted).
- Do NOT change `white_pov` semantics — that is square→cell mapping, not corner orientation.
- Do NOT re-resolve orientation on the LK tracked path (only on detect).
