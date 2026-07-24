plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

// com.android.library (not java-library): org.opencv:opencv is an AAR - it ships
// org.opencv.android.OpenCVLoader, which a plain JVM module cannot consume.
// Unit tests still run on the host JVM: the task is :core-geometry:testDebugUnitTest.
android {
    namespace = "com.chesslab.geometry"
    compileSdk = 35

    defaultConfig {
        minSdk = 29
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    testOptions {
        unitTests.all {
            it.useJUnitPlatform()
        }
    }
}

dependencies {
    api(project(":core-engine"))
    implementation(libs.opencv)

    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)

    // Host-only natives for the clip-replay / warp parity tests: JavaCV decodes the
    // shared Blender test clips (../../tests/data/testclips) with FFmpeg and warps
    // them with OpenCV on the desktop JVM. The classified jars carry the DLLs.
    testImplementation(libs.javacv)
    testRuntimeOnly(variantOf(libs.bytedeco.opencv) { classifier("windows-x86_64") })
    testRuntimeOnly(variantOf(libs.bytedeco.ffmpeg) { classifier("windows-x86_64") })
    testRuntimeOnly(variantOf(libs.bytedeco.openblas) { classifier("windows-x86_64") })
    testImplementation(libs.snakeyaml)
}
