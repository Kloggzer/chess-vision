# 52 — The harness runs what ships

> **Status:** `todo`. Five phases, mostly sequential. 00 lands alone — it publishes the types the
> rest code against.

## What this is

`scripts/label_real_game.py` turns filmed footage into a reviewable move list. It drives the
**Python** tracker (`src/chesslab/move_tracker`, via `scripts/replay_clip_cnn.py::run`). The phone
runs `:core-engine`. So the one artefact whose entire purpose is *"what does the tracker do on real
footage"* has never been produced by the tracker that ships.

This pack moves the whole tool to Kotlin, on top of `:core-engine`, `:core-geometry` and the real
ONNX model, and retires the Python script.

**This is not a hypothetical divergence.** Two fidelity defects are already on record, one per
harness:

- `scripts/replay_clip_cnn.py:116-122` — its own comment: the observer warps and box-downsamples on
  a different path from `_loop`, "a latent divergence from the invariant".
- specs/41 — `ClipDriver` built its profile with `CropParams.default` (`pad_side` 0.10) while the
  `phone` profile serves 0.05, which desynced the CNN three seconds into the 2026-08-02 game.

And one defect found on 2026-08-06 while reviewing the existing candidate, which this pack's phase 02
must not reproduce:

> `data/realgames/game-2026-08-02/frames/000168.jpg … 000172.jpg` are **byte-identical** to
> `000228.jpg … 000232.jpg`, and pixel-comparison against the decoded video shows the *later*
> indices are the correct ones. The writer paired current frames with stale indices. The design's
> stated reason for writing frames during the decode — `_ReviewFrames` docstring, "a review page
> that sought would show a NEARBY frame while claiming it is the one" — is defeated by its own
> implementation.

## Phases

| Phase | Concern | Depends on | Parallel? |
|---|---|---|---|
| 00 | a clip with no ground truth, and how the tool is invoked | — | **lands alone** |
| 01 | geometry measured by `:core-geometry` | 00 | with 02 only after 00's types are committed |
| 02 | the candidate file and its review frames | 00, 01 | after 01 |
| 03 | adopt, the manifest entry, and retiring the Python | 02 | after 02 |
| 04 | what the shipping engine actually does on the 2026-08-02 game | 03 | last; measurement only |

Sequential in practice. 00 must be **complete and committed** before any other phase starts: it
publishes `RealGameSource`, `RealGameResult` and the invocation mechanism, and the others compile
against them.

## The constraint that shapes everything

**`:core-geometry` and `:core-cnn` are `com.android.library` (AAR), not `java-library`.**
`core-geometry/build.gradle.kts` says why: `org.opencv:opencv` is an AAR and "a plain JVM module
cannot consume" it. `:core-engine` alone is `java-library`.

**Consequence: do NOT create a JVM module for this tool.** It cannot depend on the geometry or CNN
it needs. The harness stays in **`:app`'s unit-test source set**, which already has the AAR
classpath plus JavaCV/FFmpeg (`app/build.gradle.kts:192-196`, `testImplementation(libs.javacv)`),
and is invoked by system properties exactly as the sim harness already is
(`chesslab.sim`, `chesslab.sim.clips`, `chesslab.sim.models`, declared at `app/build.gradle.kts:78-92`).

## What already exists — reuse it, do not rewrite it

| Piece | Where | What it gives you |
|---|---|---|
| mp4 → `org.opencv.core.Mat` | `sim/ClipFrames.kt:24` `forEachFrame(video) { index, mat -> }` | streamed decode, 0-based index, row-padding handled |
| the phone's engine over a clip | `sim/ClipRun.kt:81` `runClip(clip, cnn)` | `TrackerEngine`, `attachCnn`, device observation pacing, `SimCommit(frame, san, decider)` at `:44` |
| config from a fixture | `sim/SimClips.kt:226` `trackerConfigOf(cfg)` | every field read from the fixture, never a Kotlin default |
| ArUco + markers | `core-geometry/Aruco.kt`, `core-geometry/MarkerTracker.kt` | the detector the phone uses |
| the crop contract | specs/45 (in flight) — `ModelSpec.padSide/padUp`, `withCropOf` | do not hand-build `CropParams`; take the model's |
| the file contract | `data/realgames/<name>/candidate.json` | consumed by `src/chesslab/web/routers/realgames.py`; **unchanged by this pack** |

## Artifact authority

- **`candidate.json`'s schema is owned by phase 02.** Its keys are fixed by the existing consumer
  (`web/routers/realgames.py`) and by the file on disk today: `name`, `video`, `confirmed`,
  `created_at`, `source`, `effective_config`, `geometry`, `clock`, `start_fen`, `moves[]`, `note`,
  `observations`, `frames`, `frames_written`. A phase needing a key phase 02 does not emit records a
  gap in `STATUS.md` — it never invents one.
