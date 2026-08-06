plugins {
    id("java-library")
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

// A plain JVM module. It was `com.android.library` only because it consumes `:core-geometry`,
// which was an AAR; that cascade is gone. This module names no `org.opencv` symbol at all —
// `Preprocess` works on `com.chesslab.engine.api.BgrImage`, a plain ByteArray holder — and
// `SquareClassifier` is an interface here, with the ONNX Runtime implementation in `:app`.

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

dependencies {
    api(project(":core-engine"))
    api(project(":core-geometry"))
    implementation(libs.chesslib)

    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}
