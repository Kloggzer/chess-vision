package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

// Eine stehende Aenderung lernt sich weg. NICHT die Ursache des c8-Falls (dort nullt `applyTaints` das `z`);
// eine eigenstaendige Eigenschaft des Rauschmodells.
class PersistentChangeLearnedAwayTest {
    private fun stepped(
        frames: Int,
        exclude: Long,
    ): DoubleArray {
        val noise = SquareNoise()
        val diffs = DoubleArray(Squares.COUNT)
        val out = DoubleArray(Squares.COUNT)
        diffs[0] = 77.0
        repeat(frames) {
            noise.z(diffs, out)
            noise.update(diffs, exclude = exclude)
        }
        return noise.z(diffs, out)
    }

    @Test
    fun `a standing change falls under zThr in five frames`() {
        // Die VORGABE (`noiseOutlierSigma = 0`): ein Drittel einer Sekunde bei 15 fps.
        assertTrue(stepped(frames = 0, exclude = 0L)[0] > 12.0, "der erste Blick sieht es klar")
        assertTrue(stepped(frames = 5, exclude = 0L)[0] < 3.0, "nach 5 Frames unter zThr")
        assertTrue(stepped(frames = 30, exclude = 0L)[0] < 1.0, "nach 2 s ist es Rauschen")
    }

    @Test
    fun `excluding the square is what keeps it visible`() {
        // Der Defekt liegt in der BEDINGUNG, nicht im Lernen: wer ausgeschlossen ist, bleibt sichtbar.
        val later = stepped(frames = 30, exclude = 1L)[0]
        assertTrue(later > 10.0, "ausgeschlossen bleibt es sichtbar: z=$later")
    }
}
