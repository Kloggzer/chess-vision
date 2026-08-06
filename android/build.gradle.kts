plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.plugin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ktlint) apply false
    alias(libs.plugins.detekt) apply false
}

subprojects {
    plugins.withId("org.jlleitschuh.gradle.ktlint") {
        configure<org.jlleitschuh.gradle.ktlint.KtlintExtension> {
            version.set("1.5.0")
        }
    }
    plugins.withId("io.gitlab.arturbosch.detekt") {
        configure<io.gitlab.arturbosch.detekt.extensions.DetektExtension> {
            config.setFrom(files("${rootDir}/config/detekt/detekt.yml"))
            buildUponDefaultConfig = true
            allRules = false
        }
    }
}

// The bytedeco natives are published per OS+arch as classified jars. Hardcoding one classifier
// makes the build silently Windows-only, which is fine for a unit test on this machine and wrong
// for anything that ships. Resolved once here so every module asks the same question.
val bytedecoClassifier: String by extra(
    run {
        val os = System.getProperty("os.name").lowercase()
        val arch = System.getProperty("os.arch").lowercase()
        val platform =
            when {
                os.startsWith("windows") -> "windows"
                os.startsWith("mac") -> "macosx"
                else -> "linux"
            }
        val cpu = if (arch in setOf("aarch64", "arm64")) "arm64" else "x86_64"
        "$platform-$cpu"
    },
)
