package com.chesslab.tracker.camera

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class BoardExposureTest {
    /** Der Bereich dieses Telefons: +-24 Schritte zu 1/6 EV, also +-4 EV. */
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
        // Dunkel UND ausgebrannt: das saettigte Feld traegt gar nichts mehr, das dunkle noch wenig.
        val next = nextExposure(start, reading(5f, highlight = 255f, clipped = 0.20f), limits)
        assertNotNull(next)
        assertTrue(next!!.ev < start.ev) { "muss dunkler werden, war ${next.ev} EV" }
    }

    @Test
    fun `a single dark cell is not worth a change`() {
        // EIN schwarzes Feld unter einer Figur darf das halbe Brett nicht in die Saettigung fahren.
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
        // Kein leeres Stellen am Anschlag: jede gemeldete Aenderung kostet den Tracker seine Referenz.
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
        // Ein Feld von 30 auf 34 zu heben kostet 2,2 * log2(34/30) = 0,40 EV, nicht 0,18.
        // Ohne die Umrechnung bliebe der Wunsch im Totband und die Regelung haelt sich fuer fertig.
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
        // Der Grenzzyklus der ersten Fassung: hoch, runter, Produkt exakt 1,0 — auf zwei von fuenf
        // Aufnahmen gemessen (`tmp/ae_sim.py`). Die Klinke faellt monoton, also endet es.
        var cur = start
        var steps = 0
        repeat(TICKS) {
            // Oben KEINE Luft, unten trotzdem dunkel — der Fall, an dem sich die Ziele nicht einigen.
            val next = nextExposure(cur, reading(10f, highlight = 255f, clipped = 0.10f), limits) ?: return
            // Monoton statt "nie zweimal derselbe Wert": am Anschlag faellt nur noch die Klinke,
            // und die meldet denselben EV-Wert mit neuer Decke — das ist kein Pendeln.
            assertTrue(next.ev <= cur.ev) { "von ${cur.ev} auf ${next.ev} EV hoch — pendelt" }
            if (next.ev < cur.ev) steps++
            cur = next
        }
        assertTrue(steps < TICKS) { "nach $TICKS Schritten immer noch nicht eingeschwungen" }
    }

    @Test
    fun `a well lit board is not dimmed below the user's setting`() {
        // Der gemeldete Fehler: ein paar Spitzlichter ueber `clipCap` liessen die Klinke fallen
        // und blendeten ein Brett ab, an dem KEIN Feld zu dunkel war.
        val bright = reading(90f, highlight = 255f, clipped = 0.10f)
        val next = nextExposure(start, bright, limits, baseEv = 0.0)
        assertEquals(start.ev, next?.ev ?: start.ev, 1e-9) { "abgeblendet auf ${next?.ev} EV" }
        // Ohne den Boden faellt sie, und genau so sah es der Nutzer.
        assertTrue(nextExposure(start, bright, limits)!!.ev < start.ev)
    }

    @Test
    fun `the ratchet takes back its own lift but stops at the floor`() {
        // Aufhellen darf sie zuruecknehmen — bis dahin, wo der Schieber steht, und keinen Schritt
        // weiter. Sonst waere der Boden nur eine andere Art, die Regelung abzuschalten.
        val lifted = ExposureState(ev = 1.5)
        val next = nextExposure(lifted, reading(90f, highlight = 255f, clipped = 0.10f), limits, baseEv = 0.0)!!
        assertTrue(next.ev < lifted.ev) { "nimmt die eigene Aufhellung nicht zurueck" }
        assertTrue(next.ev >= 0.0) { "unter den Schieber gefallen: ${next.ev} EV" }
    }

    @Test
    fun `a dark board is still brightened above the floor`() {
        // Der Boden darf das Aufhellen nicht behindern — nur das Abblenden.
        val next = nextExposure(start, reading(12f, highlight = 90f), limits, baseEv = 0.0)
        assertNotNull(next)
        assertTrue(next!!.ev > 0.0)
    }

    @Test
    fun `the index is the device step, not a stop`() {
        // 1/6 EV je Schritt: wer +1 EV will, braucht Index 6 — nicht 1.
        assertEquals(6, range.indexFor(1.0))
        assertEquals(-6, range.indexFor(-1.0))
        assertEquals(24, range.indexFor(99.0)) { "ueber den Anschlag hinaus wird geklemmt" }
        assertEquals(4.0, limits.endInclusive, 1e-6)
    }

    private companion object {
        const val TICKS = 40
    }
}
