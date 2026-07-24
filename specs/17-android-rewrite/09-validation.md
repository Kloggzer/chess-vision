# Phase 09 — validation, live acceptance, and legacy deletion

> **Orchestrator only.** No implementing agent runs this phase. It is an ordered
> checklist: each step is a gate, and a failing gate is fixed at its cause — never
> bypassed, never baselined, never `--no-verify`.
> Nothing here is optional except where explicitly marked. Step 8 (deleting
> `android-legacy/`) may only run after step 6 has passed **on a real game**.

## Files you own

| File | Contains |
|---|---|
| `android/core-engine/src/test/kotlin/com/chesslab/engine/ClipRegressionTest.kt` | the Kotlin clip replay harness |
| `specs/17-android-rewrite/STATUS.md` | gate results, discrepancies, session log |
| `CLAUDE.md`, `README.md`, `docs/architecture-review/architecture-overview.md` | doc updates (step 8) |
| `specs/08-*/README.md`, `specs/12-android-parity/STATUS.md`, `specs/16-android-correctness-parity/STATUS.md` | superseded markers (step 8) |
| `.gitmodules`, `android-legacy/**` | removal (step 8) |

Everything else is finished work from phases 00–08. If a gate exposes a bug, fix it in the
owning module and record which phase's file it belonged to in `STATUS.md`.

## Why

`specs/12-android-parity/STATUS.md` and `specs/16-.../STATUS.md` both closed with red
gates (`:app:detekt` and `:engine:detekt` RED on branch start) and **no parity test
anywhere**, so none of the ~40 live-tuned thresholds was ever verified against the Python
tracker. That is exactly how the app drifted three specs' worth away from `tracker.py`
without anyone being able to point at the divergence. This phase is the gate that makes
the drift impossible to repeat, and the only thing that licenses deleting the old app.

---

## The checklist (ordered — do not reorder)

### 1. Unit tests, all modules

```powershell
cd android
.\gradlew.bat :core-engine:test :core-geometry:test :core-cnn:test :app:testDebugUnitTest
```

All green. Additionally confirm the structural gates from `entry.md` are actually enforced
and passing, not merely written:

- `ClasspathPurityTest` (00a) — `:core-engine`'s runtime classpath is `chesslib` +
  kotlin-stdlib only.
- Hard rule 2 by grep:
  `grep -rn "synchronized\|Atomic\|@Volatile\|Mutex" android/core-engine/src/main/kotlin/`
  must return **nothing**.
- Hard rule 3 by grep: no `public` declaration in `:core-engine` outside
  `com/chesslab/engine/api/`.

### 2. Static analysis — zero findings, no baselines

```powershell
.\gradlew.bat ktlintCheck detekt
```

Green across **all four** modules. This is the explicit contrast with `specs/16`, whose
STATUS.md recorded `:app:detekt` and `:engine:detekt` RED. Additional assertions:

- `android/config/detekt/baseline.xml` (and any per-module baseline) is either absent or
  empty — `grep -c "<ID>" ` returns 0.
- `grep -rn "@Suppress" android/*/src/main/kotlin/ | wc -l` — every remaining occurrence
  is individually justified in `STATUS.md` with a one-line reason. The target is zero.

### 3. Assemble

```powershell
git submodule update --init android/third_party/stockfish
cd android
.\gradlew.bat assembleDebug
```

The submodule init is mandatory — `app/src/main/cpp/CMakeLists.txt:20-24` hard-fails
without it. The first configure downloads the two NNUE nets and verifies their SHA-256
prefixes; a download failure is a real failure, not a flake to retry blindly.

### 4. Clip regression — Kotlin and Python must produce IDENTICAL move lists

The clips in `tests/data/testclips/` (Blender-rendered, auto-labeled, occlusion-realistic
— `blender-capture`, `blender-castle`, `blender-enpassant`, `blender-hover`,
`blender-illegal`, …) each carry an expected move list in
`tests/data/testclips/manifest.yaml` under `erwartete_zugliste`.

**Python side** (the reference; the existing helper — do not write a new one):

```powershell
uv run pytest -q -m clips tests/test_clips.py
```

`tests/test_clips.py::test_clip_erwartete_zugliste` (`:53`) drives
`scripts/replay_clip.py::replay` through `_replay` (`:33-48`) with `cnn_run=None`
(deterministic, no model dependency), `realtime=True` (the hold/recency parameters are
wall-clock — an unthrottled replay compresses the quiet gaps and behaves nothing like the
live tracker), and the per-clip `tracker:` threshold overrides from the manifest. It then
asserts the SAN history, the end FEN (`expect_fen`), and the optional behaviour fields
(`expect_states`, `expect_occlusion`, `expect_shadow`, `expect_stuck`,
`expect_note_contains`, `expect_game_over`, `expect_result`) via `_assert_behaviour`
(`:81`).

