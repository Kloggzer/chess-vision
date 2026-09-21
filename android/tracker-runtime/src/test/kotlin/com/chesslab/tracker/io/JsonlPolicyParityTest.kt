package com.chesslab.tracker.io

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/**
 * Die Politik der drei Treuhaender, Zusicherung fuer Zusicherung — hier die Kotlin-Seite.
 * Zwillinge: `tests/test_io_policy_parity.py`, `lib/io-policy-parity.test.ts`. Wer eine Antwort
 * hier aendert, aendert sie dort mit. */
class JsonlPolicyParityTest {
    @TempDir
    lateinit var dir: File

    private fun file(text: String): File = File(dir, "rows.jsonl").also { it.writeText(text) }

    @Test
    fun `1 half last line without newline falls away`() {
        assertEquals(1, Jsonl.rows(file("{\"a\":1}\n{\"a\":")).size)
    }

    @Test
    fun `2 broken last line WITH newline is damage`() {
        assertThrows(JsonlCorrupt::class.java) { Jsonl.rows(file("{\"a\":1}\n{\"a\":\n")) }
    }

    @Test
    fun `3 broken line in the middle throws`() {
        assertThrows(JsonlCorrupt::class.java) { Jsonl.rows(file("{\"a\":1}\n{\"a\":\n{\"b\":2}\n")) }
    }

    @Test
    fun `4 blank lines are skipped`() {
        assertEquals(1, Jsonl.rows(file("\n{\"a\":1}\n\n\n")).size)
    }

    @Test
    fun `5 valid JSON that is no object is skipped`() {
        for (line in listOf("5", "[1,2]", "null", "\"hi\"")) {
            assertEquals(1, Jsonl.rows(file("$line\n{\"a\":1}\n")).size, line)
        }
    }

    @Test
    fun `6 a leading BOM is swallowed`() {
        assertEquals(1, Jsonl.rows(file("\uFEFF{\"a\":1}\n")).size)
    }

    @Test
    fun `7 CRLF and LF both read`() {
        assertEquals(2, Jsonl.rows(file("{\"a\":1}\r\n{\"b\":2}\n")).size)
    }

    @Test
    fun `8 a failed write leaves no side file behind`() {
        File(dir, "gesperrt").mkdirs()
        assertThrows(Exception::class.java) { writeAtomic(File(dir, "gesperrt"), "{}") }
        assertFalse(File(dir, "gesperrt.tmp").exists(), "die Nebendatei blieb liegen")
    }

    // 9 (Anhaengen) hat Kotlin bewusst nicht: gemessen null Stellen, die an eine fremde oder
    // aeltere Datei anhaengen — `SessionTimeline` und `SessionRecorder` kuerzen im Konstruktor.

    /** Anders als Python (das auf einem Verzeichnis wirft) ist hier BEIDES leer — auf dem Geraet
     *  soll ein kaputter Pfad keinen Lauf abbrechen. */
    @Test
    fun `10 missing file and a directory are no rows`() {
        assertEquals(emptyList<Any>(), Jsonl.rows(File(dir, "gone.jsonl")))
        assertEquals(emptyList<Any>(), Jsonl.rows(file("")))
        File(dir, "adir.jsonl").mkdirs()
        assertEquals(emptyList<Any>(), Jsonl.rows(File(dir, "adir.jsonl")))
    }
}
