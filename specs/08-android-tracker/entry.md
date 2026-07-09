# 08 — Android tracker (Kotlin): production port of `chesslab track`

> Entry file for the spec pack. Every implementing agent reads THIS file completely,
> then exactly one phase file. The Python tracker is the reference implementation and
> stays untouched; the Android app in `android/` becomes the production tracker.

## What this is

Port the move tracker (`src/chesslab/move_tracker/tracker.py`, 2712 lines) to a
Kotlin Android app: phone mounted top-down over the board, on-device detection
(diff + census + shadow veto + legality, optional ONNX CNN safeguard), Jetpack
Compose Material 3 UI with first-class accessibility, all tuning behind a
settings screen, dynamic camera resolution on uncertainty, and an optional LAN
spectator server.

Reference docs: `docs/move-tracker-flow.md` (pipeline Mermaid + threshold table),
`config.TRACK_DEFAULTS` (`src/chesslab/config.py:455-492`).

## Feature analysis: port / change / drop / new

### Port unchanged (algorithm + default values verbatim from Python)

| Feature | Python anchor |
|---|---|
| Per-square integral-image diff + median normalization + z-scores (`SquareNoise`, EMA α=0.05, init_std=6.0, std_floor=3.0) | `tracker.py:88,375,403-419` |
| Motion gate: % pixels with abs diff > `motion_px_thr` 20.0, `motion_thr` 0.25 %, ROI margin 0.10, `motion_hold_s` 0.4 | `tracker.py:299,826` |
| CLAHE preprocessing, clip 2.0, tile 8 | `tracker.py:788`, `config.py:74` |
| HSV cast-shadow veto (Cucchiara: v_lo 0.35, v_hi 0.97, h_tol 15, s_tol 40, frac 0.5) | `tracker.py:198` |
| Census transform 3×3 structural confirm, `census_thr` 160 | `tracker.py:141,161` |
| Opaque color-occlusion gamut (Lab a\*/b\* + HSV S, NN Mahalanobis, thr 1.5σ) | `tracker.py:225,263` |
| Log-likelihood move scoring over `legal_moves` (z_thr 3.0, k 1.0, clip ±12), viability z ≥ z_thr/2 | `tracker.py:423-459` |
| Pair look-ahead (fast play), ambiguity margin 2.0, move prior tie-break (capture +0.5, check +0.3, forward +0.2) | `tracker.py:442,476,2239` |
| Confirmer voting (confirm_frames 1 with CNN / 2 without) | `tracker.py:518,603` |
| Guards: pending-verify, base-truth FEN↔ref-image coupling, corner-jump 6 px | `tracker.py:2075-2090,1696` |
| Re-anchor rule (`reanchor_ll_floor` −4.0), anomaly patcher (nudge 5 s / drift 30 s) | `tracker.py:2011,2303` |
| `max_changed` 6 (+2 slack), hand-squares ALWAYS count toward max_changed (invariant) | `tracker.py:2158` |
| Motion prerequisite for moves (`motion_recency_s` 20 s) | `tracker.py:2052` |
| Decision provenance per move (decider, reason, scores, margin, vetoed squares) | `tracker.py:1777` |
| Undo = hard-negative feedback record | `tracker.py:2673,1818` |
| CNN safeguard semantics: non-blocking worker, verify LOCAL occupancy of touched squares only (not whole-board), reliable-axis (empty class), recovery beam search (plies 4, beam 8) | `cnn_recovery.py:149,188,285`, `tracker.py:1214,1414,1266` |

### Change for Android

