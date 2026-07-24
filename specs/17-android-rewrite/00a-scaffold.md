# Phase 00a — scaffold: legacy move, four-module Gradle project, API seam

## Why

The rewrite needs a build that can run the parity-critical code on the desktop JVM
(`:core-engine`, `chesslib` + kotlin-stdlib only) while the old app stays readable as a
build-configuration reference until phase 09. This phase produces a *skeleton that
compiles and is green* — no logic. Every later phase depends on the API seam created
here, so it is created **once, verbatim from `entry.md`**, and frozen.

The existing tree is `android/` with modules `:engine` and `:app`. It becomes
`android-legacy/` and is never built again.

## Design (decided — do not redesign)

### Toolchain (copied from the legacy build — do not "upgrade")

Read `android-legacy/gradle/libs.versions.toml` after the move; the new catalog starts as
a **verbatim copy** of it. Binding versions:

| Item | Version |
|---|---|
| Gradle wrapper | `8.11.1-bin` (`distributionUrl` copied verbatim) |
| AGP | `8.7.3` |
| Kotlin | `2.1.10` |
| ktlint gradle plugin / ktlint | `12.2.0` / `1.5.0` (pinned in the root `subprojects{}` block) |
| detekt | `1.23.8` |
| chesslib | `com.github.bhlangonijr:chesslib:1.3.4` (jitpack repo — keep `maven { url = uri("https://jitpack.io") }`) |
| JUnit Jupiter / platform | `5.12.0` / `1.12.0` |
| OpenCV | `org.opencv:opencv:4.10.0` |
| ONNX Runtime | `1.21.1` (`onnxruntime-android-qnn` for the device, `onnxruntime` JVM for unit tests) |
| CameraX | `1.4.1`, Compose BOM `2025.01.01`, Ktor `3.0.3`, datastore `1.1.2`, lifecycle `2.8.7`, navigation `2.8.5`, kotlinx-serialization `1.7.3`, kotlinx-coroutines `1.9.0`, zxing `3.5.3` |

Fixed build parameters: **JDK 17** (`JavaLanguageVersion.of(17)` for JVM modules,
`sourceCompatibility`/`targetCompatibility`/`jvmTarget` 17 for Android modules),
`compileSdk = 35`, `minSdk = 29`, `targetSdk = 35`, `applicationId = "com.chesslab.tracker"`,
`namespace = "com.chesslab.tracker"`, `ndk { abiFilters += listOf("arm64-v8a", "x86_64") }`,
`versionCode = 1`, `versionName = "0.1.0"`. **JUnit 5 everywhere**: JVM modules
`tasks.withType<Test> { useJUnitPlatform() }`, `:app` `testOptions { unitTests.all { it.useJUnitPlatform() } }`.
`gradle.properties` copied verbatim (`org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8`,
`android.useAndroidX=true`, `kotlin.code.style=official`, `android.nonTransitiveRClass=true`).

### Module wiring

`android/settings.gradle.kts`: `rootProject.name = "chesslab-tracker"`, same
`pluginManagement`/`dependencyResolutionManagement` repository blocks as legacy, and

```kotlin
include(":core-engine")
include(":core-geometry")
include(":core-cnn")
include(":app")
```

- **`:core-engine`** — `id("java-library")` + `alias(libs.plugins.kotlin.jvm)` + ktlint + detekt.
  Dependencies: `api(libs.chesslib)`, `testImplementation(libs.junit.jupiter)`,
  `testRuntimeOnly(libs.junit.platform.launcher)`, and — **test scope only** —
  `testImplementation(libs.kotlinx.serialization.json)` plus
  `alias(libs.plugins.kotlin.serialization)`, which the phase-00b parity-fixture loader
  needs to parse the golden JSON (this line is owned by 00a; 00b must not add it).
  **NOTHING ELSE** — in particular *not*
  `kotlinx-coroutines-core` (legacy `:engine` had it; that is exactly the impurity this
  module forbids) and *not* JavaCV/snakeyaml (Tier-C fixtures live in `:core-geometry`, see 00b).
