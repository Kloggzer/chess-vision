plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

// com.android.library because it consumes :core-geometry (an AAR). SquareClassifier is
// an interface here - the ONNX Runtime implementation lives in :app (phase 05c).
// Unit tests run on the host JVM: :core-cnn:testDebugUnitTest.
android {
    namespace = "com.chesslab.cnn"
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
    api(project(":core-geometry"))
    implementation(libs.chesslib)

    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
}
