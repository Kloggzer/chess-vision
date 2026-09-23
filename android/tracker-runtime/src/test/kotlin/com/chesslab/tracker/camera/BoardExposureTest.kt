package com.chesslab.tracker.camera

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class BoardExposureTest {
    /** +-24 Schritte zu 1/6 EV, also +-4 EV. */
    private val range = ExposureRange(indices = -24..24, stepEv = 1f / 6f)
    private val limits = range.evLimits()
    private val start = ExposureState()

    private fun reading(
        vararg means: Float,
        highlight: Float = 120f,
        clipped: Float = 0f,
    ): ExposureReading {
        val all = FloatArray(ExposureReading.CELLS) { means.getOrElse(it) { means.last() } }
        return ExposureReading(all, highlight, clipped)
    }

    @Test
    fun `a well lit board is left alone`() {
        assertNull(nextExposure(start, reading(90f, highlight = 200f), limits))
    }

    @Test
    fun `a dark board is brightened`() {
        val next = nextExposure(start, reading(12f, highlight = 90f), limits)
        assertNotNull(next)
        assertTrue(next!!.ev > start.ev)
    }

    @Test
    fun `clipping outranks the wish to brighten`() {
        val next = nextExposure(start, reading(5f, highlight = 255f, clipped = 0.20f), limits)
        assertNotNull(next)
        assertTrue(next!!.ev < start.ev) { "muss dunkler werden, war ${next.ev} EV" }
    }

    @Test
    fun `a single dark cell is not worth a change`() {
        val means = FloatArray(ExposureReading.CELLS) { if (it == 0) 3f else 95f }
        assertNull(nextExposure(start, ExposureReading(means, 200f, 0f), limits))
    }

    @Test
    fun `the step is capped`() {
        val next = nextExposure(start, reading(1f, highlight = 40f), limits)!!
        val cap = ExposurePolicy().maxStepEv
        assertTrue(next.ev - start.ev <= cap + 1e-9) { "Sprung ${next.ev - start.ev} EV ueber dem Deckel $cap" }
    }

    @Test
    fun `at the ceiling of the device nothing is reported`() {
        // Jede gemeldete Aenderung kostet den Tracker seine Referenz.
        val maxed = ExposureState(ev = limits.endInclusive)
        assertNull(nextExposure(maxed, reading(4f, highlight = 90f), limits))
    }

    @Test
    fun `the deadband holds small errors`() {
        // (34/33) sind 0,10 EV bei Gamma 2,2 — unter dem Totband von 0,25.
        assertNull(nextExposure(start, reading(33f, highlight = 200f), limits))
    }

    @Test
    fun `gamma is honoured`() {
        // 2,2 * log2(34/30) = 0,40 EV, nicht 0,18: ohne die Umrechnung bliebe der Wunsch im Totband.
        val r = reading(30f, highlight = 150f)
        assertNotNull(nextExposure(start, r, limits))
        assertNull(nextExposure(start, r, limits, ExposurePolicy(gamma = 1.0)))
    }

    @Test
    fun `readings must carry all 64 cells`() {
        val e = runCatching { ExposureReading(FloatArray(63), 120f, 0f) }.exceptionOrNull()
        assertTrue(e is IllegalArgumentException)
    }

    @Test
    fun `the loop settles instead of hunting`() {
        // Der Grenzzyklus der ersten Fassung (hoch, runter, Produkt 1,0) auf zwei von fuenf Aufnahmen.
        var cur = start
        var steps = 0
        repeat(TICKS) {
            // Oben KEINE Luft, unten trotzdem dunkel — die Ziele einigen sich nicht.
            val next = nextExposure(cur, reading(10f, highlight = 255f, clipped = 0.10f), limits) ?: return
            // Am Anschlag faellt nur noch die Klinke: derselbe EV-Wert mit neuer Decke ist kein Pendeln.
            assertTrue(next.ev <= cur.ev) { "von ${cur.ev} auf ${next.ev} EV hoch — pendelt" }
            if (next.ev < cur.ev) steps++
            cur = next
        }
        assertTrue(steps < TICKS) { "nach $TICKS Schritten immer noch nicht eingeschwungen" }
    }

    @Test
    fun `a well lit board is not dimmed below the user's setting`() {
        // Spitzlichter ueber `clipCap` blendeten ein Brett ab, an dem KEIN Feld zu dunkel war.
        val bright = reading(90f, highlight = 255f, clipped = 0.10f)
        val next = nextExposure(start, bright, limits, baseEv = 0.0)
        assertEquals(start.ev, next?.ev ?: start.ev, 1e-9) { "abgeblendet auf ${next?.ev} EV" }
        assertTrue(nextExposure(start, bright, limits)!!.ev < start.ev)
    }

    @Test
    fun `the ratchet takes back its own lift but stops at the floor`() {
        // Bis zum Schieber und keinen Schritt weiter, sonst waere der Boden ein Ausschalter.
        val lifted = ExposureState(ev = 1.5)
        val next = nextExposure(lifted, reading(90f, highlight = 255f, clipped = 0.10f), limits, baseEv = 0.0)!!
        assertTrue(next.ev < lifted.ev) { "nimmt die eigene Aufhellung nicht zurueck" }
        assertTrue(next.ev >= 0.0) { "unter den Schieber gefallen: ${next.ev} EV" }
    }

    @Test
    fun `a dark board is still brightened above the floor`() {
        val next = nextExposure(start, reading(12f, highlight = 90f), limits, baseEv = 0.0)
        assertNotNull(next)
        assertTrue(next!!.ev > 0.0)
    }

    @Test
    fun `the index is the device step, not a stop`() {
        assertEquals(6, range.indexFor(1.0))
        assertEquals(-6, range.indexFor(-1.0))
        assertEquals(24, range.indexFor(99.0)) { "ueber den Anschlag hinaus wird geklemmt" }
        assertEquals(4.0, limits.endInclusive, 1e-6)
    }

    /** Entschieden an `darkTarget` (4 Felder), gemessen am 0,12-Perzentil (Feld 7): dazwischen blendete sie ab. */
    @Test
    fun `four to eight dark cells are brightened, never dimmed`() {
        val lifted = ExposureState(ev = 1.0)
        for (dark in 4..8) {
            val means = FloatArray(ExposureReading.CELLS) { if (it < dark) 8f else 120f }
            val next = nextExposure(lifted, ExposureReading(means, 180f, 0f), limits)
            assertTrue(next == null || next.ev >= lifted.ev) { "$dark dunkle Felder, die Regelung ging aber auf ${next?.ev} EV" }
        }
    }

    private companion object {
        const val TICKS = 40
    }
}