- **`:core-geometry`** — `com.android.library` (needs the OpenCV AAR),
  namespace `com.chesslab.geometry`. `api(project(":core-engine"))`, `implementation(libs.opencv)`.
  Test deps: junit-jupiter + the JavaCV host-native set copied from legacy `:engine`
  (`org.bytedeco:javacv:1.5.11`, `opencv:4.10.0-1.5.11:windows-x86_64`,
  `ffmpeg:7.1-1.5.11:windows-x86_64`, `openblas:0.3.28-1.5.11:windows-x86_64`,
  `org.yaml:snakeyaml:2.3`) — added to the version catalog, not hand-written coordinates.
- **`:core-cnn`** — `com.android.library`, namespace `com.chesslab.cnn`.
  `api(project(":core-engine"))`, `api(project(":core-geometry"))`, `implementation(libs.chesslib)`.
  No ONNX dependency here — `SquareClassifier` is an interface; the ONNX implementation is `:app` (phase 05c).
- **`:app`** — `com.android.application` + kotlin-android + compose + serialization + ktlint + detekt.
  Dependency list copied from `android-legacy/app/build.gradle.kts` with
  `implementation(project(":engine"))` replaced by the three new modules. Keep both legacy
  workarounds verbatim: the `configurations.matching { it.name.contains("UnitTest") } { exclude(group = "com.microsoft.onnxruntime", module = "onnxruntime-android-qnn") }`
  block and `packaging { jniLibs { useLegacyPackaging = true } }`.

**Deferred on purpose:** do **not** wire `externalNativeBuild { cmake { ... } }` in this
phase — Stockfish is phase 07c. Copy `app/src/main/cpp/CMakeLists.txt` verbatim into the
new tree (its relative path `../../../../third_party/stockfish/src` keeps working) and
leave a one-line comment in `app/build.gradle.kts` naming 07c as the owner. Rationale:
every `assembleDebug` in phases 00–06 would otherwise compile Stockfish for two ABIs.

### Detekt / ktlint

Copy `android-legacy/config/detekt/detekt.yml` to `android/config/detekt/detekt.yml`, then
**strip the legacy-app justification overrides** — the new tree starts strict:
delete the `TooManyFunctions` (`thresholdInClasses: 24`, `thresholdInFiles: 20`),
`LongMethod: 80` and `CyclomaticComplexMethod: 20` bumps. Keep `MaxLineLength: 140`
(matches ktlint), the `LongParameterList`/`MagicNumber` `ignoreAnnotated: ['Composable']`
exemptions, `MagicNumber.ignorePropertyDeclaration/ignoreLocalVariableDeclaration`, and the
`style.Unused*` activations. Also fix the mojibake in the legacy comment on the `MagicNumber`
block (it contains a broken em-dash) — write plain ASCII.

Baselines: **none**. Do not create `detekt-baseline.xml` for any module. The root
`build.gradle.kts` keeps the legacy `subprojects { plugins.withId(...) }` blocks unchanged.

### Git / submodule (the trap — one decided procedure)

`git mv android android-legacy` moves the *gitlink* of `android/third_party/stockfish` but
does **not** rewrite `.gitmodules`, leaving a registration whose `path` no longer exists.
The decided fix is to end with the submodule at the **same path string it has today**, so
`.gitmodules` and `CMakeLists.txt` need no edit at all, and the legacy tree simply has no
Stockfish sources (it is never built again — that is acceptable and explicitly intended).

Run exactly this, in this order, from the repo root in PowerShell:

```
git submodule deinit -f android/third_party/stockfish
git mv android android-legacy
New-Item -ItemType Directory -Force android/third_party
git mv android-legacy/third_party/stockfish android/third_party/stockfish
Remove-Item -Recurse -Force android-legacy/third_party   # now empty
git submodule sync
git submodule update --init android/third_party/stockfish
```

Deinit first so the submodule working tree is empty while it is moved — that is what keeps
git from confusing the submodule's gitdir. Verify afterwards (all three must hold):

- `git config -f .gitmodules submodule."android/third_party/stockfish".path` → `android/third_party/stockfish`
- `git ls-files -s | Select-String 160000` → **exactly one** line, at `android/third_party/stockfish`
- `git diff --cached -- .gitmodules` → empty (the file is unchanged)

If the second check shows a gitlink under `android-legacy/`, STOP and record a blocker — do
not hand-edit `.git/modules`.

