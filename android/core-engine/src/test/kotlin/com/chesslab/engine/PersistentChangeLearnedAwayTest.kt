package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

// Eine stehende Aenderung lernt sich weg: derselbe `diff` Frame fuer Frame, und der EMA holt ihn
// ein. NICHT die Ursache des c8-Falls — dort nullt `applyTaints` das `z` direkt. Eigenstaendige
// Eigenschaft des Rauschmodells; dieser Test haelt sie fest.
class PersistentChangeLearnedAwayTest {
    /** `z` NACH [frames] Aktualisierungen — `stepped(0)` ist der erste Blick. */
    private fun stepped(
        frames: Int,
        exclude: Long,
    ): DoubleArray {
        val noise = SquareNoise()
        val diffs = DoubleArray(Squares.COUNT)
        val out = DoubleArray(Squares.COUNT)
        // Feld 0 springt auf einen grossen Wert und BLEIBT dort — die Figur zieht nicht weiter.
        diffs[0] = 77.0
        repeat(frames) {
            noise.z(diffs, out)
            noise.update(diffs, exclude = exclude)
        }
        return noise.z(diffs, out)
    }

    @Test
    fun `a standing change falls under zThr in five frames`() {
        // Das ist die VORGABE (`noiseOutlierSigma = 0`): ein Drittel einer Sekunde bei 15 fps.
        assertTrue(stepped(frames = 0, exclude = 0L)[0] > 12.0, "der erste Blick sieht es klar")
        assertTrue(stepped(frames = 5, exclude = 0L)[0] < 3.0, "nach 5 Frames unter zThr")
        assertTrue(stepped(frames = 30, exclude = 0L)[0] < 1.0, "nach 2 s ist es Rauschen")
    }

    @Test
    fun `excluding the square is what keeps it visible`() {
        // Das ist der vorhandene Schutz — und der Beweis, dass der Defekt in der BEDINGUNG liegt,
        // nicht im Lernen selbst: wer ausgeschlossen ist, bleibt sichtbar.
        val later = stepped(frames = 30, exclude = 1L)[0]
        assertTrue(later > 10.0, "ausgeschlossen bleibt es sichtbar: z=$later")
    }
}
