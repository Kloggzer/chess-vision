@file:Suppress("UnstableApiUsage")

rootProject.name = "chesslab-tracker"

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
    }
}

include(":core-engine")
include(":engine-stillness")
include(":engine-changeset")
include(":core-geometry")
include(":core-cnn")
include(":tracker-runtime")
include(":desktop")
include(":arena")
include(":app")
