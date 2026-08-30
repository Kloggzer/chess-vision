plugins {
    id("application")
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

// The arena: a chessboard, a camera, a classifier, and a scoreboard — and NO tracker.
//
// It exists so a tracker can be written against the same footage and the same model our engine
// runs on, without reading a line of `:core-engine`. Everything here is infrastructure: decode,
// rectify, classify, score. The one thing it does not provide is an opinion about when a move
// happened; that is the exercise.
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

application {
    mainClass = "com.chesslab.arena.ArenaMainKt"
    // Same cap and same reason as `:desktop` — heap is bounded, the natives are not.
    applicationDefaultJvmArgs = listOf("-Xmx2g")
}

val bytedecoClassifier: String by rootProject.extra

dependencies {
    implementation(project(":tracker-runtime"))
    implementation(libs.bytedeco.opencv)
    implementation(libs.javacv)
    implementation(libs.onnxruntime.jvm)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.chesslib)

    runtimeOnly(variantOf(libs.bytedeco.opencv) { classifier(bytedecoClassifier) })
    runtimeOnly(variantOf(libs.bytedeco.ffmpeg) { classifier(bytedecoClassifier) })
    runtimeOnly(variantOf(libs.bytedeco.openblas) { classifier(bytedecoClassifier) })

    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}
