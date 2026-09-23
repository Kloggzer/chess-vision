package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** Auf einem Mitschnitt aus laufender Partie fiel `fensAfter` schon auf dem ersten SAN aus — und mit ihm die
 *  Reorder-Erkennung. */
class StartFenScoringTest {
    @TempDir
    lateinit var dir: File

    private val label = plies("h3", "h6", "a3", "Kh8")
    private val run = plies("a3", "Kh8", "h3", "h6")

    @Test
    fun `eine Vertauschung mitten in der Partie ist reordered, nicht Phantom`() {
        val score = scoreMoves(label, run, MIDGAME)

        assertTrue(score.invented.isEmpty(), "kein Phantom: ${score.invented.map { it.san }}")
        assertTrue(score.missed.isEmpty(), "kein Miss: ${score.missed.map { it.san }}")
        assertEquals(4, score.found.size)
        assertEquals(4, score.reorderedPlies)
    }

    /** Von der Grundstellung aus ist `Kh8` unspielbar, und aus einer Vertauschung werden zwei Phantome. */
    @Test
    fun `von der Grundstellung aus zaehlt dieselbe Vertauschung zwei Phantome`() {
        val score = scoreMoves(label, run)

        assertEquals(2, score.invented.size, "gemessen wurden: ${score.invented.map { it.san }}")
        assertEquals(2, score.missed.size)
        assertTrue(score.reordered.isEmpty())
    }

    @Test
    fun `startFenOf liest die Stellung aus der candidate json`() {
        val cand = File(dir, "candidate.json")
        cand.writeText("""{"start_fen":"$MIDGAME","moves":[]}""")
        assertEquals(MIDGAME, startFenOf(cand))

        cand.writeText("""{"moves":[]}""")
        assertTrue(startFenOf(cand).startsWith("rnbqkbnr/"), "ohne Angabe die Grundstellung")
    }

    /** Sonst wirft `loadFromSan`, und `labelPlies` faellt auf die Ausgabe zurueck, die es benoten soll. */
    @Test
    fun `eine reference pgn wird ab dem start_fen gelesen`() {
        File(dir, "candidate.json").writeText(
            """{"start_fen":"$MIDGAME","moves":[{"ply":1,"san":"Rxc8+","frame":7,"decider":"diff"}]}""",
        )
        File(dir, "reference.pgn").writeText("28. Rxc8+ Qxc8 *")

        val plies = labelPlies(File(dir, "candidate.json"))

        assertEquals(listOf("Rxc8+", "Qxc8"), plies.map { it.san })
        assertEquals(7, plies.first().frame, "der Kandidat liefert weiter die Bilder")
    }

    private fun plies(vararg sans: String): List<ScoredPly> = sans.mapIndexed { i, san -> ScoredPly(san, i * 30, "diff") }

    private companion object {
        const val MIDGAME = "2r3k1/5ppp/4qnb1/1p1p4/pB2P3/5P2/P1R1B1PP/2R3K1 w - - 0 28"
    }
}
