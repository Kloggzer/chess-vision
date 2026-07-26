# Phase 00 — Why `f1` stands at z ≈ 15 (measure only, fix nothing)

## Why

On a real recorded game the tracker committed a phantom `Kd2`. The evidence it fitted was
`f1 = 15.7, g1 = 11.1, e2 = 8.1, d2 = 7.4, e1 = 7.3` — and `f1` was ALSO the strongest
square in the very next decision, which committed the unrelated `g8f6 g1f3`. A square that
is the loudest signal in two consecutive decisions and belongs to neither move is not a
move: it is a reference the tracker is diffing against that no longer describes the board.

Everything else has been ruled out already (see `entry.md`). This phase establishes the
mechanism. **A confident wrong diagnosis produces a confident wrong fix and both survive
review** — so this phase is forbidden from fixing anything.

## Design (decided — do not redesign)

Use the existing deterministic harness. `scripts/sweep_clip_params.py` already drives the
tracker frame-by-frame with the fixture generator's virtual clock and prints, per commit,
the candidate and the per-square z map. Extend it **in a throwaway script under `scratch/`**
(not in `scripts/`) to also dump images. Do not rewrite the harness.

Inputs, already prepared:

- Clip: the user's recording. If it is not on disk, ask for it in `STATUS.md` and STOP —
  do not substitute a synthetic clip, the whole point is that this is real footage.
- Corners for that clip: `calibration.detect_board_corners_aruco(frame0)` returns
  `[[895.15, 328.12], [898.86, 1095.04], [113.98, 1100.99], [118.45, 323.58]]`.
- `board_size = 640`, matching every regression clip.

Three questions, in order. Answer each with evidence, not inference.

### Q1 — What is physically on `f1`?

At the frame where `Kd2` commits, dump three images side by side at the `f1` cell:
the **reference** warp (`mt.ref_gray`), the **current** averaged warp (`mt._last_cur`), and
their absdiff. Do the same for a genuine move's origin (`g1`) as a control. Write the
images to `scratch/` and describe what they show in `STATUS.md`.

The candidate explanations, and what distinguishes them:

| Explanation | Signature |
|---|---|
| Base truth captured while something was on/over `f1` | The reference cell differs from the current cell from the FIRST detection onward, and never recovers. |
| A piece was nudged and left slightly off-centre | Current shows a piece offset within the cell; diff is a crescent, not a blob. |
| A cast shadow that moved between reference and now | Diff is low-contrast and uniform; the census/structure evidence is weak. |
| Board or camera shifted | Every square shows a rim of diff, not just `f1`. Check 3–4 other squares before concluding this. |

### Q2 — When did `f1` become poisoned?

Instrument the per-frame loop to record `z['f1']` for every frame of the clip and plot or
tabulate it against the frame index and the tracker state. Identify the frame at which it
rises and stays high, and what the tracker was doing at that frame (`_set_ref`? a commit?
a re-anchor?). `grep -n "_set_ref" src/chesslab/move_tracker/tracker.py` for the capture
sites.

### Q3 — Are origins systematically stronger than destinations?

Across all eight commits the origin square outscores the destination (real `Nf3`:
`g1 = 9.8`, `f3 = 7.1`). Quantify it: for every commit in the clip, record
`z[origin]` and `z[destination]` and report the distribution. State explicitly whether the
asymmetry is:

- **(a) geometric** — the crop/box for a destination includes more of the arriving piece's
  shadow or less of the piece itself (check `overhang`, `squareBoxes` extendUp), or
- **(b) photometric** — arriving pieces land on squares of similar brightness (light piece
  on light square), or
- **(c) an artefact of this one clip's lighting**.

Do not guess. If the data cannot distinguish them, say so.

## Steps

### 1. `scratch/probe_f1.py` (new) — no commit

Throwaway. `scratch/` is gitignored; if it is not, add it to `.gitignore` in your own
commit and say so in `STATUS.md`. This script is evidence-gathering, not a deliverable.

### 2. `specs/19-live-hardening/STATUS.md` — commit `docs(specs): 19 phase 00 — poisoned-reference measurements`

The only commit this phase produces. Fill in the phase 00 section with:

- Q1: what the three images show, with the image paths.
- Q2: the frame index where `f1` goes bad, the tracker state at that frame, and the code
  path that captured or should have invalidated the reference.
- Q3: the origin/destination z table for all eight commits, and your classification with
  the reasoning that excludes the other two options.
- A **recommended fix, stated but NOT implemented**, naming the file and function.

## Tests

None. This phase writes no production code.

## Acceptance criteria

- `git diff --stat main..HEAD -- src/ android/` is **empty** for this phase's commit.
- `STATUS.md` phase 00 section answers Q1, Q2 and Q3, each citing a file, a frame index or
  an image.
- The recommended fix names a specific function in a specific file.
- If any question could not be answered, it says so explicitly and why — an honest "the
  data does not distinguish (a) from (b)" is a complete answer.

## Do NOT / Out of scope

- **Do not fix anything.** No edits under `src/`, `android/`, `scripts/` or `tests/`.
- Do not change `config.py` defaults. `motion_hold_s`, `motion_thr`, `commit_ll_floor` and
  `ambiguity_margin_ll` are all frozen for this phase.
- Do not regenerate parity fixtures or clip manifests.
- Do not run `pytest -m clips` (7 minutes, orchestrator's job).
- Do not conclude "poisoned reference" because this spec says so — if the images show
  something else, that is the finding, and it is more valuable than a confirmation.
