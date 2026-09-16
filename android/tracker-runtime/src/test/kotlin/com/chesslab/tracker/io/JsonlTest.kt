package com.chesslab.tracker.io

import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/**
 * Dieselbe Politik wie `chesslab.ioutil.read_jsonl` und `lib/jsonl.ts`: der Zeilenumbruch
 * entscheidet, ob eine kaputte Zeile ein laufender Schreiber oder Beschaedigung ist.
 */
class JsonlTest {
    @TempDir
    lateinit var dir: File

    private fun file(text: String): File = File(dir, "rows.jsonl").also { it.writeText(text) }

    @Test
    fun `a half written LAST line falls away`() {
        val rows = Jsonl.rows(file("{\"a\":1}\n{\"a\":2}\n{\"a\":"))
        assertEquals(listOf("1", "2"), rows.map { it.getValue("a").jsonPrimitive.content })
    }

    @Test
    fun `a broken line in the MIDDLE is loud`() {
        val broken = file("{\"a\":1}\n{\"a\":\n{\"a\":2}\n")
        assertThrows(JsonlCorrupt::class.java) { Jsonl.rows(broken) }
    }

    @Test
    fun `a broken line that ended with a newline is no running writer`() {
        assertThrows(JsonlCorrupt::class.java) { Jsonl.rows(file("{\"a\":1}\n{\"a\":\n")) }
    }

    @Test
    fun `a torn CR is no newline`() {
        val rows = Jsonl.rows(file("{\"a\":1}\r\n{\"a\":\r"))
        assertEquals(1, rows.size)
    }

    @Test
    fun `blank lines and a missing file are no rows`() {
        assertEquals(1, Jsonl.rows(file("\n{\"a\":1}\n\n")).size)
        assertEquals(emptyList<Any>(), Jsonl.rows(File(dir, "gone.jsonl")))
    }

    /** Die volle Platte trifft die Nebendatei — und die muss danach weg sein, wie in
     *  `chesslab.ioutil` und `lib/atomic.ts`. */
    @Test
    fun `a failed write leaves no side file behind`() {
        // Ein Verzeichnis an der Stelle des Ziels: das Umhaengen scheitert, die Nebendatei steht.
        File(dir, "gesperrt").mkdirs()
        assertThrows(Exception::class.java) { writeAtomic(File(dir, "gesperrt"), "{}") }

        assertFalse(File(dir, "gesperrt.tmp").exists(), "die Nebendatei blieb liegen")
    }
}
