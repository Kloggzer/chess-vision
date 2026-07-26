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

        // Stockfish (phase 07c): built from the source submodule for the ABIs
        // below. Filters apply APK-wide; 64-bit only (minSdk 29 hardware).
        //
        // arm64-v8a ONLY, deliberately. x86_64 served nothing but the emulator, and
        // this app is a camera-driven board tracker: an emulator has no board to film
        // and no Hexagon NPU, so the CNN would drop to CPU there anyway. The x86_64
        // slice cost 99.7 MB of the APK (mostly a second copy of the embedded NNUE
        // nets) and a second full Stockfish compile. src/main/cpp/CMakeLists.txt keeps
        // its x86_64 flag branch, so re-enabling is a one-word revert.
        ndk {
            abiFilters += listOf("arm64-v8a")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
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

            // The onnxruntime-android-qnn AAR ships every QNN backend Qualcomm
            // supports; this app asks for exactly one. OnnxSquareClassifier passes
            // `backend_path = libQnnHtp.so`, so the GPU and the legacy DSP backends
            // are dead weight. Of the HTP variants only the SoC's own Hexagon
            // version is ever dlopen'd: v75 = Snapdragon 8 Gen 3 (the target
            // device), v79 = 8 Elite, kept so a newer phone does not silently lose
            // the NPU. v68/v69/v73 (SD 888 / 8 Gen 1 / 8 Gen 2) are dropped.
            //
            // libQnnHtpPrepare.so (52.5 MB raw) is deliberately KEPT: the staged
            // model.qnn.onnx is a plain QDQ graph, not a pre-compiled EPContext
            // binary (verified — it contains QuantizeLinear/DequantizeLinear nodes
            // and no `EPContext` / `ep_cache_context` marker), so QNN compiles the
            // graph on device at session creation and needs Prepare. Excluding it
            // would not fail loudly, it would make the QNN EP fall through to NNAPI.
            excludes +=
                listOf(
                    "**/libQnnGpu.so",
                    "**/libQnnDsp.so",
                    "**/libQnnDspV66Skel.so",
                    "**/libQnnDspV66Stub.so",
                    "**/libQnnHtpV68Skel.so",
                    "**/libQnnHtpV68Stub.so",
                    "**/libQnnHtpV69Skel.so",
                    "**/libQnnHtpV69Stub.so",
                    "**/libQnnHtpV73Skel.so",
                    "**/libQnnHtpV73Stub.so",
                )
        }
    }
}

// Unit tests run on the desktop JVM: keep the Android-only ONNX Runtime AAR off
// their classpath so the JVM artifact (with desktop natives) resolves instead.
configurations.matching { it.name.contains("UnitTest") }.configureEach {
    exclude(group = "com.microsoft.onnxruntime", module = "onnxruntime-android-qnn")
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

    // ONNX Runtime (phase 05c: CNN safeguard). Device uses the QNN AAR (bundles the
    // Qualcomm Hexagon/NPU libs; the classifier selects the QNN EP when a quantized
    // model.qnn.onnx is present, else NNAPI, else CPU). JVM unit tests swap in the
    // desktop artifact (same ai.onnxruntime API) because the AAR only ships Android ABIs.
    implementation(libs.onnxruntime.android.qnn)
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
}
