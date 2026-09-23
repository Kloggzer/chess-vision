package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

class LoggedQuadTest {
    @TempDir
    lateinit var dir: File

    private fun log(vararg rows: String) = File(dir, "log.jsonl").writeText(rows.joinToString("\n", postfix = "\n"))

    @Test
    fun `the first row's corners are the phone's quad`() {
        log("""{"corners":[[1,2],[3.5,4],[5,6],[7,8]]}""", """{"corners":[[0,0],[0,0],[0,0],[0,0]]}""")
        assertArrayEquals(floatArrayOf(1f, 2f, 3.5f, 4f, 5f, 6f, 7f, 8f), loggedQuad(dir))
    }

    @Test
    fun `no log, no corners or not four corners is no quad`() {
        assertNull(loggedQuad(dir))
        log("""{"ply":1}""", """{"corners":[[1,2],[3,4],[5,6],[7,8]]}""")
        assertNull(loggedQuad(dir))
        log("""{"corners":[[1,2],[3,4],[5,6]]}""")
        assertNull(loggedQuad(dir))
    }
}
