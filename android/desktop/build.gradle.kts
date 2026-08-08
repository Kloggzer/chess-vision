plugins {
    id("application")
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

// The PC's shell. The peer of `:app`, not a port of it.
//
// It brings a `main()`, a source of frames and the host bindings — and nothing else. Every decision
// about a chessboard happens in `:tracker-runtime`, which is the same bytecode the phone executes.
// That is the point: a bug found here is the phone's bug, and a breakpoint here stops in the code
// that ships.
//
// This module is also where the desktop natives live, so the APK never sees them: bytedeco's OpenCV
// provides the `org.opencv.*` API the shared modules compile against, JavaCV's FFmpeg decodes video,
// and ONNX Runtime's JVM build replaces the Android AAR.
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

application {
    mainClass = "com.chesslab.desktop.DesktopMainKt"
    // The heap is CAPPED because the default (a quarter of physical RAM, per JVM, each unaware of
    // the others) is what filled a 32 GB machine on 2026-08-08: three parallel batch replays ran
    // 6 GB private each and one ballooned to 27 GB — under CPU contention the GC starves while the
    // per-frame churn (BufferedImage previews, seam byte arrays) keeps allocating, and an
    // unbounded heap simply absorbs it. Measured with the cap: identical results, identical
    // runtime (rec-20260807 score, 25/0/0, 2m05s both ways). Native memory (OpenCV, ONNX) is not
    // governed by this flag; every Mat on the replay path is released explicitly and single-run
    // private memory is flat over the full video.
    applicationDefaultJvmArgs = listOf("-Xmx2g")
}

val bytedecoClassifier: String by rootProject.extra

dependencies {
    implementation(project(":tracker-runtime"))
    implementation(libs.bytedeco.opencv)
    implementation(libs.javacv)
    implementation(libs.onnxruntime.jvm)
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.kotlinx.serialization.json)

    runtimeOnly(variantOf(libs.bytedeco.opencv) { classifier(bytedecoClassifier) })
    runtimeOnly(variantOf(libs.bytedeco.ffmpeg) { classifier(bytedecoClassifier) })
    runtimeOnly(variantOf(libs.bytedeco.openblas) { classifier(bytedecoClassifier) })

    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}
