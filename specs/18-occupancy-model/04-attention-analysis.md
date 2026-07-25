# Phase 04 — attention analysis on the systematic failures

> Tools that already exist: `src/chesslab/training/gradcam.py`
> (`gradcam_for_run` `:151`, `compute_cam` `:106`, `reliance_for_run` `:219`,
> `_center_mask` `:210`), `scripts/gradcam.py` (run + explicit image paths),
> `chesslab reliance --run <dir>` → `<run>/reliance.json`. Read them before starting;
> this phase writes an analysis driver, not a new CAM implementation.
>
> **No GPU required** — `mobilenetv4_conv_small_035` is 0.64 M parameters and a few hundred
> crops on CPU is a couple of minutes. Use `--device cpu`.
>
> May run **in parallel with phase 02** (disjoint files). Its output is an input to phase 02's
> *next* iteration and to phase 05's data plan, not to phase 02's first run.

## Why

`f4` was misread in **90 of 186** observations of `blender-queenside`. `g1` in **42 of 42** of
`blender-promotion`. That is not noise around a decision boundary — a model that is uncertain
about a square is wrong on it roughly half the time in a *random* pattern. Being wrong 42
times out of 42 on the same square, and 90 times out of 186 on another, means the model is
computing a stable, confident, wrong answer from a stable input. Something about that
particular crop reliably produces "empty".

That has a small number of possible causes, and Grad-CAM plus the reliance metric can tell
them apart. Which one it is decides where the next unit of effort goes — more data, different
crop geometry, or different augmentation — and each of those is expensive enough to be worth
one cheap measurement first.

The repo has been here before and knows the shape of the answer. Memory note
*"Piece-focus anti-shortcut"*: the CNN was reading the **board**, not the piece (`bN` reliance
8 % → 43 % after intervention). Memory note *"Borderless attention vs accuracy"*: moving
attention onto the piece *regressed* real-test accuracy — the board shortcut was a crutch, and
removing the crutch without fixing the underlying piece signal made things worse. So the
finding here is not automatically an instruction to act; it is evidence that constrains what
acting could even mean.

## Files you own

| File | Contains |
|---|---|
| `scripts/analyze_offenders.py` | the driver: offender list → crops → Grad-CAM montage + reliance |
| `data/_perf/offenders/**` | its output (gitignored) |
| `specs/18-occupancy-model/STATUS.md` | your row + the findings section |

You own **nothing else**. `gradcam.py`, `reliance_for_run`, the training code, the dataset
code and the harness are read-only for you. If `gradcam.py` needs a change to accept your
inputs, that is a **blocker** — record it; do not edit it.

## Design (decided — do not redesign)

### 1. The offender list is an input, not something you re-derive

Phase 00's sweep and phase 01's exporter both produce per-square failure counts
(`ObsAudit.allWrongSquares`, top-8 offenders per clip) and, in phase 01's case, the exported
crops themselves. **Use them.** Re-running the harness to recompute offenders wastes an
expensive run and risks measuring a different tau than the one that was adopted.

`scripts/analyze_offenders.py` takes:

```
--run data/models/tiny-p3        # the model under analysis
--offenders <path>               # phase 01's hard_occupied.jsonl (or an offender json)
--top 12                         # how many distinct (clip, square) offenders to analyse
--per-offender 4                 # crops sampled per offender, spread across frames
--out data/_perf/offenders/<run>
--device cpu
```

If phase 01 has not run, fall back to `data/manifests/squares.jsonl` filtered to the offending
squares of the sessions in question — and say in `STATUS.md` which source was used, because
the two have different resolutions (~31 px/square for clip crops, ~200 for real captures) and
that difference is itself a candidate explanation.

### 2. What to compute, per offender crop

1. **Grad-CAM for the `empty` class** — the class the model *wrongly* chose. `compute_cam`
   takes a target; force it. This shows what evidence drove the wrong answer, which is the
   actual question. (A CAM for the true class shows what the model *would* have looked at,
   which is a different and less useful question.)
2. **Grad-CAM for the true piece class**, side by side. The pair is what makes the montage
   readable.
3. **`piece_frac`** via `reliance_for_run`'s mask-free occlusion method (`_center_mask`,
   `center_frac`). Per the memory note *"3-Phasen-Curriculum-Ergebnis"*, the reliance scale
   changed (`center_frac ~0.83`) — read the current value out of `gradcam.py` rather than
   assuming the historical one, and record which value was used.
4. The crop itself, unmodified, at its native resolution, with the resolution printed on it.

Output is **one montage per offender square**: rows = sampled crops, columns = [raw | CAM
`empty` | CAM true-class], with `piece_frac`, the true label, `p_empty`, `p_occ` and the
px/square figure annotated. Per the memory note *"Immer Probe liefern"*, this phase's whole
deliverable is a visual probe — the user iterates visually.

Plus a compact `offenders.json`: per offender, the mean `piece_frac`, the mean `p_empty`, the
crop count, the source and the resolution.

### 3. The outcome table — decided in advance, so the finding is not read backwards

Write the interpretation **before** looking at the montages, and then apply it. This is the
whole methodological point of specifying the phase.