**Kotlin side** — `ClipRegressionTest` in `:core-engine`:

- `:core-engine` cannot decode video and must not (hard rule 1). It replays the
  **committed per-frame fixtures** produced by phase 00b's
  `scripts/emit_parity_fixtures.py`, which runs the same clips through the Python pipeline
  and dumps one `FrameInput` per frame (`grayDet`, `bgrDet`, `corners`, `motionRoiScore`,
  `gridLineCoverage`, `lumaPreClahe`, `timestampMs`) plus the manifest's `start_fen`,
  `tracker:` overrides and expected move list, under
  `android/core-engine/src/test/resources/parity/clips/<clip>/`.
- One JUnit case **per clip** (parameterized by directory), each feeding every frame to
  `TrackerEngine.onFrame` in order with **no CNN snapshots** (matching `cnn_run=None`) and
  collecting `MoveCommitted`/`SequenceCommitted` SANs.
- Assertions, in this order: the SAN list equals `erwartete_zugliste` **exactly** (an
  explicit empty list is a valid target — the hover/phantom clips must produce **no**
  move); the end FEN's first four fields match `expect_fen`; the behaviour fields that
  `_assert_behaviour` checks are asserted from the accumulated `TrackerStatus` trace.
- Wall-clock dependence is handled by driving `timestampMs` from the fixture, not from the
  system clock — the engine must have no other time source (verify: `grep -rn
  "System.currentTimeMillis\|nanoTime" android/core-engine/src/main/kotlin/` returns
  nothing).

```powershell
.\gradlew.bat :core-engine:test --tests "com.chesslab.engine.ClipRegressionTest"
```

**Gate:** for every clip, `Kotlin SANs == Python SANs == erwartete_zugliste`. A single
divergent clip blocks the phase. Record the diverging clip, frame index, and the first
differing `TrackerStatus` field in `STATUS.md` before fixing.

If a clip is skipped on the Python side (`marker: false` — markerless clips wait for
`specs/rework/11`), skip it in Kotlin too, and list the skipped clips in `STATUS.md` so
the coverage gap is explicit rather than invisible.

### 5. Crop parity — the app's 64-crop grid vs Python's `/crops.jpg`

Set the same physical board to one position. Then:

- Python: run `chesslab track` against the same board and fetch `GET /crops.jpg`
  (`tracker.py::cnn_crops_jpeg:3772-3800` — the exact model-input crops, built through
  `serving.crops_for_model`, i.e. byte-identical to what the model receives).
- Android: open the debug menu's **64-crop CNN input grid** (07b, panel 3) and screenshot
  it.

Compare tile by tile: same square order (`all_squares()` = `a1,b1,…,h1,a2,…,h8`,
`entry.md` invariant 11), same framing including `pad_up` (3D pieces overflow their base
cell upward), same photometry, same aspect. A mismatch means the CNN is being fed different
pixels than the model was trained and evaluated on — no threshold tuning fixes that, and it
invalidates every CNN-dependent decision (`cnn_overrule`, verify, recovery, desync alarm).

Attach both images to `STATUS.md`'s session log entry (paths, not blobs).

### 6. On-device live game

Install the debug APK on the target phone, calibrate against the real board, play a **full
real game**. Acceptance, all four:

| Criterion | Where it is read |
|---|---|
| **≥ 15 fps**, median `total` ≤ 66 ms | debug menu → timings panel (07b, panel 1) |
| **No phantom moves** — every committed move was actually played, and no played move was missed | the move list vs the physical board |
| **CNN state shows a real EP** — `ATTACHED` with an actual provider (QNN or NNAPI or CPU), never a silent failure | debug menu → CNN state panel (07b, panel 6) |
| **Sane deciders** — the decision log is dominated by `diff_after_verify` / `cnn_occupancy`; `cnn_recovery` and `cnn_overrule` are occasional, not the norm; no fabricated illegal-move entries | debug menu → decision log (07b, panel 5) |

Export the decision log (07b) and the settings JSON (07a) and reference both from
`STATUS.md`. If tuning was needed to reach acceptance, record **which knobs and why** —
that is the field-tuning record the desktop defaults may need to absorb later.

Run the companion features once each during or right after the game: PGN export (08a),
spectator page from a second device (08b), and speech (08c). Confirm the timings panel does
not move while a spectator is connected.