`android/` is otherwise re-created from scratch. Note what travels along in the working
tree during the move and must be dealt with: `android-legacy/{build,.gradle,.kotlin}/` and
`android-legacy/engine/bin/` are all **untracked** gitignored IDE/Gradle output.
`engine/bin/{main,test}` in particular is stale IDE compile output — it must **not** be
recreated or copied into the new tree.

### `.gitignore`

Create `android/.gitignore` as a copy of the legacy one plus `.kotlin/`:

```
.gradle/
build/
bin/
local.properties
.idea/
*.iml
.DS_Store
captures/
.kotlin/

# NDK / externalNativeBuild intermediates (Stockfish, phase 07c)
.cxx/
*.o
*.so
*.nnue
```

The root `.gitignore` needs no change (it has no `android/` rules). Verify with
`git status --porcelain android` that no `build/`, `.gradle/`, `.kotlin/` or
`local.properties` path is listed as untracked.

### Model assets — COPY, never move

`android-legacy/app/src/main/assets/cnn_model/` keeps its copy until phase 09. Copy all
three files to `android/app/src/main/assets/cnn_model/` and verify byte sizes:

| File | Bytes |
|---|---|
| `model.onnx` | 2 692 494 |
| `model.qnn.onnx` | 1 150 936 |
| `config.json` | 825 |

(`config.json` describes `mobilenetv4_conv_small_035`, 14 classes, `out_size [128,128]`,
ImageNet mean/std — phase 05c reads it; do not edit it.)

### The API seam (verbatim, frozen)

Create in `android/core-engine/src/main/kotlin/com/chesslab/engine/api/`, copied **character
for character** from the `entry.md` code block (including every comment — the comments carry
the invariants): `Images.kt` (`GrayImage`, `BgrImage`), `TrackerConfig.kt` (all 40 knobs with
the `TRACK_DEFAULTS` values plus `settleFrames`/`avgFrames`/`confirmFrames`/`detSize`),
`FrameInput.kt`, `CnnSnapshot.kt`, `TrackerEvent.kt`, `TrackerStatus.kt`.

Plus `TrackerEngine.kt` — the class with the exact signatures from `entry.md`, every body
`TODO("phase 03d")` (name the owning phase per method: `onFrame` → 03d, `onCnnSnapshot` → 04a,
`status` → 03d, `undo`/`resetToStart`/`setFen`/`captureBaseline`/`choosePromotion`/
`acceptCnnPosition` → 03d, `updateConfig` → 03d). Add a `const val STARTPOS` in the api package.

Everything in the api package is `public`; nothing else exists in `:core-engine` yet.
**Later phases fill in `TrackerEngine` but may not change the seam** — a needed change is a
blocker and requires a discrepancy note in `STATUS.md` before any edit.

### `:app` skeleton

Exactly one `MainActivity` (`setContent {}` with a single `Text("chesslab")`), the
`AndroidManifest.xml` reduced to `<application>` + that launcher activity (drop every legacy
service/permission declaration — phases 05/06 re-add what they need), and
`res/values/{strings,themes}.xml` + `lint.xml` copied from legacy. No other app source file.

### Purity enforcement

`android/core-engine/src/test/kotlin/com/chesslab/engine/ClasspathPurityTest.kt`, two tests:

1. `runtimeClasspathHasNoOpenCvOrAndroid` — assert both
   `Class.forName("org.opencv.core.Mat")` and `Class.forName("android.util.Log")` throw
   `ClassNotFoundException` (`assertThrows<ClassNotFoundException>`), and that
   `Class.forName("com.github.bhlangonijr.chesslib.Board")` resolves (proves the test is
   actually checking a populated classpath, not an empty one).
2. `engineSourcesAreSingleThreaded` — walk `File("src/main/kotlin")` (Gradle's test working
   directory is the module dir), read every `*.kt`, and fail with the offending
   `file:line` if any line matches `Regex("""\bsynchronized\b|\bAtomic[A-Z]|\bMutex\b|@Volatile""")`.
   Ignore lines whose trimmed form starts with `//` or `*`.

## Steps

