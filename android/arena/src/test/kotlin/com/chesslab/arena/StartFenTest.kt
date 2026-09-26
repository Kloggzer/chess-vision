package com.chesslab.arena

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** Ein Mitschnitt aus laufender Partie: ab der Grundstellung ist schon der erste Zug der Referenz unspielbar. */
class StartFenTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun `a reference pgn is read from the candidate's start_fen`() {
        File(dir, "candidate.json").writeText("""{"start_fen":"$MIDGAME","moves":[]}""")
        File(dir, "reference.pgn").writeText("28. Rxc8+ Qxc8 *")

        assertEquals(listOf("Rxc8+", "Qxc8"), truthOf(dir).map { it.san })
    }

    @Test
    fun `a swap in a mid-game recording is reordered, not two phantoms`() {
        File(dir, "candidate.json").writeText("""{"start_fen":"$MIDGAME","moves":[]}""")
        File(dir, "reference.pgn").writeText("28. h3 h6 29. a3 Kh8 *")
        val run = listOf("a3", "Kh8", "h3", "h6").mapIndexed { i, san -> RunPly(san, i * 10L, 0.0) }

        val scored = score(truthOf(dir), run, startFenOf(dir))

        assertEquals(0, scored.invented.size, "phantoms: ${scored.invented.map { it.san }}")
        assertEquals(4, scored.found.size)
        assertEquals(4, scored.reordered)
    }

    private companion object {
        const val MIDGAME = "2r3k1/5ppp/4qnb1/1p1p4/pB2P3/5P2/P1R1B1PP/2R3K1 w - - 0 28"
    }
}
