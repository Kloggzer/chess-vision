# Phase 04 — One alignment toolkit (Python)

## Why

The same disease, on the other side of the repo. `src/chesslab/alignment.py` landed on this branch
as the library — correct layer, well named, covered by `tests/test_alignment.py` against analytic
truth. Then **four separate "measure the grid and show it" surfaces** were written around it in the
same days, and none reuses the next.

**a) `improve_quad`'s safety rule is stated three times.** `alignment.py:341-354` exists precisely so
that callers *"can write the result unconditionally and never make a frame worse"*. The web route
uses it (`web/routers/sessions.py:554`). `scripts/check_alignment.py:112-119` re-derives it by hand
— `correct_quad`, then `frame_offsets`, then `judge`, then `if not np.isfinite(worst2) or worst2 >=
worst: refused += 1` — and its import block (`check_alignment.py:41-44`) pulls `correct_quad` and
`frame_offsets` but **not** `improve_quad`. `sessions.py:576` even documents the rule as living
*"both in `alignment.improve_quad` and here"*. Three statements of one invariant, and the one that
guards the corpus is the hand-written copy.

**b) The 3x3 native-resolution tile with the nominal green grid is written four times**, all new on
this branch: `check_alignment.py:175-183` (`levels_montage`), `check_alignment.py:208-221`
(`before_after_montage`), `web/routers/sessions.py:709-716` (`session_corners_zoom`), and
`sessions.py:768-777` (`tile` inside `session_fixed_montage`). Each independently clamps `(f, r)`
into `1..6`, slices `warped[y0:y0+3*cell, x0:x0+3*cell]`, draws four green lines,
`copyMakeBorder`s and `putText`s. Two of the four carry the *same* warning comment about not
letting each side pick its own worst square — the identical lesson learned twice.

**c) The worst-offset summary is written four times**: `check_alignment.py:273-274`,
`survey_alignment.py:77-79`, `scripts/ingest_video_session.py:96`, `sessions.py:662-663`. All
compute median / p90 / max over per-frame `worst_offset`.

**d) A script re-exports a library symbol, and `sys.path` decides whether the import resolves.**
`scripts/ingest_video_session.py:74`:

```python
from check_alignment import frame_offsets, judge
```

`frame_offsets` is `chesslab.alignment.frame_offsets`; `check_alignment.py` only re-exports it.
`ingest_video_session.py:31` inserts the scripts directory on `sys.path` to make that work. `judge`
is genuinely script-level and the import of *that* is fine — `frame_offsets` is not. The same shape
is at `scripts/phantoms_vs_neighbours.py`, which pulls `filter_rows_by_split` out of
`sweep_infer_size` while pulling its two siblings straight from the library six lines later.

## Design (decided — do not redesign)

### Step 1: the two helpers the library is missing

Add to `src/chesslab/alignment.py`:

```python
def grid_tile(warped, square, profile, *, span=3, label=None):
    """One square and its neighbours at NATIVE warp resolution, with the nominal grid drawn.

    The tile is the only honest way to show a sub-pixel offset: a whole-board render at screen
    resolution puts a 4 px error inside one screen pixel. `span` cells centred on `square`,
    clamped so the window stays on the board.
    """


def offset_summary(worsts) -> dict[str, float]:
    """`{"n", "median", "p90", "max"}` over per-frame worst offsets, NaNs dropped.

    One definition, because the four call sites that had their own were compared against each
    other in `specs/30` and `docs/data-pipeline.md` §12.
    """
```

`grid_tile` takes the union of what the four copies do; where they differ (border colour, label
placement), pick the web route's version — it is the one a human actually looks at — and note the
difference in `STATUS.md` rather than adding a flag for each.

### Step 2: the four call sites use them

`check_alignment.py` `levels_montage` and `before_after_montage`, `sessions.py`
`session_corners_zoom` and `session_fixed_montage` each shrink to *compose tiles*, not *draw them*.
The duplicated "do not let each side pick its own worst square" comment survives **once**, at the
composition site where it is actually a risk.

### Step 3: `check_alignment.py` uses `improve_quad`

Replace `check_alignment.py:112-119` with the library call:

```python
q, _before, _after = improve_quad(frame, e["corners"], prof)
if q is None:
    refused += 1
    continue
```

`improve_quad` already returns `None` for "did not improve", which is precisely what the hand-rolled
`worst2 >= worst` check does. **This is the highest-value line in the phase** — it is the corpus's
guard rail, and it currently has two implementations.

Then delete the `and here` half of the comment at `sessions.py:576` and point it at the function.

### Step 4: the cross-script import

`ingest_video_session.py:74` becomes:

```python
from chesslab.alignment import frame_offsets   # at module scope, with the other library imports
from check_alignment import judge              # genuinely script-level
```

