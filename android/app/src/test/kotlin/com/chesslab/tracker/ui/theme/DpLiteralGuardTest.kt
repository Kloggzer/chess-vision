package com.chesslab.tracker.ui.theme

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/** **A `.dp` literal in a UI file is a named component SIZE or a bug.** A RULE, not a count: a cap would
 *  let one literal swap for another. Allowed: a named declaration, `0.dp`, and `Dimens.kt` itself. */
class DpLiteralGuardTest {
    /** It resolves sources against the working directory, so it says how many it found. */
    @Test
    fun theGuardCanSeeTheUiSources() {
        assertTrue(sources().size > MIN_SOURCES, "found ${sources().size} UI files under ${ROOT.absolutePath}")
    }

    @Test
    fun everyDpLiteralInTheUiIsANamedComponentSize() {
        val offenders =
            sources().flatMap { file ->
                file
                    .readLines()
                    .withIndex()
                    .filter { (_, line) -> LITERAL.containsMatchIn(line) && !allowed(line) }
                    .map { (index, line) -> "${file.path}:${index + 1}  ${line.trim()}" }
            }
        assertTrue(
            offenders.isEmpty(),
            "Use a token from ui/theme/Dimens.kt, or name the value as a component size:\n" +
                offenders.joinToString("\n"),
        )
    }

    /** The tokens stay a SCALE: a thirteenth is a design decision and should read as one in the diff. */
    @Test
    fun theScaleHasTwelveTokens() {
        val declarations = LITERAL.findAll(File(ROOT, "ui/theme/Dimens.kt").readText()).count()
        assertTrue(declarations == TOKENS, "Dimens.kt declares $declarations tokens, expected $TOKENS")
    }

    private fun sources(): List<File> =
        listOf(File(ROOT, "ui"), File(ROOT, "speech/ui"))
            .flatMap { it.walkTopDown().filter { file -> file.extension == "kt" } }
            .filterNot { it.path.replace('\\', '/').endsWith("ui/theme/Dimens.kt") }

    private fun allowed(line: String): Boolean {
        val text = line.trimStart()
        if (text.startsWith("//") || text.startsWith("*")) return true
        if (DECLARATION.containsMatchIn(line)) return true
        // Every literal on the line: `padding(0.dp, 13.dp)` is still a bug.
        return LITERAL.findAll(line).all { it.value == "0.dp" }
    }
}

private const val TOKENS = 12

/** Near zero means the walk missed the sources. */
private const val MIN_SOURCES = 40

private val ROOT = File("src/main/kotlin/com/chesslab/tracker")

private val LITERAL = Regex("""\b\d+\.dp\b""")

private val DECLARATION = Regex("""^\s*(private |internal )?(const )?val [A-Z_0-9]+ = \d+\.dp\s*$""")
