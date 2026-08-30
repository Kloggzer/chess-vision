plugins {
    id("java-library")
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

// The second engine: stillness instead of motion, a legality search instead of a diff hypothesis.
//
// It depends on `:core-engine` for the seam and on chesslib for the rules, and on nothing else —
// no OpenCV, no ONNX, no Android, no coroutines. What it needs of the pixels arrives as
// `FrameInput`; what it needs of the model arrives as `CnnSnapshot`. That is deliberate: an engine
// that cannot name a thread cannot start one, and the host owns exactly one.
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

dependencies {
    api(project(":core-engine"))
    implementation(libs.chesslib)

    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}