- **The `geometry` and `clock` blocks are owned by phase 01**; phase 02 serialises what 01 emits.
- **The manifest entry shape is owned by phase 03** and must match what
  `sim/SimClips.kt:142 simClips()` actually parses — read that function, not the YAML by eye.

## Ownership registry — overrides any phase file that disagrees

| File | Created by | May be extended by | Notes |
|---|---|---|---|
| `app/src/test/kotlin/.../sim/RealGame.kt` | 00 | 01, 02 | the source type, the result type, the entry point |
| `app/src/test/kotlin/.../sim/RealGameGeometry.kt` | 01 | — | quad, spread, clock, refusals |
| `app/src/test/kotlin/.../sim/RealGameCandidate.kt` | 02 | 03 | JSON + review frames |
| `app/src/test/kotlin/.../sim/RealGameAdopt.kt` | 03 | — | manifest entry |
| `app/src/test/kotlin/.../sim/LabelRealGameTest.kt` | 00 | 01, 02, 03 | the property-driven entry point; ONE such test class |
| `sim/ClipRun.kt`, `sim/ClipFrames.kt`, `sim/SimClips.kt` | (exists) | 00 only | 00 may widen them; 01-04 must not |
| `scripts/label_real_game.py` | (exists) | 03 deletes it | nobody else touches it |
| `tests/data/testclips/manifest.yaml` | (exists) | 03 only | append only |

## Protocol for implementing agents

- Branch: `specs-52-harness-runs-what-ships`. Never commit to `main`.
- Atomic conventional commits, exactly as named in each phase's Steps. Stage explicitly; never
  `git add -A` across scopes.
- **Trust the code over this spec.** Where they differ, the code wins — implement what is correct
  and record the discrepancy in `STATUS.md`. Every line here was grepped on 2026-08-06, but line
  numbers drift.
- If blocked, **STOP** and write the blocker into `STATUS.md`. Do not invent a workaround that
  changes another phase's contract.
- Never `--no-verify`, never `--force`, never amend another agent's commit.

## Memory and compute contract

- Run tests **once**, targeted: `gradlew.bat :app:testDebugUnitTest --tests "*<YourTest>*"`.
  Do NOT run the full Android gate, `assembleDebug`, or the emulator — that is the orchestrator's job.
- **Decoding a 5-minute 1080p video with the CNN attached is minutes of CPU.** One run at a time,
  never in parallel, never as a benchmark loop. This machine also runs the user's games and an
  unattended full-tilt job has crashed one. Phase 04 is the only phase that runs the full video;
  every other phase uses a short clip from `tests/data/testclips/`.

## Static analysis

- `gradlew.bat :app:ktlintFormat` first — the formatter owns style, your effort goes to logic.
- Then `gradlew.bat :app:ktlintCheck :app:detekt` once, at the end. **Zero new findings**, and no
  `@Suppress` or baseline entries to get green: fix the cause or record a blocker.
- Thresholds are deliberate and documented at `android/config/detekt/detekt.yml:24-39`:
  `LongParameterList` 8/8, `TooManyFunctions` 15 everywhere. **Check your signatures against these
  before writing them** — do not let the linter invent holder types for you. If a threshold is
  genuinely wrong for this code, say so in `STATUS.md` rather than working around it.
- Note `DpLiteralGuardTest` and the `ClasspathPurityTest` in `:core-engine` — this pack touches
  neither `ui/` nor `:core-engine` sources, so neither should fire.

## Repo rules you will hit

- **Code, comments and docs in English.** Comments say *why*, never *what*.
- **Keep it lean.** No wrapper types that exist only to satisfy a linter.
- **The corpus is files.** Nothing in this pack writes to `data/sessions/`, `data/manifests/` or
  runs `slice`.
- **`data/` is gitignored** — never commit a video, a frame or a candidate.
- **Gradle reports green on stale tasks.** The orchestrator's final gate uses `--rerun-tasks`.
- Dependencies go through `android/gradle/libs.versions.toml`. This pack should need **no new
  dependency**: JavaCV, FFmpeg, bytedeco OpenCV and kotlinx-serialization are already on the test
  classpath.

## Definition of done, per phase

1. The phase's named commits exist on the branch.
2. Its named tests exist and pass in one targeted run.
3. `ktlintCheck` + `detekt` for `:app` are clean of NEW findings.
4. `STATUS.md` updated: the phase row, what was found, what the spec got wrong.

The orchestrator runs the full gate on the merged tree:
`gradlew.bat :app:ktlintCheck :app:detekt :core-engine:detekt :core-engine:test :app:testDebugUnitTest --rerun-tasks`
plus `uv run pytest -q`, `uv run ruff check src tests synth`, `uv run vulture` for phase 03's
Python deletion.
