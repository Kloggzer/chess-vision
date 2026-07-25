# 18 — Occupancy model: make the CNN good at the one job it has

> Entry file for the spec pack. Every implementing agent reads **this file completely**,
> then exactly the phase file(s) assigned to it. The Python implementation
> (`src/chesslab/**`) is the **source of truth for behaviour**; the Kotlin engine
> (`android/**`) is a port of it. Any behaviour change lands in **Python first**, is
> measured there, and is only then ported — the two must never diverge.

## What this is

**The CNN's only job is occupancy: `empty` vs `not empty`.** Piece identity does not matter
to the tracker's correctness path — the deterministic diff + legality machinery
(`loglik_scores`, `move_prior`, `Confirmer`, the verify ladder) decides *which* move was
played. The CNN exists to say *whether a square holds a piece*, and every downstream
consumer that matters (`resync_check`, `verify_move`, the `cnn_desync` veto, the
illegal-move alarm) reads occupancy, not identity.

The shipped model does that job badly in one specific direction, and this pack is the
plan to fix it — cheapest lever first.

## The measured context (binding — do not re-litigate, do not re-derive)

All numbers below come from `specs/17-android-rewrite/STATUS.md`, sections *"CNN clip
simulation"*, *"Python CNN cross-check"* and *"Veto escalation + overrule threshold"*
(2026-07-25). Read those three sections before starting any phase.

1. **The model loses pieces; it does not invent them.** Over **87 424** confident square
   reads across 1366 clip observations: confident-occupancy error **0.78 %**, made up of
   **8 826 misses** (a piece read as `empty`) against **226 phantoms** (an empty square read
   as occupied). A **39× asymmetry**, and it is the same direction in every clip.
2. **The errors are systematic per square, not noise.** `f4` was misread in **90 of 186**
   observations of `blender-queenside`; `g1` in **42 of 42** of `blender-promotion`. This
   rules out every temporal remedy — 2 votes, 3 votes or 10 votes all lose to a square that
   is wrong 90 times in a row. Nobody in this pack may propose voting, averaging or
   hysteresis as a fix.
3. **The `occluded` class has no training data at all.** `data/manifests/squares.jsonl` has
   **378 752** rows: `empty` **219 849** (58 %), then `bP` 39 020, `wP` 38 885, …, and
   **zero** `occluded`. `occluded` never comes from a FEN (`config.py:15-22`), and no manual
   labelling campaign ever produced any. The shipped 14-class model therefore has an output
   whose behaviour is undefined on exactly the input (a hand over the board) where it is
   most load-bearing.
4. **The shipped model is `data/models/tiny-p3`** — `mobilenetv4_conv_small_035`,
   `head = "twostage"` (a 2-way occupancy head × a 13-way piece head, composed into 14
   log-probs), 14 classes, 128×128 crops. Bundled byte-identically at
   `android/app/src/main/assets/cnn_model/`.
5. **Stored eval numbers are inadmissible as evidence in this pack.** `tiny-p3`'s
   `occ_board_acc = 0.800` is **4 of 5 boards** — a five-board evaluation. Do not quote it,
   do not compare against it, do not cite it in a STATUS row. If a phase wants a number, it
   measures one.

## The acceptance instrument: the clip harness

**Every phase in this pack is accepted or rejected by the clip harness, and by nothing
else.** It is `android/app/src/test/kotlin/com/chesslab/tracker/sim/`, class
`CnnClipSimulationTest`, opt-in:

```
cd android; .\gradlew.bat :app:testDebugUnitTest -Pchesslab.sim=true --tests "com.chesslab.tracker.sim.*"
```

It decodes 18 Blender clips (mp4 → board warp → 64 crops → the real `model.onnx` on the
ONNX Runtime CPU provider → `CnnRecovery` → `TrackerEngine` public seam → committed move
list) and scores that against each clip's `tests/data/testclips/<clip>.labels.json`. It
carries `ObsAudit`, which scores **every** observation's occupancy against the per-frame
ground-truth FEN (occluded frames excluded), independently of what the engine believed, and
reports misses / phantoms / per-square offenders separately.

- It compares several runs in one pass:
  `-Pchesslab.sim.models=data/models/tiny-p3,data/models/<yours>`. The diff-only baseline is
  model-independent and is replayed once, so every model is scored against an identical
  reference.
- ~**2168 observations**, ~**138 000 square reads** per model. That is roughly **400×** the
  sample size of any stored eval in this repo.
- Current state, for reference: diff-only baseline **18/18** clips; CNN attached **14/18**;
  0 phantom overrule commits; 2 alarms.

### The pessimistic-lower-bound rule (state it wherever you quote a number)

