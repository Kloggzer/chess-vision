package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** Eine unlesbare `reference.pgn` fiel still auf `candidate.json` zurueck: der Tracker wurde
 *  gegen seine eigene Ausgabe benotet (found = alles). Codex, 2026-09-15. */
class BrokenReferenceIsNotNoReferenceTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun `a reference that is on disk but unreadable is refused, not ignored`() {
        File(dir, "candidate.json").writeText(
            """{"moves":[{"san":"e4","frame":10,"decider":"cnn"},{"san":"e5","frame":20,"decider":"cnn"}]}""",
        )
        File(dir, "reference.pgn").writeText("\n\n")

        assertThrows(IllegalStateException::class.java) { labelPlies(File(dir, "candidate.json")) }
    }
}
