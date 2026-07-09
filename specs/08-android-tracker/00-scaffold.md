# Phase 00 — Project scaffold

## Why

Nothing under `android/` exists. Phases 01–03 run in parallel and each needs a
compiling module skeleton, pinned dependencies, and the shared engine↔app
interfaces to code against.

## Design (decided — do not redesign)

- Gradle root `android/` with Kotlin DSL, version catalog `gradle/libs.versions.toml`.
- Kotlin 2.1.x, AGP 8.7+, JDK 17, minSdk 29, targetSdk/compileSdk 35.
- Modules:
  - `:engine` — `java-library` + `org.jetbrains.kotlin.jvm`. Deps: `com.github.bhlangonijr:chesslib:1.3.4` (Maven Central), JUnit 5 (test). **No Android or OpenCV dependency.**
  - `:app` — `com.android.application` + Compose. Deps: Compose BOM + Material 3, `androidx.camera:*` (core, camera2, lifecycle, view) 1.4.x, `org.opencv:opencv:4.10.0` (Maven Central AAR), `androidx.datastore:datastore-preferences`, `androidx.lifecycle:lifecycle-viewmodel-compose`, kotlinx-serialization-json, kotlinx-coroutines. Ktor server deps land in phase 06, ONNX Runtime in phase 05 — do NOT add them now.
- Shared interfaces in `:engine` (`com.chesslab.engine.api`), written in THIS phase so 01/02/03 compile independently:

```kotlin
// engine/src/main/kotlin/com/chesslab/engine/api/Images.kt
/** Row-major single-channel image; the engine's only pixel type. */
class GrayImage(val width: Int, val height: Int, val data: ByteArray)
/** Warped color board for HSV/Lab vetoes; packed BGR. */
class BgrImage(val width: Int, val height: Int, val data: ByteArray)

// engine/src/main/kotlin/com/chesslab/engine/api/TrackerConfig.kt
data class TrackerConfig(
    val motionThr: Double = 0.25,        // % pixels; tracker.py:299
    val motionPxThr: Double = 20.0,
    val zThr: Double = 3.0,
    val ambiguityMarginLl: Double = 2.0,
    val reanchorLlFloor: Double = -4.0,
    val nudgeTimeoutS: Double = 5.0,
    val driftWindowS: Double = 30.0,
    val maxChanged: Int = 6,
    val censusThr: Double = 160.0,
    val occlusionColorThr: Double = 1.5,
    val motionMargin: Double = 0.10,
    val overhang: Double = 0.25,
    val motionHoldS: Double = 0.4,
    val diffClaheClip: Double = 2.0,
    val requireMotionForMove: Boolean = true,
    val motionRecencyS: Double = 20.0,
    val confirmFrames: Int = 2,          // 1 when CNN attached; tracker.py:603
    val pairLookAhead: Boolean = true,   // "look-forward" setting
    val usePrior: Boolean = true,
    val cornerJumpPx: Double = 6.0,
    val detectScale: Double = 0.5,
)

// engine/src/main/kotlin/com/chesslab/engine/api/TrackerEvents.kt
sealed interface TrackerEvent {
    data class MoveCommitted(val san: String, val fen: String, val decision: Decision) : TrackerEvent
    data class StateChanged(val state: TrackerState) : TrackerEvent
}
enum class TrackerState { WAITING_BOARD, TRACKING, OCCLUDED, STUCK, VERIFYING }
data class Decision(                      // provenance; tracker.py:1777
    val decider: String, val reason: String, val best: Double, val second: Double,
    val margin: Double, val changed: List<String>, val shadowVeto: List<String>,
    val occluded: List<String>, val priorUsed: Boolean,
)
```

- `app/` skeleton: `MainActivity` with an empty Compose `Scaffold` showing "chesslab tracker", Material 3 theme (dynamic color, light+dark), OpenCV initialized via `OpenCVLoader.initLocal()` in `Application.onCreate`.
- `.gitignore` for `android/` (`.gradle/`, `build/`, `local.properties`, `.idea/`).
- Root repo `README.md`: add one line pointing to `android/` (do not restructure).

## Steps

### 1. Gradle root + version catalog — commit `feat(android): gradle scaffold with engine and app modules`
`android/settings.gradle.kts` (includes `:engine`, `:app`), `build.gradle.kts`, `gradle/libs.versions.toml`, wrapper 8.10+, `.gitignore`.

### 2. `:engine` module with api package — commit `feat(android-engine): api types (GrayImage, TrackerConfig, TrackerEvent)`
Files exactly as in Design. One placeholder test `TrackerConfigTest` asserting defaults match the table in `entry.md` (spot-check motionThr, censusThr, occlusionColorThr, maxChanged).

### 3. `:app` module skeleton — commit `feat(android-app): compose skeleton, M3 theme, opencv init`

### 4. Static analysis — commit `chore(android): ktlint + detekt with dead-code rules`
`org.jlleitschuh.gradle.ktlint` and detekt plugins on both modules; shared
`android/config/detekt/detekt.yml` with the unused-code rules active
(`UnusedPrivateMember`, `UnusedPrivateProperty`, `UnusedParameter`, `UnusedImports`);
`app/lint.xml` raising `UnusedResources`/`UnusedIds` to error. Empty baselines.
Both `ktlintCheck` and `detekt` must pass on the skeleton.

## Tests (write, run once, targeted)

- `cd android && ./gradlew :engine:test` — TrackerConfigTest green.
- `./gradlew :app:assembleDebug` — APK builds (allowed in this phase only).

## Acceptance criteria

- [ ] `android/gradlew :engine:test :app:assembleDebug` exits 0.
- [ ] `./gradlew :engine:ktlintCheck :app:ktlintCheck :engine:detekt :app:detekt` exits 0.
- [ ] `grep -n "UnusedPrivateMember" android/config/detekt/detekt.yml` → `active: true`.
- [ ] `android/.gitignore` committed before any build output exists in history.
- [ ] `grep -rn "opencv" android/engine/build.gradle.kts` → no hit (engine stays pure).
- [ ] `grep -rn "chesslib" android/gradle/libs.versions.toml` → hit.
- [ ] No file outside `android/` changed except the one README line.

## Do NOT

- No pipeline logic, no camera code, no settings persistence — later phases.
- Do not add Ktor or ONNX Runtime dependencies.
- Do not touch `src/chesslab/**`.
