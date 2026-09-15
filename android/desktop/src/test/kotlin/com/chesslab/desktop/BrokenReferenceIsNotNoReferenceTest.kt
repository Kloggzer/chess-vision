package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/**
 * `labelPlies` faellt von einer unlesbaren `reference.pgn` still auf `candidate.json` zurueck —
 * also wird der Tracker gegen SEINE EIGENE Ausgabe benotet, und der Satz meldet dann
 * found = alles. Der Docstring derselben Funktion nennt genau das falsch ("scoring against the
 * guess punishes the tracker that read it right"). Gefunden von Codex, 2026-09-15.
 */
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
