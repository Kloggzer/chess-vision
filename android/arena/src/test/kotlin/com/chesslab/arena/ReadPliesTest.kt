package com.chesslab.arena

import com.chesslab.tracker.io.JsonlCorrupt
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** Fremde Dateien: halbe LETZTE Zeile weg, kaputte MITTENDRIN wirft — nie ein Ply mit `frame = -1`. */
class ReadPliesTest {
    private fun file(
        dir: File,
        body: String,
    ) = File(dir, "plies.jsonl").apply { writeText(body) }

    @Test
    fun `a torn last line is dropped, not read as a frameless ply`(
        @TempDir dir: File,
    ) {
        val f = file(dir, """{"ply": 1, "san": "e4", "frame": 240}""" + "\n" + """{"ply": 2, "san": "e5", "fra""")
        assertEquals(listOf(RunPly("e4", 240, 0.0)), readPlies(f))
    }

    @Test
    fun `a corrupt line in the middle is an error, never a ply`(
        @TempDir dir: File,
    ) {
        val f =
            file(
                dir,
                """{"ply": 1, "san": "e4", "frame": 240}""" + "\n" +
                    """{"ply": 2, "san": "e5", "fra""" + "\n" +
                    """{"ply": 3, "san": "Nf3", "frame": 360}""" + "\n",
            )
        assertThrows<JsonlCorrupt> { readPlies(f) }
    }

    @Test
    fun `complete rows keep their frames`(
        @TempDir dir: File,
    ) {
        val f = file(dir, """{"ply": 1, "san": "e4", "frame": 240}""" + "\r\n" + """{"ply": 2, "san": "e5", "frame": 280}""" + "\r\n")
        assertEquals(listOf(240L, 280L), readPlies(f).map { it.frame })
    }

    @Test
    fun `an unframed run ply is left out of the lag`() {
        val scored = score(listOf(TruthPly("e4", 100), TruthPly("e5", 200)), listOf(RunPly("e4", -1, 0.0), RunPly("e5", 210, 0.0)))
        assertEquals(listOf(10L), scored.lag)
    }
}