### 1. Move the legacy tree — commit `chore(android): move the legacy app to android-legacy/, keep the stockfish submodule path`
Run the submodule procedure above verbatim; run the three verification commands.

### 2. Gradle skeleton — commit `build(android): new four-module gradle project (core-engine/geometry/cnn/app)`
Wrapper (`gradlew`, `gradlew.bat`, `gradle/wrapper/*` copied from `android-legacy`),
`settings.gradle.kts`, root `build.gradle.kts`, `gradle.properties`, `gradle/libs.versions.toml`
(+ the JavaCV/snakeyaml entries), the four `build.gradle.kts` files, `android/.gitignore`.

### 3. Static analysis — commit `build(android): ktlint 1.5.0 + detekt 1.23.8, strict config, no baselines`
`config/detekt/detekt.yml` per the rules above.

### 4. API seam — commit `feat(android-engine): public api seam (config, frame input, events, status)`
The seven files under `com.chesslab.engine.api`.

### 5. App skeleton + assets — commit `feat(android-app): empty app skeleton, cnn model assets, stockfish cmake (unwired)`
`MainActivity`, manifest, res, `lint.xml`, `src/main/cpp/CMakeLists.txt`, the three copied assets.

### 6. Purity test — commit `test(android-engine): classpath purity + single-thread source gate`

## Tests

Run once, at the end, in PowerShell from `android/`:

```
.\gradlew.bat :core-engine:test :core-geometry:compileKotlin :core-cnn:compileKotlin
.\gradlew.bat :app:assembleDebug
.\gradlew.bat ktlintCheck detekt
```

## Acceptance criteria

- All three Gradle invocations above succeed; `ClasspathPurityTest` reports 2 passing tests.
- `ktlintCheck` and `detekt` report **zero** findings; `Get-ChildItem -Recurse -Filter "detekt-baseline.xml" android` returns nothing.
- `git ls-files -s | Select-String 160000` → exactly one gitlink, at `android/third_party/stockfish`;
  `git diff HEAD -- .gitmodules` is empty.
- `(Get-Item android/app/src/main/assets/cnn_model/model.onnx).Length` → `2692494`;
  `model.qnn.onnx` → `1150936`; `config.json` → `825`; the same three files still exist under `android-legacy/`.
- `Get-ChildItem android/core-engine/src/main/kotlin/com/chesslab/engine/api` lists exactly
  `Images.kt TrackerConfig.kt FrameInput.kt CnnSnapshot.kt TrackerEvent.kt TrackerStatus.kt TrackerEngine.kt`.
- `Select-String -Pattern "coroutines|opencv|onnx" android/core-engine/build.gradle.kts` → no hits
  (`kotlinx-serialization-json` is present but only on `testImplementation`).
- `Select-String -Pattern "occlusionColorThr: Double = 3.0" android/core-engine/src/main/kotlin/com/chesslab/engine/api/TrackerConfig.kt` hits
  (guards invariant 12: `TRACK_DEFAULTS` wins over the tracker constructor's 1.5).
- `Test-Path android/engine` → `False`; `Test-Path android-legacy/app/build.gradle.kts` → `True`.
- `git status --porcelain android` lists no `build/`, `.gradle/`, `.kotlin/`, `bin/` or `local.properties` entry.

## Files you own

Everything under `android/` (new tree), `android/.gitignore`, `.gitmodules` (only as a
consequence of the `git mv` — the file content must end unchanged), and the *move* of
`android/**` → `android-legacy/**`.

## Do NOT

- Do NOT copy any `.kt` file from `android-legacy` except where this file says "copied from
  legacy" (manifest, res, `lint.xml`, `CMakeLists.txt`, build config). No logic crosses over.
- Do NOT carry over `engine/bin/**` or any `build/`, `.gradle/`, `.kotlin/` directory.
- Do NOT add `kotlinx-coroutines`, OpenCV, ONNX or any Android dependency to `:core-engine`.
- Do NOT wire `externalNativeBuild` (07c) or add a second submodule registration.
- Do NOT create detekt baselines or `@Suppress` anything to get green.
- Do NOT implement `TrackerEngine`, and do NOT change the seam — later phases depend on it byte-for-byte.
- Do NOT touch `android-legacy/**` after the move, or `src/chesslab/**`.
