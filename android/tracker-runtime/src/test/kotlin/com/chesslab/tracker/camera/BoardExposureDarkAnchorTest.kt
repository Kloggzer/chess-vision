package com.chesslab.tracker.camera

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Entschieden wird an `darkTarget` (0,05 = 4 Felder), gemessen wurde am 0,12-Perzentil (Feld 7).
 *
 * Bei 4 bis 8 dunklen Feldern ist die Ankerzelle selbst hell, `evFor` wird negativ, und die
 * Regelung blendet ein Bild ab, das sie gerade als zu dunkel eingestuft hat.
 */
class BoardExposureDarkAnchorTest {
    private val range = ExposureRange(indices = -24..24, stepEv = 1f / 6f)
    private val limits = range.evLimits()
    private val start = ExposureState(ev = 1.0)

    @Test
    fun `four dark cells are brightened, never dimmed`() {
        assertBrightens(dark = 4)
    }

    @Test
    fun `and so is every count up to the measured percentile`() {
        (5..8).forEach(::assertBrightens)
    }

    private fun assertBrightens(dark: Int) {
        val means = FloatArray(ExposureReading.CELLS) { if (it < dark) DARK else BRIGHT }
        val next = nextExposure(start, ExposureReading(means, HIGHLIGHT, 0f), limits)

        assertTrue(next == null || next.ev >= start.ev) {
            "$dark dunkle Felder gelten als zu dunkel, die Regelung ging aber auf ${next?.ev} EV von ${start.ev}"
        }
    }

    private companion object {
        /** Unter `ExposurePolicy.floor` (34) — genau das, was `darkFraction` zaehlt. */
        const val DARK = 8f
        const val BRIGHT = 120f
        const val HIGHLIGHT = 180f
    }
}