| Python | Android |
|---|---|
| ArUco per-frame corner detection (`calibration.py:790`) | **Dropped.** Manual 4-corner tap calibration (order a8,h8,h1,a1) is primary; markerless line detector is the experimental assist (phase 02). |
| OpenCV `VideoCapture` + `LatestFrame` URL wrapper (`camera.py:113`) | CameraX `ImageAnalysis` with `STRATEGY_KEEP_ONLY_LATEST` (native grab-latest). |
| No capture-resolution control | Explicit resolution setting + **dynamic resolution escalation on uncertainty** (phase 03). |
| python-chess legality | `com.github.bhlangonijr:chesslib` (Apache-2.0, GPL-compatible). |
| FastAPI web UI, MJPEG + polling | Jetpack Compose Material 3 in-app UI (phase 04); LAN spectator server via Ktor is the remote-view replacement (phase 06). |
| CLI flags → constructor params | Everything user-relevant becomes a DataStore-backed setting (phase 04); engine takes an immutable `TrackerConfig`. |
| PyTorch/ONNX-Runtime desktop inference | ONNX Runtime Android, same exported `model.onnx` (opset 17) (phase 05). |
| Stockfish analysis sidecar (`analysis.py`) | **Dropped** from v1. |
| Session recording → dataset slice pipeline | App records raw session (frames + FEN + corners JSONL) for **export to desktop**; no on-device slicing (phase 07). |

### New (no Python counterpart)

- Dynamic camera: temporary high-res `ImageCapture` snapshot when uncertainty
  signals fire (low margin, verify pending, recovery trigger) — phase 03.
- Accessibility: TalkBack move announcements, ≥48 dp targets, WCAG AA contrast,
  dynamic type — phase 04.
- Settings screen incl. **look-forward** (pair look-ahead on/off + ambiguity
  margin), resolution, all live-tunables — phase 04.
- LAN spectator server (Ktor + mDNS) — phase 06.
- PGN share/export — phase 07.

## Repository layout (decided)

```
android/                       # Gradle root (Kotlin 2.x, AGP 8.x, JDK 17)
  settings.gradle.kts
  engine/                      # PURE KOTLIN/JVM module — no Android deps.
    src/main/kotlin/com/chesslab/engine/...
    src/test/kotlin/...        # JUnit5 unit tests run on desktop JVM
  app/                         # Android application module (Compose M3, CameraX)
    src/main/kotlin/com/chesslab/tracker/...
```

`engine/` holds the full detection pipeline operating on plain
`GrayImage`/`FloatArray` abstractions so it is unit-testable without a device or
OpenCV. `app/` provides camera, OpenCV-backed warp, UI, storage.

## Phases and dependencies

| Phase | File | Concern | Depends on | Parallel group | Model |
|---|---|---|---|---|---|
| 00 | `00-scaffold.md` | Gradle project, modules, deps, CI checks | — | — | codewhale |
| 01 | `01-engine.md` | TrackerEngine: pipeline port, pure Kotlin | 00 | A | **fable** |
| 02 | `02-geometry.md` | Warp, manual calibration, markerless detector (experimental) | 00 | A | opus |
| 03 | `03-camera.md` | CameraX, grab-latest, resolution + dynamic escalation | 00 | A | opus |
| 04 | `04-ui.md` | Compose UI, accessibility, settings (look-forward, resolution) | 01, 02, 03 | — | opus |
| 05 | `05-cnn.md` | ONNX Runtime safeguard (verify + recovery) | 01, 04 | B | **fable** |
| 06 | `06-spectator-server.md` | LAN spectator server (Ktor, mDNS) | 04 | B | codewhale |
| 07 | `07-recording-export.md` | Session recording, PGN export, feedback records | 04 | B | codewhale |

Model rationale: 01 and 05 carry the algorithmic risk (2700-line pipeline port
with exact-semantics invariants; verify/recovery logic) → fable. 02/03/04 are
substantial but well-specified Android work → opus. 00 is mechanical and 06/07
are self-contained, well-bounded features → codewhale (~sonnet-level, faster
than haiku for this; `codewhale exec
--auto`; **commit all work first** — codewhale reverts out-of-scope changes on
exit — and no parallel codewhale runs on uncommitted state). Fable/opus review
codewhale output before commit.

Phases 01/02/03 run **in parallel** (disjoint packages). Phases 05/06/07 run in
parallel after 04. Only 04 integrates; it owns `app/src/main/kotlin/com/chesslab/tracker/ui/**`
and the `TrackerService` wiring — 05/06/07 must not edit UI files except the
single extension points 04 defines.

## Git hygiene (binding for every agent)

- One branch for the whole pack: `android-tracker`. Never commit to `main` directly.
- Atomic conventional commits exactly as named in your phase's Steps — one concern
  per commit, no drive-by changes outside your phase's file scope.
