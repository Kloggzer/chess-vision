package com.chesslab.tracker

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/**
 * A ratchet, not a rule: `config/comment-budget.txt` holds what each file carries today, and both
 * directions fail — gaining a block, or paying one off without lowering the entry. Target is three
 * comment lines and five at the outside; [LIMIT] is only where enforcement stands today.
 */
class CommentBudgetTest {
    /** A guard that reads no files passes for the wrong reason. */
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

    /**
     * The other half of the ratchet. Without it a cleaned-up file keeps its old allowance, and the
     * budget silently becomes a ceiling nobody is under.
     */
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

    /** Runs of consecutive comment lines. Line comments, block openers and KDoc bodies all count. */
    private fun blocks(file: File): Int {
        var found = 0
        var run = 0
        file.forEachLine { line ->
            val text = line.trimStart()
            if (text.startsWith("//") || text.startsWith("*") || text.startsWith("/*")) {
                run++
            } else {
                if (run >= LIMIT) found++
                run = 0
            }
        }
        return found + if (run >= LIMIT) 1 else 0
    }

    private fun sources(): List<File> =
        ROOT
            .walkTopDown()
            .onEnter { it.name !in SKIP }
            .filter { it.extension == "kt" && it.path.replace(File.separatorChar, '/').contains("/src/") }
            .toList()
}

/** Keep in sync with `LIMIT` in `scripts/comment_budget.py`. */
private const val LIMIT = 8

/** There were 605 Kotlin sources when this was written; anything near zero means the walk missed them. */
private const val MIN_SOURCES = 400

private val SKIP = setOf("build", "bin", "third_party", ".gradle")

/** The test runs with the module directory as its working directory. */
private val ROOT = File("..").canonicalFile

private val budget: Map<String, Int> =
    File(ROOT, "config/comment-budget.txt")
        .readLines()
        .filterNot { it.isBlank() || it.startsWith("#") }
        .associate { it.substringBeforeLast(' ') to it.substringAfterLast(' ').toInt() }