### 7. Python side still green

```powershell
uv run pytest -q
uv run ruff check src tests synth scripts
```

Both green. The rewrite must not have touched `src/chesslab/**` (frozen by `entry.md`); the
only permitted Python change in this whole pack is `scripts/emit_parity_fixtures.py`
(phase 00b). Verify: `git diff --stat main -- src/` is empty.

### 8. Legacy deletion and documentation (ONLY after step 6 passed on a real game)

```powershell
git rm -r android-legacy
```

Then:

- Remove `android-legacy`'s submodule registration: drop its section from `.gitmodules`,
  remove the corresponding `[submodule …]` block from `.git/config`, and delete
  `.git/modules/android-legacy*`. Verify `git submodule status` lists only
  `android/third_party/stockfish`.
- `CLAUDE.md` — replace the Android pointers with the four-module layout
  (`:core-engine` / `:core-geometry` / `:core-cnn` / `:app`), the parity-test contract, and
  the "Python is the source of truth for behaviour" rule.
- `README.md` — the Android section describes the new app: calibration, tracking, settings,
  debug menu, analysis, games/PGN, spectator, speech; the build command
  (`git submodule update --init` then `cd android; .\gradlew.bat assembleDebug`).
- `docs/architecture-review/architecture-overview.md` — add the module map (Mermaid) with
  the API seam and the "parity-critical code runs on the desktop JVM" rationale.
- Mark superseded, with a one-line pointer to this pack at the top of each:
  `specs/08-*`, `specs/12-android-parity/`, `specs/16-android-correctness-parity/`.
  Do **not** delete them — they are the historical record of what broke and why.
- `STATUS.md` — all rows `done`, every gate result recorded, every discrepancy resolved or
  carried forward with an owner.

Commits for this step:

- `test(android-engine): clip regression — Kotlin replays the committed parity fixtures`
- `chore(android): remove android-legacy and its submodule registration`
- `docs: describe the four-module Android layout; mark specs 08/12/16 superseded`

---

## Rollback

Until step 8 lands, **`android-legacy/` is a working fallback**: it builds, installs, and
tracks (badly, but it tracks). If step 6 fails on a real game and the cause is not
diagnosable from the debug menu, stop, keep `android-legacy/`, record the failure mode in
`STATUS.md` with the exported decision log, and treat the fix as a new phase — do not
delete the fallback to force the issue. After step 8, the rollback is
`git revert` of the deletion commit; note that hash in `STATUS.md`.

## Acceptance criteria

- Steps 1-7 all green, each with its command and result recorded in `STATUS.md`.
- `grep -rn "baseline" android/*/build.gradle.kts` shows no detekt baseline in use, and no
  baseline file contains a finding.
- `.\gradlew.bat :core-engine:test --tests "com.chesslab.engine.ClipRegressionTest"` covers
  every non-skipped clip in `tests/data/testclips/manifest.yaml`, and the skipped set is
  listed in `STATUS.md`.
- `git diff --stat main -- src/` is empty except `scripts/emit_parity_fixtures.py`.
- `git submodule status` lists exactly one submodule.
- `grep -rn "android-legacy" --include=*.md --include=*.kts --include=*.toml .` returns only
  the historical mentions inside `specs/` (this pack included) — no build file, no doc,
  references it as live code.
- `STATUS.md` row 09 `done`, with the live-game session log entry: date, device, number of
  moves, median fps, deciders histogram, and the decision-log/settings-JSON export paths.

## Do NOT

- Do NOT add a detekt/ktlint baseline, a `@Suppress`, or a test `@Ignore` to get a gate
  green. That is precisely how `specs/16` ended red-but-shipped.
- Do NOT weaken a clip's expected move list to make the Kotlin engine pass. The Python
  tracker is the reference; if Kotlin disagrees, Kotlin is wrong until proven otherwise —
  and if Python is genuinely wrong, that is a `STATUS.md` discrepancy and a separate change
  to `src/chesslab/**`, never a quiet manifest edit.
- Do NOT delete `android-legacy/` before a full real game has passed step 6.
- Do NOT delete `specs/08`, `specs/12`, `specs/16` — mark them superseded.
- Do NOT modify `src/chesslab/**` to make a parity test pass.
- Do NOT run the on-device acceptance on the emulator — the EP selection, thermal
  behaviour, and camera timing are the point.
- Do NOT skip step 5 because step 4 passed: the clip fixtures exercise the detection warp;
  crop parity exercises the *other* warp (`entry.md` invariant 1), which no fixture covers.