The Blender clips render the board across ~249 px of a 640×640 frame — about **31 real
pixels per square**. A phone at 1080p over a real board gives roughly **112 px per square**,
and the repo's own measurements put real captures near **200 px/square** against synth at
**~51 px/square** (memory note *"Synth crop resolution gap"*). Rendering the clip crops from
a `boardSize = 1600` warp instead of 640 moved the measured error by **< 0.2 pp** and changed
no clip's outcome — the pixels are simply not there.

**Consequence:** a clip number is a *pessimistic lower bound* on live behaviour, never a
forecast. Every report, STATUS row and acceptance statement that quotes a clip number must
say so in the same sentence. A model that improves on the clips has improved on the hardest
available evidence; a model that does not improve on the clips has not been shown to
improve at all.

### The parity floor — non-negotiable

`ClipReplayParityTest` (`:core-engine:test`) replays 969 committed parity frames across 18
clips and must stay at **18/18 clips, zero diverging frames**. Those fixtures were emitted by
`scripts/emit_parity_fixtures.py` with **`cnn_run=None`**, i.e. they exercise the diff path
only and contain no CNN observation whatsoever. **No phase in this pack may weaken, skip,
re-record or re-generate them.** A change that touches only the observation model or the
occupancy threshold is structurally incapable of moving them — if `ClipReplayParityTest`
moves, you have changed the diff path by accident and must stop.

## Standing constraints (binding for every phase)

1. **Python first, then Kotlin.** Land the change in `src/chesslab/**`, measure it there
   (`scripts/replay_clip.py` with `cnn_run="tiny-p3"`, or `uv run pytest -q`), then port it
   to `android/**` and confirm the harness sees the same decision. A Kotlin-only change is a
   divergence and is rejected on review. The 2026-07-25 cross-check established that the
   port is currently faithful frame-for-frame; that property is an asset and must survive
   this pack.
2. **`src/chesslab/config.py` is the only source of truth for defaults.** A new knob is
   declared in `TRACK_DEFAULTS`, mirrored into `android/core-engine/.../api/TrackerConfig.kt`,
   and its default copied **verbatim**. `specs/17-android-rewrite/entry.md`'s seam block is
   the written record of that type — when a knob is added, that block is updated in the same
   change and the addition is recorded in `specs/17-android-rewrite/STATUS.md`. This pack's
   phases are the *only* sanctioned reason to touch that block.
3. **`config.CLASSES` stays canonical and stays 14 entries.** CLAUDE.md: "The canonical class
   list exists in exactly one place (`config.py`)." An occupancy class list is added
   **beside** it, never by mutating it, never by a second definition elsewhere.
4. **Never split randomly.** Splits are per session (`dataset.py::assign_sessions_to_splits`).
   Frames of one session are near-identical; a random split leaks and every accuracy number
   downstream becomes fiction.
5. **Determinism.** `--seed 42` everywhere (`config.SEED`). A sweep that cannot be re-run to
   the same number is not a measurement.
6. **No promised numbers.** A phase states *what it will measure* and *what decision each
   outcome drives*. "Expected to improve occupancy by X %" is not an acceptance criterion and
   must not appear in any phase file, commit message or STATUS row.

## Phases and dependencies

Execution is **sequential**. The ordering is deliberate: the two phases that need no GPU come
first, because they decide whether the expensive retrain is worth running at all.

| Phase | File | Concern | GPU? | Depends on |
|---|---|---|---|---|
| 00 | `00-occupancy-threshold.md` | tunable `occupancy_thr`, swept on the harness — no training | **No** | — |
| 01 | `01-hard-occupied-mining.md` | mine `hard_occupied` misses, wire into the dataset build | **No** | 00 (uses its sweep tooling; the mining itself is independent) |
| 02 | `02-two-class-model.md` | train `{empty, occupied}` from collapsed labels; weighting + focal | **Yes** | 01 (the mined set is part of the training data) |
| 03 | `03-two-class-consumption.md` | Python + Kotlin consume a 2-class model; D04c-2 prerequisite | **No** | 02 (a model to consume) |
| 04 | `04-attention-analysis.md` | Grad-CAM / reliance on the systematic per-square failures | No (CPU is enough) | 00 (needs the per-square offender list) |
| 05 | `05-real-data-harvest.md` | record → slice → ingest → retrain from the user's real board | **Yes** (retrain) | 03 (ship the 2-class model first, then feed it) |

**Phases 00 and 01 cost no GPU time and no training run.** They are the cheap ones and they
gate the expensive ones: if the threshold sweep alone recovers most of the misses, phase 02's
retrain is a smaller and better-targeted job; if it does not, phase 00 has at least produced
the miss/phantom curve that tells phase 02 what to optimise.

Phase 04 may be run **in parallel with 02** by a second agent — it owns disjoint files
(analysis scripts and a report section) and its output is an input to 02's next iteration,
not to its first.

## What each phase file carries

Why / Files you own / Design (decided — do not redesign) / Steps with named conventional
commits / Tests / Acceptance criteria (grep- or command-checkable) / Do NOT. If a phase file
and this entry disagree, this entry wins for scope and constraints; the Python source wins
for behaviour.

