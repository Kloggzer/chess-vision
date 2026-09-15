package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * `axes` wird aus den USABLE Linien gezaehlt — steht so im KDoc, weil eine Linie, die niemand
 * messen konnte, ueber ihre Richtung nichts aussagt. Der leere Fall faellt aber auf `all.isEmpty()`
 * zurueck und meldet dann EINE messbare Familie, obwohl keine einzige Linie messbar war. Der
 * Budget-Riegel deckt das heute zu; die Ablehnungsmeldung aus `LensFit.toString` traegt die Luege.
 */
class LensUnmeasurableAxesTest {
    @Test
    fun `no usable line means no measurable axis`() {
        // Drei Punkte je Linie liegen unter `MIN_BOW_POINTS`, also ist `bow` fuer jede null.
        val samples =
            (0..5).flatMap { line ->
                (0..2).map { step -> GridSample(axis = line % 2, line = line, x = 100.0 + step * STEP, y = 100.0 + line * STEP) }
            }

        val evidence = fitLens(samples, WIDTH, HEIGHT).evidence

        assertEquals(0, evidence.lines, "keine Linie ist messbar")
        assertEquals(0, evidence.axes, "null messbare Linien koennen keine messbare Achsenfamilie ergeben")
    }

    private companion object {
        const val STEP = 100.0
        const val WIDTH = 1920
        const val HEIGHT = 1080
    }
}
