package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** `retract: true` ist ein Grabstein (`labeling.load_corrections` `pop`t den Schluessel). */
class CorrectionRetractTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun `a retracted correction does not survive into the pack`() {
        val file =
            ledger(
                """{"session_id":"s","frame":"000100","square":"e4","label":"wP","ts":"2026-09-01T00:00:00+00:00"}""",
                """{"session_id":"s","frame":"000100","square":"e4","label":"wP","retract":true,"ts":"2026-09-02T00:00:00+00:00"}""",
            )

        assertEquals(emptyMap<String, Map<String, String>>(), correctionMap(file, "s"))
    }

    @Test
    fun `a correction reapplied after its retraction counts again`() {
        val file =
            ledger(
                """{"session_id":"s","frame":"000100","square":"e4","label":"wP","ts":"2026-09-01T00:00:00+00:00"}""",
                """{"session_id":"s","frame":"000100","square":"e4","label":"wP","retract":true,"ts":"2026-09-02T00:00:00+00:00"}""",
                """{"session_id":"s","frame":"000100","square":"e4","label":"bN","ts":"2026-09-03T00:00:00+00:00"}""",
            )

        assertEquals(mapOf("000100" to mapOf("e4" to "bN")), correctionMap(file, "s"))
    }

    @Test
    fun `a retraction only takes back its own square`() {
        val file =
            ledger(
                """{"session_id":"s","frame":"000100","square":"e4","label":"wP","ts":"2026-09-01T00:00:00+00:00"}""",
                """{"session_id":"s","frame":"000100","square":"d4","label":"bB","ts":"2026-09-01T00:00:00+00:00"}""",
                """{"session_id":"s","frame":"000100","square":"e4","label":"wP","retract":true,"ts":"2026-09-02T00:00:00+00:00"}""",
            )

        assertEquals(mapOf("000100" to mapOf("d4" to "bB")), correctionMap(file, "s"))
    }

    private fun ledger(vararg lines: String): File = File(dir, "corrections.jsonl").apply { writeText(lines.joinToString("\n") + "\n") }
}
