plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.plugin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ktlint) apply false
    alias(libs.plugins.detekt) apply false
    alias(libs.plugins.kover)
}

subprojects { apply(plugin = "org.jetbrains.kotlinx.kover") }

dependencies {
    listOf(":core-engine", ":core-geometry", ":core-cnn", ":tracker-runtime", ":app")
        .forEach { kover(project(it)) }
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
            // `allRules` is a no-op while `buildUponDefaultConfig` is on: detekt's AllRulesConfig
            // asks the ORIGINAL config for `active`, and that config is already merged with the
            // defaults, so every `active: false` in default-detekt-config.yml still wins. Off, the
            // rules all switch on and thresholds still fall back to the defaults. The pair moves
            // together - re-enabling one without the other silently unenforces the whole extra set.
            buildUponDefaultConfig = false
            allRules = true
            baseline = file("${rootDir}/config/detekt/baseline-${project.name}.xml")
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
