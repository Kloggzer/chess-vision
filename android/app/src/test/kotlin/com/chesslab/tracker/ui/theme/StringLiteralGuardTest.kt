package com.chesslab.tracker.ui.theme

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/** **No user-visible word written in Kotlin in a localized package**: 168 of 171 resources once sat unused
 *  beside inline words. Narrow on purpose — only literals passed to a text sink. Not a proof: a literal on
 *  its own line or an assembled word escapes. `ui/debug/` stays English (specs/51). */
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

/** Each conversion phase adds its own package; specs/54 phase 04 finishes the list. */
private val LOCALIZED = emptySet<String>()

/** Near zero means the walk missed the sources. */
private const val MIN_SOURCES = 40

private val ROOT = File("src/main/kotlin/com/chesslab/tracker")

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

private val SINK_ARGUMENTS = listOf("contentDescription", "title", "body", "verb", "label", "summary", "placeholder")

private val SINK_CALL = Regex("""\b(${SINKS.joinToString("|")})\(\s*"""")

private val SINK_ARGUMENT = Regex("""\b(${SINK_ARGUMENTS.joinToString("|")})\s*=\s*"""")
