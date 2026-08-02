# 36 — Status

| Phase | State | Note |
|---|---|---|
| 00 — delete the wizard | `done` | `53cbc00`, net −935 lines |
| 01 — mark and adopt | `done` | `53cbc00` + `b4b97e4` |
| 02 — refit on pose change | `done` | `b4b97e4`, **not yet observed on device** |

## What landed beyond the written phases

The pack said phase 01 would end in one button. It ends in **none**: the board is adopted on its own
once all four codes are read. The user's reason is the pack's own argument taken one step further —
if there is nothing to judge, there is nothing to confirm. `entry.md`'s "a geometry write is the
user's act" did not survive it, and should not have: the write carries board size and source
dimensions, both measured, neither chosen.

One guard was added that the pack did not call for. Adoption requires **all four markers**. Below
four, `resolveBoardCorners` reconstructs the missing corners and at two falls back to a similarity
fit — a square-board assumption with no perspective — so writing a board size derived from it would
be the same silent invalidation the pack exists to stop. The outline still draws; the record does
not move.

The saved quad now draws **amber** against the live quad's green. Two quads in the same colour said
nothing, and their disagreement is the only drift signal the screen still carries.

## Open

- **Phase 02 has never fired on the device.** `DRIFT_REFIT_CELLS = 0.25` is a starting value with no
  measured distribution behind it, documented as such in its KDoc. The confirmation is the log line
  `board moved … cells since the grid fit` after a real nudge; until that is seen, the expiry is
  implemented and untested in the only environment that counts.

## How this pack got smaller

The first draft answered "less is more" with a measured verdict, four thresholds, six new
capabilities in `:core-geometry`, classifier plumbing across the service boundary and ~20 new tests.
A review killed it on three counts, all verified against the tree:

1. **The thresholds were unmeasured or wrong.** `≤4 %` for ALIGNED appears nowhere in the repo.
   `≤6 %` was read off `check_alignment.py`'s `--max-off` help string, which says "6 of a 100 px
   square" while `:260` computes the cell from `board_size` (200 px at the default 1600) and its own
   printout renders that default as **3 %**. The `1.3 %` "noise floor" traces to a comment in
   `GrooveProfile.kt:32` describing per-groove estimator noise, not a `worstCells` figure — and
   `worstCells` is a max over 64 squares × 4 edges, structurally several times a single-sample
   median.
2. **The measured behaviour contradicts the bands.** `specs/30-sharper-alignment/STATUS.md:74`, over
   267 real frames at 100 px cells: **already-fine frames read 5.27 median / 5.96 p90 / 6.14 max**,
   falling to 3.59 / 3.99 only after correction. The draft measured in the detection poll — before
   the refinement — and made the save button conditional on the result, so a correctly aligned board
   would routinely have had no button and no path forward.
3. **The premise the whole UI rested on was false.** The saved corners are a seed that `LiveAlign`
   overwrites every third frame. There was nothing for the user to tune, which is why every attempt
   to let them tune it grew another control.

What survived: the deletion, and the drift bug the draft found in `LiveAlign` and filed as an
appendix. That bug is now the pack's only real engineering.

## Deliberately not here

- **Automatic orientation from the pieces.** The idea is sound and is recorded outside this pack:
  colour resolves the 180°, occupancy resolves the 90° transpose. It is worthless with markers (the
  IDs already anchor a8, so a vote can only agree or introduce an error) and cannot run at all on
  the shipped 2-class model. It becomes valuable only if markers ever go away.
- **Markerless detection.** ArUco stays. The alignment stack is already marker-independent — it
  reads the board's own grooves — but nothing in the project can anchor a8 from a cold start, and
  `board_corners_from_lines`' own docstring says lines cannot tell 90° from 180°.
- **`measuredMargin`.** Would fight `improveQuad`, which already absorbs an outset error by moving
  the quad, and `profileLines` never searches lines 0 or 8 in any case.

## Camera view — findings only, no phase

- **Zoom warns and does not enforce** (`CameraRoute.kt:476-478`). It prints "recalibrate after
  changing it" and nothing happens. Same class of silent geometry invalidation as everything above,
  and the most actionable item on this list.
- **`Lock` changes every pixel and does not re-baseline.** `Light` does, and says why
  (`TorchControl`). The lock is at least as large a photometric change.
- **Nothing reports px/square**, although the quad carries it and it is the number that decides
  whether a session is worth anything (`CLAUDE.md`: the device sees ~98 px/square).
- **No violations of the no-post-processing rule.** Every control reaches the sensor, `fill` is
  layout only and announces itself, no camera is bound by the UI. That part is sound; leave it
  alone.
