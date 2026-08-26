plugins {
    id("java-library")
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

// The third engine: the CHANGED squares are the witness, the model only confirms colour.
//
// Measured on 2026-08-26 against the second engine, which asks the model to name all 64 squares:
// on the live camera ten of about thirty pieces came back with the wrong identity in every
// reading, stably, while occupancy and colour held. An engine that decides on identity cannot
// work with that; the diff channel the first engine uses does not care.
//
// Same disciplined classpath as its two siblings: `:core-engine` and chesslib, nothing else.
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
