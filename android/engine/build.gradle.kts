plugins {
    id("java-library")
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

dependencies {
    api(libs.chesslib)
    api(libs.kotlinx.coroutines.core)
    testImplementation(libs.junit.jupiter)
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")

    // Clip-replay parity test (`ClipReplayTest`): decode the shared Blender test clips
    // (../../tests/data/testclips) with FFmpeg and warp them with OpenCV, then drive the
    // engine — the JVM equivalent of the Python `pytest -m clips`. Host-only natives keep the
    // download small (JavaCV core is platform-independent; the classified jars carry the DLLs).
    val javacvVersion = "1.5.11"
    val hostClassifier = "windows-x86_64"
    testImplementation("org.bytedeco:javacv:$javacvVersion")
    testRuntimeOnly("org.bytedeco:opencv:4.10.0-$javacvVersion:$hostClassifier")
    testRuntimeOnly("org.bytedeco:ffmpeg:7.1-$javacvVersion:$hostClassifier")
    testRuntimeOnly("org.bytedeco:openblas:0.3.28-$javacvVersion:$hostClassifier")
    testImplementation("org.yaml:snakeyaml:2.3")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
