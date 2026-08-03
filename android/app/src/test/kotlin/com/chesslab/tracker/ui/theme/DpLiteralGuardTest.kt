package com.chesslab.tracker.ui.theme

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/**
 * **A `.dp` literal in a UI file is either a component SIZE with a name, or it is a bug.**
 *
 * Before specs/47 the tree held 26 distinct `dp` values over 195 uses and no token to name any of
 * them: the horizontal screen margin was 12 dp on four screens, 14 on the board and 0 on the
 * camera, and the minimum touch height was 44, 48 and 52 in three different files. `Dimens.kt`
 * collapsed that into 12 tokens.
 *
 * This test is what stops it drifting back. It is deliberately a RULE rather than a count: a cap on
 * the number of literals would let one be swapped for another, and it would have to be edited every
 * time a legitimate component size is added. What it allows is exactly what the design allows —
 *
 * - a declaration: `private val POSITION_COLUMN_WIDTH = 94.dp`, a size that belongs to the thing
 *   that draws it and would turn a token file into a dumping ground;
 * - `0.dp`, which is the absence of a value rather than a value;
 * - `Dimens.kt` itself, which is where the tokens are declared.
 *
 * Everything else — `padding(13.dp)`, `spacedBy(6.dp)` — fails, and the fix is a token.
 */
class DpLiteralGuardTest {
    /**
     * A guard that reads no files passes for the wrong reason, and this one resolves its sources
     * against the working directory — so it says out loud how many it found.
     */
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

    /**
     * The tokens themselves must stay a SCALE, not a collection. Twelve is the whole point; a
     * thirteenth is a design decision and should read as one in the diff.
     */
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
        // Every literal on the line, not merely one of them: `padding(0.dp, 13.dp)` is still a bug.
        return LITERAL.findAll(line).all { it.value == "0.dp" }
    }
}

private const val TOKENS = 12

/** There were 60 UI files when this was written; anything near zero means the walk missed them. */
private const val MIN_SOURCES = 40

/** The test runs with the module directory as its working directory. */
private val ROOT = File("src/main/kotlin/com/chesslab/tracker")

private val LITERAL = Regex("""\b\d+\.dp\b""")

/** `private val NAME = 94.dp` — a component size, named where it is drawn. */
private val DECLARATION = Regex("""^\s*(private |internal )?(const )?val [A-Z_0-9]+ = \d+\.dp\s*$""")
