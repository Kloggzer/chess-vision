plugins {
    id("java-library")
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

// A plain JVM module, and it took a build-system fact to get here: `org.opencv:opencv` ships as an
// AAR, which only an Android module can consume — that alone forced `com.android.library`, not one
// line of code. `org.bytedeco:opencv` carries the identical `org.opencv.*` API (same OpenCV 4.10.0)
// as an ordinary jar, so the module compiles against that and each RUNTIME supplies exactly one
// implementation plus its natives: `:app` the AAR, the desktop the classified bytedeco jars.
//
// `compileOnly` is load-bearing. `implementation` here would put 342 `org.opencv` classes on the
// APK's classpath a second time, and the winner might be the one whose `System.loadLibrary` never
// ran — an UnsatisfiedLinkError inside a warp, on the device, never on the desk. `:app` has a
// build-time guard (`assertNoBytedecoInApk`) so that cannot be reintroduced by accident.
//
// Note what the bytedeco jar does NOT carry: `org.opencv.android.OpenCVLoader`. Native
// initialisation therefore cannot even be named from here — the compiler enforces the seam that
// used to be a convention.
val bytedecoClassifier: String by rootProject.extra

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

dependencies {
    api(project(":core-engine"))
    compileOnly(libs.bytedeco.opencv)

    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)

    // Host natives for the clip-replay / warp parity tests: JavaCV decodes the shared Blender test
    // clips (../../tests/data/testclips) with FFmpeg and warps them with OpenCV on the desktop JVM.
    testImplementation(libs.bytedeco.opencv)
    testImplementation(libs.javacv)
    testRuntimeOnly(variantOf(libs.bytedeco.opencv) { classifier(bytedecoClassifier) })
    testRuntimeOnly(variantOf(libs.bytedeco.ffmpeg) { classifier(bytedecoClassifier) })
    testRuntimeOnly(variantOf(libs.bytedeco.openblas) { classifier(bytedecoClassifier) })
    testImplementation(libs.snakeyaml)
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}
