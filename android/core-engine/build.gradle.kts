plugins {
    id("java-library")
    id("java-test-fixtures")
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

// The parity-critical module. Its runtime classpath is chesslib + kotlin-stdlib and
// NOTHING else - no Android, no native image library, no concurrency runtime.
// Enforced by ClasspathPurityTest; see entry.md "Hard rules".
dependencies {
    api(libs.chesslib)

    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
    // Test scope only: the phase-00b parity-fixture loader parses golden JSON.
    testImplementation(libs.kotlinx.serialization.json)
}

tasks.withType<Test> {
    useJUnitPlatform()
    // Opt-in hot-path profiler (`EngineProfileTest`). Off by default: it burns seconds of CPU and
    // asserts nothing, so it must never be part of the gate. Run with `-Pchesslab.profile=true`.
    systemProperty("chesslab.profile", providers.gradleProperty("chesslab.profile").getOrElse("false"))
    // A profiler that prints its results and nothing else needs its stdout to reach the console.
    if (providers.gradleProperty("chesslab.profile").getOrElse("false") == "true") {
        testLogging.showStandardStreams = true
    }
}