- Stage explicitly (`git add <paths>`), never `git add -A`/`git add .` — parallel
  phases share the worktree. `git status` must show no unrelated files in your commit.
- Phase 00 commits the `android/.gitignore` (`.gradle/`, `build/`, `local.properties`,
  `.idea/`) BEFORE any Gradle run so build artifacts never enter history.
- Never: `--no-verify`, force-push, amend/rebase of pushed or foreign commits,
  `git reset --hard` on shared state. Failing hook/gate → fix the cause or STOP
  and record the blocker in `STATUS.md`.
- codewhale phases: commit ALL work before `codewhale exec` (it reverts
  out-of-scope changes on exit); no parallel codewhale runs on uncommitted state;
  codewhale itself must not commit — the supervisor reviews and commits.

## Static code analysis (binding)

- Phase 00 sets up **ktlint** (via `org.jlleitschuh.gradle.ktlint`) and **detekt**
  on both modules, default rulesets, baselines empty.
- **Dead-code detection is on:** detekt config enables the unused-code rules
  (`UnusedPrivateMember`, `UnusedPrivateProperty`, `UnusedParameter`,
  `UnusedImports` — active: true in `detekt.yml`); Android Lint's
  `UnusedResources`/`UnusedIds` are error-severity in `app/lint.xml`. Public API
  in `:engine` that nothing consumes yet is allowed ONLY if a later phase is
  named as the consumer in a KDoc comment (e.g. `Consumed by phase 05`).
- Every phase runs, once at the end, scoped to its module(s):
  `./gradlew :engine:ktlintCheck :engine:detekt` and/or the `:app:` equivalents
  (debug variant only). Zero NEW findings — do not suppress with `@Suppress`
  or baseline additions to get green; fix or STOP with a blocker.
- Android Lint (`:app:lintDebug`) is run by the orchestrator in the full gate,
  not by phase agents (memory contract).

## Dependency management (binding)

- ALL dependencies come from the Gradle **version catalog**
  (`android/gradle/libs.versions.toml`) resolved from Maven Central / Google Maven —
  the catalog is the single source, like `pyproject.toml` on the Python side.
- Never vendor jars/AARs, copy SDK sources into the repo, or add `flatDir`/`libs/`
  directories. OpenCV specifically is the Maven Central AAR `org.opencv:opencv:4.10.0`,
  NOT the manually-imported SDK module.
- Adding a dependency = one catalog entry + one `implementation(libs.x)` reference;
  pin exact versions (no `+` ranges). New dependencies outside your phase's spec
  require a STATUS.md note with justification and license (GPL-compatible only).

## Protocol for implementing agents

- Git hygiene section above applies verbatim.
- Trust the Python code over this spec when they disagree — the anchors are the
  truth; record every discrepancy in `STATUS.md` under "Discrepancies".
- If blocked (missing dependency, failed assumption), STOP, write the blocker to
  `STATUS.md`, do not improvise around it.
- Update your phase row in `STATUS.md` (`todo → in_progress → done`) and append a
  session-log line when you finish.
- The Android app is GPL-3.0-or-later like the repo. Do not add dependencies
  with GPL-incompatible licenses.
- Do not touch `src/chesslab/**` (Python) — reference only.

## Memory-constraint contract (non-negotiable)

- Run tests **once, targeted**: `cd android && ./gradlew :engine:test --tests "com.chesslab.engine.<YourClasses>*"` for engine work; `./gradlew :app:assembleDebug` ONLY in phase 00 and 04.
- Do NOT run full `./gradlew build`, lint-all, connected/instrumented tests, or
  the Python suite — orchestrator's job at the end.
- No emulator/device interaction inside a phase agent.

## Definition of done (per phase)

Phase acceptance criteria all pass, named commits exist, `STATUS.md` updated.
The orchestrator runs the full gate afterwards: `./gradlew :engine:test :app:assembleDebug
:engine:ktlintCheck :app:ktlintCheck :engine:detekt :app:detekt :app:lintDebug`
plus repo Python gates (`uv run pytest -q`, `uv run ruff check src tests synth`)
to prove nothing Python-side changed.
