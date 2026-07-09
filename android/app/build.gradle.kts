plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.plugin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

android {
    namespace = "com.chesslab.tracker"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.chesslab.tracker"
        minSdk = 29
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    testOptions {
        unitTests.all {
            it.useJUnitPlatform()
        }
    }
}

// Unit tests run on the desktop JVM: keep the Android-only ONNX Runtime AAR off
// their classpath so the JVM artifact (with desktop natives) resolves instead.
configurations.matching { it.name.contains("UnitTest") }.configureEach {
    exclude(group = "com.microsoft.onnxruntime", module = "onnxruntime-android")
}

dependencies {
    implementation(project(":engine"))

    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.material3)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.activity.compose)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.lifecycle.service)
    implementation(libs.navigation.compose)
    implementation(libs.compose.material.icons)
    debugImplementation(libs.compose.ui.tooling)

    // CameraX
    implementation(libs.camera.core)
    implementation(libs.camera.camera2)
    implementation(libs.camera.lifecycle)
    implementation(libs.camera.view)

    // OpenCV
    implementation(libs.opencv)

    // DataStore
    implementation(libs.datastore.preferences)

    // KotlinX
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)

    // Ktor CIO (phase 06: LAN spectator server)
    implementation(libs.ktor.server.cio)
    implementation(libs.ktor.server.content.negotiation)
    implementation(libs.ktor.serialization.kotlinx.json)

    // chesslib (phase 07: PGN result determination)
    implementation(libs.chesslib)

    // ZXing (phase 06: QR code)
    implementation(libs.zxing.core)

    // ONNX Runtime (phase 05: CNN safeguard). Device uses the Android AAR; JVM
    // unit tests swap in the desktop artifact (same ai.onnxruntime API) because
    // the AAR only ships Android ABIs.
    implementation(libs.onnxruntime.android)
    testImplementation(libs.onnxruntime.jvm)

    // Unit tests (JVM, JUnit5)
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.ktor.server.test.host)
    testRuntimeOnly(libs.junit.platform.launcher)
}
