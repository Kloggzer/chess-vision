# 19 — Live hardening: what a real recorded game exposed

> Entry file for the spec pack. Every implementing agent reads **this file completely**,
> then exactly the phase file assigned to it. Python (`src/chesslab/move_tracker/tracker.py`)
> remains the source of truth for tracker behaviour; the Kotlin engine is a 1:1 port and
> must stay one.

## What this is

A 66-second recording of a real game (1080×1920, 30 fps, ArUco markers visible, standard
start position) was replayed through the Python tracker. It committed ten plies:

```
d4 d5 Kd2 Nf6 Nc3 Nc6 e4 dxe4 Nxe4 Nxe4+
```

`Kd2` is a phantom. Every genuine move scored `best ≥ 22.0` with a second-best margin
≥ 9.3; the phantom scored **8.6 with a margin of 3.1**. Its changed squares were
`f1, e1, g1, e2` — `d2`, the square a king would have arrived on, was not among them.
The real move at that moment was `Nf3`.

Four things were measured and **ruled out** as the cause. Do not re-litigate them:

| Hypothesis | Verdict | Evidence |
|---|---|---|
| Frame rate too low | **Rejected** | Same clip at 30/15/10 fps commits every move within 0.2 s of the same wall time. `motion_hold_s` sets the latency, not fps. |
| `motion_thr = 0.25` mis-tuned | **Rejected** | Motion is bimodal: 69 of 81 quiet ticks are < 0.01, the lowest moving tick is 0.29. The threshold sits in the gap. A motionless hand produces zero frame-to-frame difference by construction — no threshold can find it. |
| Occlusion veto broken | **Rejected** | 933 frames in state `occluded`, 907 of 1975 frames with a live veto, and 0 vetoed squares at every commit — because by then the board really is clear. A keep-alive of 1.0 s changes the committed moves not at all. |
| Shorter `motion_hold_s` | **Rejected, and it regresses** | 0.1 / 0.2 / 0.3 all cost `blender-scholars` its mate (`Qxf7#`). Default stays 0.4. |

What survived, and what phase 00 must nail down:

```
phantom   cand=e1d2       z: f1=15.7  g1=11.1  e2=8.1  d2=7.4  e1=7.3
next      cand=g8f6 g1f3  z: f1=14.8  g8=14.7  g1=9.8  f3=7.1
```

`f1` is the strongest changed square in **two consecutive decisions** and belongs to
neither move. A standing z of ~15 on a square nothing happened on is a **poisoned
reference**. Second pattern, visible across all eight commits: **origin squares outscore
destination squares** (real `Nf3`: g1 = 9.8, f3 = 7.1) — a piece leaving is reliably
seen, a piece arriving often is not.

Alongside the tracker work, four Android/CNN defects found in the same session are fixed
here because they are cheap, independent, and already diagnosed.

---

## Phases

| Phase | File | Concern | Depends on | Scope (files it may touch) |
|---|---|---|---|---|
| 00 | `00-poisoned-reference.md` | **Measure** why `f1` stands at z≈15; classify origin-vs-destination asymmetry. **Fixes nothing.** | — | `specs/19-live-hardening/STATUS.md` only, plus throwaway scripts under `scratch/` |
| 01 | `01-cnn-runtime.md` | ORT session configuration, XNNPACK, fixed batch dim, profiling off, steady-state measurement | — | `android/app/src/main/kotlin/com/chesslab/tracker/cnn/**`, `android/app/build.gradle.kts`, `android/gradle/libs.versions.toml` |
| 02 | `02-frame-allocations.md` | Per-frame allocations, engine hot path, three correctness leftovers | — | `android/core-engine/**`, `android/core-geometry/**`, `android/app/src/main/kotlin/com/chesslab/tracker/pipeline/**` |
| 03 | `03-recording.md` | Session recording "doesn't work well" — diagnose, then fix | — | `android/app/src/main/kotlin/com/chesslab/tracker/record/**`, `.../games/**` |
| 04 | `04-cnn-activations.md` | `_convert_bn_to_gn` deletes timm's ReLUs. Code fix + export verification. **No full retrain.** | — | `src/chesslab/training/**`, `tests/test_training*.py` |

