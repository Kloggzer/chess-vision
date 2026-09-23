package com.chesslab.tracker.io

import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** What `JsonlPolicyParityTest` does not pin: the rows' content, and a CR that is no newline. */
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
    fun `a torn CR is no newline`() {
        val rows = Jsonl.rows(file("{\"a\":1}\r\n{\"a\":\r"))
        assertEquals(1, rows.size)
    }
}
