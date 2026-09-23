package com.chesslab.arena

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.io.TempDir
import java.io.File

class TruthTest {
    @org.junit.jupiter.api.Test
    fun `candidate json carries frames`(
        @TempDir dir: File,
    ) {
        File(dir, "candidate.json").writeText(
            """{"moves": [{"san": "e4", "frame": 234}, {"san": "e5", "frame": 310}]}""",
        )
        assertEquals(listOf(TruthPly("e4", 234), TruthPly("e5", 310)), truthOf(dir))
    }

    @org.junit.jupiter.api.Test
    fun `a pgn falls back to move order`(
        @TempDir dir: File,
    ) {
        File(dir, "reference.pgn").writeText("[Event \"x\"]\n\n1. e4 e5 2. Nf3 {a comment} Nc6 1-0\n")
        assertEquals(listOf("e4", "e5", "Nf3", "Nc6"), truthOf(dir).map { it.san })
        assertEquals(listOf(-1, -1, -1, -1), truthOf(dir).map { it.frame })
    }

    @org.junit.jupiter.api.Test
    fun `no reference is an error, never an empty label`(
        @TempDir dir: File,
    ) {
        assertThrows<IllegalStateException> { truthOf(dir) }
    }
}
