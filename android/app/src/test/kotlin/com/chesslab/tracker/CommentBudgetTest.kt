package com.chesslab.tracker

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/** A ratchet: gaining a block or paying one off without lowering the entry both fail. [LIMIT] is the hard
 *  ceiling; three is the target. */
class CommentBudgetTest {
    @Test
    fun theGuardCanSeeTheKotlinSources() {
        assertTrue(sources().size > MIN_SOURCES, "found ${sources().size} sources under ${ROOT.absolutePath}")
    }

    @Test
    fun noFileGainsALongCommentBlock() {
        val gained =
            counted()
                .filter { (path, blocks) -> blocks > (budget[path] ?: 0) }
                .map { (path, blocks) -> "$path  ${budget[path] ?: 0} -> $blocks" }
        assertTrue(
            gained.isEmpty(),
            "Comment blocks of $LIMIT+ lines were added. Say it in fewer lines, or move the prose to " +
                "docs/ and leave a one-line pointer:\n" + gained.joinToString("\n"),
        )
    }

    /** Without it a cleaned-up file keeps its old allowance. */
    @Test
    fun theBudgetMatchesWhatTheTreeActuallyCarries() {
        val counts = counted()
        val stale =
            budget
                .filter { (path, blocks) -> (counts[path] ?: 0) < blocks }
                .map { (path, blocks) -> "$path  $blocks -> ${counts[path] ?: 0}" }
        assertTrue(
            stale.isEmpty(),
            "Comment debt was paid off but not recorded. Run:\n" +
                "  uv run python android/scripts/comment_budget.py\n" + stale.joinToString("\n"),
        )
    }

    private fun counted(): Map<String, Int> =
        sources()
            .associate { it.toRelativeString(ROOT).replace(File.separatorChar, '/') to blocks(it) }
            .filterValues { it > 0 }

    private fun blocks(file: File): Int = commentBlocks(file.readText())

    private fun sources(): List<File> =
        ROOT
            .walkTopDown()
            .onEnter { it.name !in SKIP }
            .filter { it.extension == "kt" && it.path.replace(File.separatorChar, '/').contains("/src/") }
            .toList()
}

/** Zeilen in einem rohen String zaehlen NICHT — `startsWith` allein las sie als Kommentar. */
internal fun commentBlocks(text: String): Int {
    var found = 0
    var run = 0
    var quotes = 0
    for (line in text.lineSequence()) {
        val started = quotes % 2 == 1
        quotes += Regex("\"\"\"").findAll(line).count()
        val body = line.trimStart()
        if (!started && (body.startsWith("//") || body.startsWith("*") || body.startsWith("/*"))) {
            run++
        } else {
            if (run >= LIMIT) found++
            run = 0
        }
    }
    return found + if (run >= LIMIT) 1 else 0
}

/** Keep in sync with `LIMIT` in `android/scripts/comment_budget.py`. */
private const val LIMIT = 5

/** Near zero means the walk missed the sources. */
private const val MIN_SOURCES = 400

private val SKIP = setOf("build", "bin", "third_party", ".gradle")

private val ROOT = File("..").canonicalFile

private val budget: Map<String, Int> =
    File(ROOT, "config/comment-budget.txt")
        .readLines()
        .filterNot { it.isBlank() || it.startsWith("#") }
        .associate { it.substringBeforeLast(' ') to it.substringAfterLast(' ').toInt() }
