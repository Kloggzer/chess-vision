package com.chesslab.arena

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** Ein Commit-Frame mit MEHREREN Plies ist ein Rueckstau-Abfluss, keine Messung (54 von 1242). */
class TruthBundledFrameTest {
    @Test
    fun `plies bundled on one commit frame carry no frame`(
        @TempDir dir: File,
    ) {
        File(dir, "candidate.json").writeText(
            """{"moves": [{"san": "e4", "frame": 240}, {"san": "e5", "frame": 700},""" +
                """ {"san": "Nf3", "frame": 700}, {"san": "Nc6", "frame": 900}]}""",
        )
        assertEquals(listOf(240, -1, -1, 900), truthOf(dir).map { it.frame })
    }

    @Test
    fun `a bundled reference ply is not scored for lag`(
        @TempDir dir: File,
    ) {
        File(dir, "candidate.json").writeText(
            """{"moves": [{"san": "e4", "frame": 240}, {"san": "e5", "frame": 700}, {"san": "Nf3", "frame": 700}]}""",
        )
        val scored = score(truthOf(dir), listOf(RunPly("e4", 250, 0.0), RunPly("e5", 710, 0.0), RunPly("Nf3", 720, 0.0)))
        assertEquals(3, scored.found.size)
        assertEquals(listOf(10L), scored.lag)
    }
}
