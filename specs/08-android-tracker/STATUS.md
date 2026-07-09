# STATUS — 08-android-tracker

> The only hand-off between agents/sessions. Update your phase row and append a
> session-log line when you start/finish. Record blockers and spec-vs-code
> discrepancies here.

## Phase status

| Phase | Concern | Depends on | Model | Status | Agent/session | Notes |
|---|---|---|---|---|---|---|
| 00 | Scaffold (gradle, modules, api types) | — | codewhale | done | codewhale/2026-07-09 | Full gate: :engine:test :app:assembleDebug :engine:ktlintCheck :app:ktlintCheck :engine:detekt :app:detekt all green |
| 01 | TrackerEngine pipeline port | 00 | fable | todo | | parallel group A |
| 02 | Geometry (warp, calibration, markerless) | 00 | opus | done | opus/2026-07-09 | geometry pkg: BoardCorners/CalibrationProfile/CalibrationStore, BoardWarper, BoardDetector (board_corners_from_lines port) + CornerDriftMonitor. Gate `:app:testDebugUnitTest --tests com.chesslab.tracker.geometry.* :app:ktlintCheck :app:detekt` green (15 tests). |
| 03 | Camera (CameraX, dynamic resolution) | 00 | opus | todo | | parallel group A |
| 04 | UI, accessibility, settings, integration | 01, 02, 03 | opus | todo | | |
| 05 | CNN safeguard (ONNX Runtime) | 01, 04 | fable | todo | | parallel group B |
| 06 | LAN spectator server | 04 | codewhale | todo | | parallel group B |
| 07 | Recording + PGN export | 04 | codewhale | todo | | parallel group B |

## Blockers

(none)

## Discrepancies (spec vs code)

| # | Phase | Spec says | Code/ground truth | Impact |
|---|---|---|---|---|
| 1 | 00 | `com.github.bhlangonijr:chesslib:1.3.4` resolved from Maven Central (entry.md) | Artifact is on **JitPack** only, not Maven Central. JitPack repo added to `dependencyResolutionManagement` in settings.gradle.kts. | Low — works; parallel phases just need the repo in their build. |
| 2 | 00 | detekt has `UnusedPrivateProperty` rule (00-scaffold.md) | No such rule in detekt 1.23.x; coverage provided by `UnusedPrivateMember`. Config excludes the nonexistent rule to avoid validation error. | None — same effective checks. |
| 3 | 02 | Design sketch types `BoardCorners`/`CalibrationProfile` use `android.graphics.PointF`. | Used a plain serializable `Point(x,y)` value type instead. `PointF`'s constructor throws in plain JVM unit tests (stubbed `android.jar`), and the memory contract bans Robolectric/instrumented tests — a plain type is the only way the required `forResolution` coord-doubling test runs on the desktop JVM. `PointF` conversion happens at the OpenCV boundary (`BoardWarper`). | None — same geometry, JVM-testable. |
| 4 | 02 | Step scope lists only `geometry/**`, `test/**`, STATUS.md for staging. | Also added a JUnit5 test harness to `android/app/build.gradle.kts` (`testImplementation(libs.junit.jupiter)`, `junit-platform-launcher`, `unitTests.all { useJUnitPlatform() }`). The `:app` module had no unit-test deps; without them the phase's mandated `:app:testDebugUnitTest` cannot compile/run. No new catalog entry (junit-jupiter already present). | Low — enables app unit tests; additive. |

## Session log

| Timestamp | Phase | Agent | Action | Result |
|---|---|---|---|---|
| 2026-07-09T10:00Z | 00 | codewhale | Created Gradle scaffold, version catalog, :engine api types, :app Compose skeleton, static analysis config, .gitignore, README pointer. All gates pass. | done |
| 2026-07-09T12:00Z | 02 | opus | Ported geometry pkg to `com.chesslab.tracker.geometry`: BoardCorners/Point, CalibrationProfile (+forResolution rescale), CalibrationStore (JSON), BoardWarper (getPerspectiveTransform/warpPerspective, detectScale 0.5), BoardDetector (board_corners_from_lines port, split across HoughPipeline/LineFamilies/LineDetectionTypes for detekt), CornerDriftMonitor. Added JUnit5 harness to app. 15 unit tests green; ktlint + detekt clean, no @Suppress. | done |