## Protocol for implementing agents

- Work on branch **`android-rewrite`**. Never commit to `main`.
- **Implementing agents do NOT `git commit`.** The orchestrator reviews and commits with the
  names given in each phase's Steps. Leave the working tree with your changes in place and
  `STATUS.md` updated.
- **Trust the code over this spec** when they disagree — line-number anchors are paired with
  symbol names and may have drifted. Record every discrepancy in this pack's `STATUS.md`.
- If blocked, **STOP**, write the blocker to `STATUS.md`, do not improvise. In particular: do
  not invent a threshold, a class list or a loss function that no phase file names.
- Update your row in `STATUS.md` (`todo → in_progress → done`) and append a session-log line
  when done, including the measured numbers your acceptance rests on.
- **FROZEN — do not modify:** `android-legacy/**`, `tests/data/testclips/**` (the ground
  truth), `core-engine/src/test/resources/parity/**` (the parity fixtures),
  `scripts/emit_parity_fixtures.py`, `specs/**` except this pack's `STATUS.md` and the two
  sanctioned edits named in constraint 2 (`specs/17-android-rewrite/entry.md`'s seam block
  and `specs/17-android-rewrite/STATUS.md`).
- Do not read `android-legacy/**` for logic.

## Build & test contract

- Shell: **PowerShell** for Gradle — `cd android; .\gradlew.bat <task>`. Git-bash mangles the
  wrapper.
- Python: `uv run pytest -q` must be green (note: `tests/test_camera.py` has 3 pre-existing
  failures on this working tree — verify by stashing before blaming your change).
  `uv run ruff check src tests scripts synth` is the lint gate.
- Kotlin, scoped and once at the end of your phase:
  `.\gradlew.bat :core-engine:test`, `:core-cnn:testDebugUnitTest`, `:app:testDebugUnitTest`,
  then `:<module>:ktlintFormat` and `:<module>:detekt` (zero findings; no `@Suppress`, no
  baseline additions).
- The harness run is **opt-in and slow** (18 videos × ONNX CPU). Budget it; run it once per
  measurement point, and record the numbers in `STATUS.md` rather than re-running to recall
  them.

## Reference index

| Concern | Path |
|---|---|
| Observation model (Python) | `src/chesslab/move_tracker/cnn_recovery.py` — `OccupancyObservation` `:30`, `occupied` `:43`, `confident` `:46`, `label_confident` `:54`, `observation_from_probs` `:63` |
| Observation model (Kotlin) | `android/core-cnn/src/main/kotlin/com/chesslab/cnn/OccupancyObservation.kt`, `Observations.kt` |
| Engine seam | `android/core-engine/src/main/kotlin/com/chesslab/engine/api/CnnObservation.kt` |
| `has_identity` | `tracker.py:1961`; Kotlin `CnnTick.kt:43`, `Alarm.kt:77` |
| Defaults | `src/chesslab/config.py` — `CLASSES` `:18`, `OPTIONAL_CLASSES` `:27`, `TRACK_DEFAULTS` `:590-646` |
| Class list assertion (Kotlin) | `android/core-cnn/.../Preprocess.kt::EXPECTED_CLASSES` `:14`, `requireExpectedClasses` `:40`; `app/.../cnn/ModelSpec.kt:46` |
| Dataset build | `src/chesslab/dataset_build.py::build_dataset` (hard-empty wiring `:299-307`) |
| Class balance / split | `src/chesslab/dataset.py` — `subsample_classes` `:90`, `compute_class_weights` `:146`, `make_split` `:202`, `validate_split` `:269` |
| Training | `src/chesslab/training/train.py` — `classes = split["classes"]` `:149`, loss `:263-264`; `torch_data.py::class_weights_tensor` `:323`; `model.py::HierarchicalHead` `:150`, `build_model` `:230` |
| Hard negatives | `scripts/mine_hard_empty.py`, `data/manifests/hard_empty.jsonl` (89 real) + `hard_empty.synthetic.jsonl` (697) |
| Attention | `src/chesslab/training/gradcam.py` (`gradcam_for_run` `:151`, `reliance_for_run` `:219`), `scripts/gradcam.py`, `chesslab reliance` |
| Export | `chesslab export --run <dir> --fmt onnx` (`training/evaluate.py::run_export`), `chesslab quantize` (`training/quantize.py`) |
| Harness | `android/app/src/test/kotlin/com/chesslab/tracker/sim/` — `CnnClipSimulationTest`, `ObsAudit`, `SimClips`, `ClipRun`, `ClipPipeline` |
| Python clip replay | `scripts/replay_clip.py::replay` |
| Measured context | `specs/17-android-rewrite/STATUS.md` §§ *CNN clip simulation*, *Python CNN cross-check*, *Veto escalation + overrule threshold* |
