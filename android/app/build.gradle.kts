plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.plugin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

android {
    namespace = "com.chesslab.tracker"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.chesslab.tracker"
        minSdk = 29
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"

        // Instrumented tests. The only one is NormLatencyBenchmark, which times the two
        // normalizers against each other on the real SoC — a question no desktop EP can answer,
        // because the desktop has no XNNPACK and therefore runs the convolutions badly.
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // ABI selection belongs to the build types below. Keeping it out of defaultConfig
        // lets the normal debug/release APKs stay arm64-only while the separate `emulator`
        // build contains only x86_64. In particular, no APK pays for both embedded Stockfish
        // NNUE networks.
    }

    buildTypes {
        debug {
            ndk {
                abiFilters += listOf("arm64-v8a")
            }
        }
        create("emulator") {
            isDebuggable = true
            isJniDebuggable = true
            signingConfig = signingConfigs.getByName("debug")
            matchingFallbacks += listOf("debug")
            applicationIdSuffix = ".emulator"
            versionNameSuffix = "-emulator"
            ndk {
                // OpenCV and ONNX Runtime both ship this slice; Stockfish's matching
                // flags live in src/main/cpp/CMakeLists.txt.
                abiFilters += listOf("x86_64")
            }
        }
        release {
            isMinifyEnabled = false
            ndk {
                abiFilters += listOf("arm64-v8a")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    testOptions {
        unitTests.all {
            it.useJUnitPlatform()
            // The end-to-end clip simulation (`com.chesslab.tracker.sim`) decodes 18 videos and
            // runs real ONNX inference over every frame — minutes, not seconds. It is gated on
            // this property so `testDebugUnitTest` stays a fast gate; see CnnClipSimulationTest.
            it.systemProperty("chesslab.sim", providers.gradleProperty("chesslab.sim").getOrElse("false"))
            // Comma-separated model directories to compare (each holding `model.onnx` +
            // `config.json`), repo-relative or absolute. Empty = the bundled app assets only.
            it.systemProperty("chesslab.sim.models", providers.gradleProperty("chesslab.sim.models").getOrElse(""))
            // Clip directory holding `<clip>.mp4` + `<clip>.labels.json`, repo-relative or absolute.
            // Empty = `tests/data/testclips`, the committed set the parity fixtures were emitted
            // from. A re-render (e.g. at phone resolution) lives in its own directory and is
            // selected here, so the fixtures are never overwritten; see SimClips.simClipDir.
            it.systemProperty("chesslab.sim.clips", providers.gradleProperty("chesslab.sim.clips").getOrElse(""))
            // A real UCI engine for ReviewDepthMeasurementTest, which measures how many plies change
            // class between the live eval bar's budget and the review pass's. Empty = skipped: the
            // answer is a property of Stockfish on the machine it runs on, and a scripted process
            // would fabricate it. `chesslab.uci.game` overrides the bundled move text with a file.
            it.systemProperty("chesslab.uci", providers.gradleProperty("chesslab.uci").getOrElse(""))
            it.systemProperty("chesslab.uci.game", providers.gradleProperty("chesslab.uci.game").getOrElse(""))
        }
    }

    // Stockfish (GPL-3.0, compatible with this repo's GPL-3.0-or-later), built from the pinned
    // submodule android/third_party/stockfish. The CMake file produces an *executable* named
    // libstockfish.so so AGP packages it; see src/main/cpp/CMakeLists.txt for why.
    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.22.1"
        }
    }

    packaging {
        jniLibs {
            // Extract native libs to nativeLibraryDir: the Stockfish
            // executable must exist as a real file to be exec'd (API 29+
            // allows exec only from the app's native library directory).
            useLegacyPackaging = true

            // There used to be a long exclude list here, pruning the Qualcomm QNN
            // backends that com.qualcomm.qti:qnn-runtime drags in behind the
            // onnxruntime-android-qnn AAR. The whole dependency is gone (see the
            // ONNX Runtime block below), and with it 84.7 MB of arm64 payload —
            // libQnnHtpPrepare.so alone was 55.1 MB. Re-adding the QNN AAR means
            // re-adding those excludes; `git log -S libQnnHtpPrepare` has the list.
        }
    }
}

