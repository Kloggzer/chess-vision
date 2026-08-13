package com.chesslab.tracker.ui.theme

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/**
 * **In a localized package, no user-visible word may be written in Kotlin.**
 *
 * `res/values/strings.xml` held 171 entries on 2026-08-13 and exactly three were referenced by
 * anything; the whole Compose surface had its words inline. Once those words come back into the
 * resources they have to STAY there, or the next screen quietly forks the vocabulary again — which
 * is how the file became an archive the first time.
 *
 * The rule is deliberately narrow: a literal is a finding only where it is passed to a **text
 * sink**, i.e. something that renders words at a human ([SINKS], plus the named arguments in
 * [SINK_ARGUMENTS]). Route names, JSON keys, SAN, square names, `Locale.ROOT` format strings and
 * log lines are all string literals too and none of them are translatable.
 *
 * **What it does not see**, stated so nobody mistakes it for a proof: a literal that sits alone on
 * its own line as a multi-line named argument, and any word assembled from pieces. It is a ratchet
 * against drift, not a certificate. Each conversion phase reports its own before/after count from
 * `grep -rhoE '"[A-Z][^"]{2,}"' <pkg>` beside it.
 *
 * [LOCALIZED] grows one package at a time, as each is converted. `ui/debug/` and the tuning knobs
 * behind the developer door are never in it: their vocabulary IS English (`census threshold`), and
 * translating it makes it unfindable (specs/51).
 */
class StringLiteralGuardTest {
    /** A guard that reads no files passes for the wrong reason, so it says how many it found. */
    @Test
    fun theGuardCanSeeTheUiSources() {
        assertTrue(sources().size > MIN_SOURCES, "found ${sources().size} UI files under ${ROOT.absolutePath}")
    }

    @Test
    fun aLocalizedPackageNeverPassesALiteralToATextSink() {
        val offenders =
            sources()
                .filter { localized(it) }
                .flatMap { file ->
                    file
                        .readLines()
                        .withIndex()
                        .filter { (_, line) -> offends(line) }
                        .map { (index, line) -> "${file.path}:${index + 1}  ${line.trim()}" }
                }
        assertTrue(
            offenders.isEmpty(),
            "Move the words into res/values/strings.xml and read them with stringResource():\n" +
                offenders.joinToString("\n"),
        )
    }

    private fun sources(): List<File> =
        listOf(File(ROOT, "ui"), File(ROOT, "speech/ui"))
            .filter { it.isDirectory }
            .flatMap { it.walkTopDown().filter { file -> file.extension == "kt" } }

    private fun localized(file: File): Boolean {
        val path = file.path.replace('\\', '/')
        return LOCALIZED.any { path.contains("/ui/$it/") }
    }

    private fun offends(line: String): Boolean {
        val text = line.trimStart()
        if (text.startsWith("//") || text.startsWith("*")) return false
        return SINK_CALL.containsMatchIn(line) || SINK_ARGUMENT.containsMatchIn(line)
    }
}

/**
 * Packages under `ui/` whose user-visible strings are resources. Each conversion phase adds its
 * own; specs/54 phase 04 finishes the list.
 */
private val LOCALIZED = emptySet<String>()

/** There were 60 UI files when this was written; anything near zero means the walk missed them. */
private const val MIN_SOURCES = 40

/** The test runs with the module directory as its working directory. */
private val ROOT = File("src/main/kotlin/com/chesslab/tracker")

/** Composables whose first positional argument is words on a screen. */
private val SINKS =
    listOf(
        "Text",
        "SectionHeading",
        "FilledAction",
        "OutlineAction",
        "DisclosureRow",
        "MenuToggle",
        "Figure",
        "EmptyState",
        "ConfirmDialog",
    )

/** Named arguments that carry words wherever they appear, including `contentDescription`. */
private val SINK_ARGUMENTS = listOf("contentDescription", "title", "body", "verb", "label", "summary", "placeholder")

private val SINK_CALL = Regex("""\b(${SINKS.joinToString("|")})\(\s*"""")

private val SINK_ARGUMENT = Regex("""\b(${SINK_ARGUMENTS.joinToString("|")})\s*=\s*"""")
