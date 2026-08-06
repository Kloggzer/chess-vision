plugins {
    id("java-library")
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

// The tracker itself, without a host.
//
// Everything here is what BOTH shells run: the frame loop, the stage order, the object graph and
// the stores. It was written platform-free from the start — `TrackerStack` has never had an Android
// import — but it lived in `:app`, so the only way to drive it off-device was to write a second
// copy of the loop in a test source set. That copy is what this module exists to delete.
//
// Split packages are deliberate: `com.chesslab.tracker.pipeline` lives here AND in `:app`, which is
// what makes the move a rename-free `git mv`. Legal on a classpath, and it rules out JPMS.
//
// OpenCV is `compileOnly` for the same reason as in `:core-geometry`: one implementation per
// runtime, never two on one classpath. See that module's comment for what a duplicate costs.
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

dependencies {
    api(project(":core-engine"))
    api(project(":core-geometry"))
    api(project(":core-cnn"))
    compileOnly(libs.bytedeco.opencv)

    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
    testImplementation(libs.bytedeco.opencv)
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}