// Unit tests run on the desktop JVM: keep the Android-only ONNX Runtime AAR off
// their classpath so the JVM artifact (with desktop natives) resolves instead.
configurations.matching { it.name.contains("UnitTest") }.configureEach {
    exclude(group = "com.microsoft.onnxruntime", module = "onnxruntime-android")
}

dependencies {
    implementation(project(":core-engine"))
    implementation(project(":core-geometry"))
    implementation(project(":core-cnn"))

    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.material3)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.activity.compose)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.lifecycle.service)
    implementation(libs.navigation.compose)
    // NOTE: `material-icons-extended` was declared but never imported by a single
    // source file (`androidx.compose.material.icons` appears nowhere in :app). It
    // ships the whole extended icon set as generated Kotlin, which cost a measured
    // 31.2 MB of debug dex across three classesN.dex files. material3 still brings
    // material-icons-core transitively, so Icon/IconButton keep working; add the
    // extended set back only alongside an actual `Icons.*` usage.
    debugImplementation(libs.compose.ui.tooling)

    // CameraX
    implementation(libs.camera.core)
    implementation(libs.camera.camera2)
    implementation(libs.camera.lifecycle)
    implementation(libs.camera.view)

    // OpenCV
    implementation(libs.opencv)

    // DataStore
    implementation(libs.datastore.preferences)

    // KotlinX
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)

    // Ktor CIO (phase 08b: LAN spectator server)
    implementation(libs.ktor.server.cio)
    implementation(libs.ktor.server.content.negotiation)
    implementation(libs.ktor.serialization.kotlinx.json)

    // chesslib (phase 08a: PGN result determination)
    implementation(libs.chesslib)

    // ZXing (phase 08b: QR code)
    implementation(libs.zxing.core)

    // ONNX Runtime (phase 05c: CNN safeguard). The plain Android AAR, deliberately, not
    // the QNN one: verified at the ELF level, the QNN build contains zero `xnn_` and zero
    // `ANeuralNetworks` symbols, so it trades the XNNPACK and NNAPI providers away for a
    // QNN EP that measured 227 ms against the CPU's 97 ms on this graph. The classifier's
    // chain is QNN -> NNAPI -> XNNPACK -> CPU and `addQnn` now simply throws here, which
    // EpAttempts already treats as "this EP is unavailable, fall through".
    // JVM unit tests swap in the desktop artifact (same ai.onnxruntime API, host natives).
    implementation(libs.onnxruntime.android)
    testImplementation(libs.onnxruntime.jvm)

    // Host-only natives for the opt-in clip simulation (`com.chesslab.tracker.sim`). Same set
    // :core-geometry already uses: JavaCV's FFmpeg decodes tests/data/testclips/*.mp4 and the
    // bytedeco OpenCV artifact carries the JNI library that makes the `org.opencv` API — which
    // this module compiles against as an AAR — actually runnable on the desktop JVM. :app is
    // the only module that can host this harness: it owns the ONNX classifier and the model
    // assets, and neither can be seen from :core-cnn or :core-geometry test sources.
    testImplementation(libs.javacv)
    testRuntimeOnly(variantOf(libs.bytedeco.opencv) { classifier("windows-x86_64") })
    testRuntimeOnly(variantOf(libs.bytedeco.ffmpeg) { classifier("windows-x86_64") })
    testRuntimeOnly(variantOf(libs.bytedeco.openblas) { classifier("windows-x86_64") })

    // Unit tests (JVM, JUnit5)
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.ktor.server.test.host)
    testRuntimeOnly(libs.junit.platform.launcher)

    // Instrumented tests run on the device, where JUnit5 has no runner — JUnit4 is what
    // AndroidJUnitRunner drives, so this source set uses a different framework from the JVM one.
    androidTestImplementation(libs.junit4)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.androidx.test.junit)
}