**All five phases may run in parallel.** Their file scopes are disjoint — verified: 00
writes only STATUS.md, 01 is `cnn/` + build files, 02 is the engine/geometry/pipeline,
03 is `record/` + `games/`, 04 is Python `training/`. No phase provides a contract another
consumes, so none "lands alone".

---

## Protocol for implementing agents

- **Branch:** `spec-19-live-hardening`. Create it from `main` if it does not exist; never
  commit to `main` directly. All five phases share it.
- **Trust the code over the spec.** Line numbers drift. If a cited anchor is wrong, find
  the symbol by grep, use what the code says, and record the discrepancy in `STATUS.md`.
- **If blocked, STOP** and write the blocker into `STATUS.md` with file, line and what you
  tried. Do not invent a workaround that changes behaviour outside your phase.
- **Commit only files inside your phase's declared scope.** Stage explicitly — never
  `git add -A`. `git status` must show no unrelated files staged.
- Atomic conventional commits exactly as named in your phase's Steps. One concern per
  commit, no drive-by changes.
- Never `--no-verify`, never `--force`, never `git reset --hard` on shared state, never
  amend another agent's commit.

## Memory-constraint contract (non-negotiable)

- Run your tests **once**, **targeted** to your module. Examples:
  `.\gradlew.bat :core-engine:test --tests "*YourTest*"`,
  `.venv/Scripts/python.exe -m pytest tests/test_training.py -q`.
- **Do NOT run the full gate.** No repo-wide `pytest`, no `pytest -m clips`, no
  `assembleDebug`, no `:app:testDebugUnitTest` unless your phase owns `:app`. The
  orchestrator runs the merged gate.
- The shared tree may not compile mid-phase — another agent is always half-done. If your
  module transiently fails to compile because of a file you do not own, gate in an
  isolated `git worktree` at HEAD plus your own files, and say so in your report. **Never
  edit another phase's file to go green.**

## Heavy-compute contract (hard limit)

Renders, training runs, dataset builds and exports run **one worker, minimum size, never
fan out**. This is not a performance preference — an unattended full-tilt render has
crashed this machine before. Phase 04 in particular: you may run a **short** convergence
check (a few hundred steps), you may **not** launch a full retrain. If a phase's
acceptance seems to need a long run, STOP and record it in `STATUS.md` as a decision for
the user.

## Repo rules you must not violate

- **`config.py` is the ONLY source of tracker defaults.** `TRACK_DEFAULTS` in
  `src/chesslab/config.py`, the `MoveTracker.__init__` signature and
  `TrackerConfig` (Kotlin) must agree; `tests/test_move_tracker.py::test_tracker_direct_defaults_match_config`
  enforces it. Changing a default means changing all three.
- **`ClipReplayParityTest` must stay 18/18 clips, 969 frames, zero divergence.** It is the
  proof that the Kotlin engine is a faithful port. If your change moves it, you have
  changed engine behaviour — stop and record it.
- **`pytest -m clips` is the gate for any tracker threshold change.** 19/20 is not green.
  It takes ~7 minutes; the orchestrator runs it, not you.
- **The parity fixtures pin their own `effectiveConfig`.** A changed Kotlin default does
  not move them — that is by design, and it is why a default change still needs the clip
  suite on the Python side.
- **`:core-engine` is pure JVM.** No OpenCV, no Android, no ONNX, no wall clock
  (`System.currentTimeMillis` / `Instant.now` / `nanoTime` are grep-banned there — its only
  notion of time is `FrameInput.timestampMs`). `ClasspathPurityTest` enforces this.
- **Corner order is `[a8, h8, h1, a1]`** everywhere; squares are `a1`..`h8`.
- Code, comments and docs are **English**.

## Dependency management

