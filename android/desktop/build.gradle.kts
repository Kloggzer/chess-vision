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