| Observation | What it means | What it implies |
|---|---|---|
| CAM sits on the **board**, `piece_frac` low (< ~45 %) | The documented shortcut (memory: *"Piece-focus anti-shortcut"*). The model classifies the square's background and the piece contributes little. | The existing levers apply: `pad_up`/`pad_side` geometry, `--erase-p` cutout, `--bg-p` background randomization. **But** *"Borderless attention vs accuracy"* measured that forcing attention onto the piece **regressed** real accuracy — the shortcut was compensating for a weak piece signal. So this finding is an argument for **better piece signal first** (phase 05's real data), not for turning the anti-shortcut knobs harder. |
| CAM sits on the **piece**, `piece_frac` normal, still confidently `empty` | The model is looking in the right place and cannot see the piece there. Resolution or contrast: ~31 px/square on the clips, dark-on-dark, or the piece silhouette is genuinely ambiguous at that scale. | Not fixable by attention levers at all. Directly motivates phase 05 (real crops at ~200 px/square) and puts a floor under what the clips can ever show. Also: re-run this analysis on **real** crops of the same piece type before concluding — a clip-only finding may be a clip artefact. |
| CAM sits on the **neighbouring square** | Crop geometry: the box is pulling in the rank behind. `config.CropDefaults.pad_up` is 0 by default with an explicit warning that a non-zero value drags the neighbour's piece and board in. | Check the profile that produced these crops. If `pad_up > 0`, that is a concrete, cheap, testable fix — and it is a `slice` parameter, not a model change. |
| CAMs are **inconsistent** across crops of the same square | The "systematic" pattern is not a single mechanism. | Re-check the offender list: the failure may be tracking a *lighting condition* or a *frame range* rather than the square. Report it as such; do not force one of the rows above. |
| `piece_frac` for `empty` is high (the model looks *at the piece* and says empty) | The most interesting outcome: an in-distribution piece appearance that maps to `empty`. | Pull those exact crops into phase 01's `hard_occupied` set with priority, and name them in `STATUS.md` — they are the highest-value training examples in the whole pack. |

**Also record which offenders are on dark squares.** The dark-square domain gap is a
documented, recurring failure in this repo (memory: *"CNN dark-square domain gap"*,
*"3-Phasen-Curriculum-Ergebnis"*). `hard_empty.jsonl` carries `square_color`; carry it through
here. If offenders cluster on dark squares, that is a data statement, not an attention one,
and it changes phase 05's capture plan.

### 4. This phase produces a finding, not a fix

No model is retrained here. No augmentation default is changed. No crop parameter is changed.
The deliverable is: montages, `offenders.json`, and a `STATUS.md` section that names **one**
row of the outcome table as the observed one, with the evidence, and states the implied next
lever. A phase that "also tried" a fix has confounded its own measurement.

## Steps

### 1. Driver — commit `feat(scripts): analyze_offenders — Grad-CAM + reliance on the systematically misread squares`

### 2. Run and record — no commit
Run against `data/models/tiny-p3` (and, if phase 02 has produced one, the 2-class run — the
comparison is informative and free). Write the findings section in `STATUS.md`, including the
montage paths under `data/_perf/offenders/`. `data/**` is gitignored; nothing binary is
committed.

## Tests

This phase is analysis, so its "tests" are reproducibility guards:

| Test | Guards |
|---|---|
| `test_analyze_offenders_is_deterministic` | two runs at `--seed 42` sample the same crops and write identical `offenders.json`. A non-reproducible analysis is not evidence. |
| `test_analyze_offenders_handles_missing_offender_file` | a clear `[FAIL]` and a non-zero exit, not a traceback. |
| `test_cam_target_class_is_forced` | the CAM for `empty` is computed against the `empty` index, not the argmax. The core correctness point of §2.1. |

`uv run pytest -q tests/test_gradcam.py` (or the file the repo already uses for this area —
check before creating a new one).

## Acceptance criteria

- `python scripts/analyze_offenders.py --help` runs and lists `--run`, `--offenders`, `--top`,
  `--per-offender`, `--out`, `--device`, `--seed`.
- The run produces **one montage PNG per analysed offender square** plus `offenders.json`,
  under `data/_perf/offenders/<run>/`.
- Each montage annotates, per crop: true label, `p_empty`, `p_occ`, `piece_frac`,
  `square_color`, and the **px/square** of the source.
- `offenders.json` carries the `center_frac` actually used, read from `gradcam.py`, not
  assumed.
- The three reproducibility tests are green; `uv run ruff check scripts` clean.
- `STATUS.md` names **exactly one** row of the outcome table as observed, quotes the mean
  `piece_frac` and the dark/light split that support it, and states the single implied next
  lever in one sentence.
- `STATUS.md` states the crop source (clip-derived at ~31 px/square vs real at ~200) and
  carries the pessimistic-lower-bound sentence wherever a clip-derived number appears.
- Nothing was retrained, no augmentation default changed, no crop parameter changed —
  verifiable as an empty diff outside `scripts/` and `specs/`.

## Do NOT

- Do NOT edit `src/chesslab/training/gradcam.py`. If it cannot do what you need, that is a
  blocker for the orchestrator.
- Do NOT retrain, fine-tune, or change any augmentation or crop default in this phase. A fix
  bundled with its own measurement is not a measurement.
- Do NOT turn `--erase-p`, `--bg-p` or `pad_up` up "since the CAM shows the board". The repo
  has already measured that forcing attention onto the piece regressed real accuracy
  (*"Borderless attention vs accuracy"*); acting on the CAM without the piece-signal fix is
  the mistake that experiment already made once.
- Do NOT compute the CAM only for the true class. The question is what drove the **wrong**
  answer.
- Do NOT re-run the clip harness to regenerate an offender list that phases 00/01 already
  produced — and never at a different `occupancy_thr` than the adopted one.
- Do NOT generalise from clip crops alone. ~31 px/square is a different domain from the user's
  board; check at least one offender piece type on real crops before naming an outcome row.
- Do NOT quote `tiny-p3`'s stored eval numbers. Five boards.