If `judge` is also wanted by more than one script, move it into `alignment.py` too and drop
`sys.path.insert(..., parent)` at `:31`. Say in `STATUS.md` which you did.

Do **not** touch `phantoms_vs_neighbours.py` / `sweep_infer_size.py` in this phase. Those share
`filter_rows_by_split`, `sweep_path_a`, `frames_for_split`, `load_torch_run`, `margin`, `_counts` —
a much larger seam, and `score_onnx.py:8-12` documents the sharing as deliberate. Record it in
`STATUS.md` as a follow-up, with the one real hazard named: `frames_for_split` is defined in
**both** `sweep_infer_size.py:235` and `adabn_recalibrate.py:139` with different return shapes, and
`phantoms_vs_neighbours.py` already imports that name from one of them.

### Step 5: `profile_at_warp`

`scripts/adabn_recalibrate.py:123-136` is a byte-level copy of
`scripts/sweep_warp_resolution.py:130-142` and its own docstring admits it (*"Same helper as
`sweep_warp_resolution.profile_at_warp`"*). It is pure profile arithmetic over `compute_homography`
and belongs in `src/chesslab/calibration.py`. Move it, import it from both.

## Steps

1. `grid_tile` + `offset_summary` in `alignment.py`, with tests —
   commit `feat(alignment): the grid tile and the offset summary have one definition`
2. Four call sites rewired — commit `refactor: the alignment views compose tiles instead of drawing them`
3. `check_alignment` uses `improve_quad` — commit `fix(scripts): the auto-fix guard has one implementation`
4. Library imports come from the library — commit `fix(scripts): import frame_offsets from chesslab, not from a sibling script`
5. `profile_at_warp` into `calibration.py` — commit `refactor(calibration): profile_at_warp is library arithmetic`

## Tests

`tests/test_alignment.py` (append — do not restructure the file, its truth calibration is
load-bearing):

1. `test_grid_tile_stays_on_the_board` — for every corner square (`a1`, `a8`, `h1`, `h8`) the
   returned tile has the full `span * cell` shape; the clamp is the only thing that can silently
   return a smaller array and every caller then draws a differently-scaled picture.
2. `test_grid_tile_is_native_resolution` — the tile's shape is exactly `span * cell`, i.e. nothing
   resized it. This is the whole point of the tile and it is one assertion.
3. `test_offset_summary_drops_nans` — a list with `nan` in it yields `n` equal to the finite count
   and finite median/p90/max. Four call sites disagreed about this; pin it once.
4. `test_improve_quad_refuses_a_worse_quad` — if this does not already exist, add it. It is the
   invariant step 3 removes a second copy of, and after step 3 it is the **only** guard the auto-fix
   path has. Verify against `tests/test_alignment.py` before writing a duplicate.

```
.venv/Scripts/python.exe -m pytest -q tests/test_alignment.py
.venv/Scripts/python.exe -m ruff check src/chesslab/alignment.py src/chesslab/calibration.py scripts/check_alignment.py scripts/ingest_video_session.py scripts/adabn_recalibrate.py src/chesslab/web/routers/sessions.py
```

## Acceptance criteria

- [ ] `grep -rn "copyMakeBorder" scripts src` returns one drawing site.
- [ ] `grep -rn "correct_quad" scripts src` shows no caller that re-derives the improvement check.
- [ ] `grep -rn "from check_alignment import" scripts` imports nothing that lives in `chesslab`.
- [ ] `grep -rn "def profile_at_warp" scripts src` returns one definition.
- [ ] `tests/test_alignment.py` green; ruff clean on every touched file.
- [ ] `STATUS.md` records the `frames_for_split` name collision as an open follow-up.

## Do NOT / Out of scope

- Do **not** change any number in `alignment.py`. `SEARCH_FRAC`, `CENTROID_FRAC`, `MIN_DEPTH`,
  `BANDS`, `ITERS` are calibrated against analytic truth in `tests/test_alignment.py` (0.05 px mean
  error bare, 0.18 with pieces) and against the Kotlin port. This phase moves code, never maths.
- Do **not** change what the web routes return. `session_autofix_session` and
  `session_scan_alignment` **write `log.jsonl`**, which is the geometry source of truth, and they
  have **no tests** (`tests/test_web_corners.py` covers the sibling endpoints only). Rewiring their
  drawing is in scope; changing their behaviour or their payload is not.
- Do **not** delete `scripts/survey_alignment.py` or `scripts/check_alignment.py`. They are the
  tools that found the mis-alignment; they get smaller, not removed.
- Do **not** touch `sweep_infer_size.py`. CLAUDE.md calls it the measurement of record and the
  numbers it produces are compared across weeks.
- Do **not** run a training job, a sweep, or anything that takes the GPU. This phase is static.
