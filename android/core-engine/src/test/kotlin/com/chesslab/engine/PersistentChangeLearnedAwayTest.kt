package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Eine bleibende Aenderung, die NICHT als `changed` gilt, lernt sich selbst weg.
 *
 * Gemessen am 2026-09-19 auf `data/recordings/rxr-c8-20260919`: nach `Rc2xc8` zeigt c8 ueber
 * 216 Frames `diff = 77` und `census = 99` — und das fusionierte `z` steht die ganze Zeit auf
 * **0,00**. Der weisse Turm steht dort und bewegt sich nicht mehr, also holt der EMA ihn ein.
 *
 * Der Schutz dagegen gibt es (`update(exclude=…)`, Gray-Alpha 0), aber er greift nur fuer Felder,
 * die schon als geaendert gelten — und das wurde c8 nie, weil sein `z` bereits 0 war. Der Kreis
 * ist der Defekt; dieser Test haelt ihn fest, damit ein Fix ihn umdreht statt ihn zu streifen.
 */
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
        // 12,83 -> 2,93: das Fenster, in dem die Engine eine bleibende Aenderung ueberhaupt
        // bemerken kann, ist ein Drittel einer Sekunde bei 15 fps.
        assertTrue(stepped(frames = 0, exclude = 0L)[0] > 12.0, "der erste Blick sieht es klar")
        assertTrue(stepped(frames = 5, exclude = 0L)[0] < 3.0, "nach 5 Frames ist es unter zThr")
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
