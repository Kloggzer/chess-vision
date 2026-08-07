plugins {
    id("java-library")
    id("java-test-fixtures")
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
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

val bytedecoClassifier: String by rootProject.extra

dependencies {
    api(project(":core-engine"))
    api(project(":core-geometry"))
    api(project(":core-cnn"))
    compileOnly(libs.bytedeco.opencv)
    // Same rule as OpenCV, same reason: the `ai.onnxruntime` API is identical in both artifacts,
    // so this module compiles against one and each runtime brings its own — `:app` the Android AAR
    // with the device's execution providers, a desktop the JVM build with host natives.
    compileOnly(libs.onnxruntime.jvm)
    api(libs.kotlinx.coroutines.core)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.chesslib)

    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
    testImplementation(libs.bytedeco.opencv)
    testImplementation(libs.onnxruntime.jvm)
    testImplementation(libs.kotlinx.coroutines.test)
    // Host natives for tests that touch real OpenCV (GeometryScanTest's homography) — the same
    // pattern `:core-geometry` uses; the API jar alone carries no `opencv_java` to load.
    testRuntimeOnly(variantOf(libs.bytedeco.opencv) { classifier(bytedecoClassifier) })
    testRuntimeOnly(variantOf(libs.bytedeco.openblas) { classifier(bytedecoClassifier) })

    // Fakes both modules' tests need. `:app` consumes them with
    // `testImplementation(testFixtures(project(":tracker-runtime")))` — one fake, not a copy per
    // module, which is the same rule this whole restructuring exists to enforce for production code.
    testFixturesImplementation(libs.kotlinx.coroutines.core)
    testFixturesImplementation(libs.kotlinx.serialization.json)
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}