All dependencies go through the ecosystem's manifest: `pyproject.toml` + uv on the Python
side, the Gradle version catalog (`android/gradle/libs.versions.toml`) on the Android side.
Never vendor a jar, never hand-edit a lockfile. Phase 01 changes an artifact coordinate —
that is expected and belongs in the catalog. Any dependency not named in a phase spec
needs a `STATUS.md` note with justification.

## Static analysis

- Android: **ktlint + detekt**. Run `.\gradlew.bat :<yourModule>:ktlintCheck :<yourModule>:detekt`
  once at the end. Zero NEW findings. Use `ktlintFormat` for style — do not hand-edit
  formatting findings. **Do not add `@Suppress` or baseline entries to get green**; if a
  rule genuinely cannot be satisfied, record it as a blocker.
- Python: **ruff**. `.venv/Scripts/python.exe -m ruff check <your files>`.
- If a linter threshold forces an unnatural shape (a parameter-object type invented purely
  to satisfy `LongParameterList`), that is a smell to surface in `STATUS.md`, not a design.

## Ownership registry

**This table overrides any phase file that disagrees with it.**

| File | Owned by | May be extended by | Notes |
|---|---|---|---|
| `specs/19-live-hardening/STATUS.md` | all | all | Append-only per phase; one section per phase, never rewrite another's. |
| `android/app/src/main/kotlin/com/chesslab/tracker/cnn/OrtSessionRunner.kt` | 01 | — | |
| `android/app/src/main/kotlin/com/chesslab/tracker/cnn/OnnxSquareClassifier.kt` | 01 | — | |
| `android/app/build.gradle.kts`, `android/gradle/libs.versions.toml` | 01 | — | 02/03 must not touch the build files. |
| `android/core-geometry/src/main/kotlin/com/chesslab/geometry/Warp.kt` | 02 | — | |
| `android/core-engine/src/main/kotlin/com/chesslab/engine/EngineState.kt` | 02 | — | |
| `android/core-engine/src/main/kotlin/com/chesslab/engine/FrameLoop.kt` | 02 | — | |
| `android/app/src/main/kotlin/com/chesslab/tracker/pipeline/**` | 02 | — | |
| `android/app/src/main/kotlin/com/chesslab/tracker/record/**` | 03 | — | |
| `android/app/src/main/kotlin/com/chesslab/tracker/games/**` | 03 | — | |
| `src/chesslab/training/model.py` | 04 | — | |
| `src/chesslab/config.py` | **nobody in this pack** | — | Frozen. A default change needs the clip suite; that is a separate decision. |
| `src/chesslab/move_tracker/tracker.py` | **nobody in this pack** | — | Frozen. Phase 00 measures it, does not edit it. |
| `scripts/sweep_clip_params.py` | 00 (read-only use) | — | Existing deterministic harness — use it, do not rewrite it. |

## Artifact authority

- **The clip manifest and the 18 committed parity fixtures are authoritative.** No phase
  regenerates them. If your change would require regenerating fixtures, it is out of scope.
- **The CNN model assets under `android/app/src/main/assets/cnn_model/`** are owned by
  phase 01 for shape/metadata edits only. Phase 04 does not touch them — it fixes the
  training code and verifies the EXPORT, and a new trained model is a separate decision.

## Definition of done (per phase)

1. Every Step's named commit exists on `spec-19-live-hardening`.
2. Your phase's tests are written and pass, run once, targeted.
3. Your module's ktlint/detekt (or ruff) is clean of NEW findings.
4. `STATUS.md` has your phase's section filled in: what you changed, every discrepancy
   against this spec, every measurement (including negative results), and any blocker.
5. **Honest negative results are an expected outcome.** "This did not improve the metric"
   is a complete and acceptable finding. Do not narrate a win.

The **orchestrator** runs the merged gate: full `pytest`, `pytest -m clips`, all Gradle
module tests including `ClipReplayParityTest`, `ktlintCheck`, `detekt`, `assembleDebug`.
