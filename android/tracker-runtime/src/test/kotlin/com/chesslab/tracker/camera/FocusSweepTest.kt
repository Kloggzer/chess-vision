package com.chesslab.tracker.camera

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.math.abs
import kotlin.math.exp

class FocusSweepTest {
    private fun sharpnessAt(
        focus: Float,
        peak: Float = 0.3f,
    ): Float = 500f * exp(-((focus - peak) * (focus - peak)) / (2 * 0.05f * 0.05f)) + 5f

    private fun run(
        sweep: FocusSweep,
        curve: (Float) -> Float,
    ): FocusSweep {
        var at = sweep.next()
        while (at != null) {
            sweep.observe(curve(at))
            at = sweep.next()
        }
        return sweep
    }

    @Test
    fun `the coarse plan spans both ends`() {
        val plan = focusPlan(13)
        assertEquals(13, plan.size)
        assertEquals(0f, plan.first())
        assertEquals(1f, plan.last())
    }

    @Test
    fun `the fine plan stays inside the range`() {
        assertTrue(finePlan(0f, 0.083f, 9).all { it in 0f..1f })
        assertTrue(finePlan(1f, 0.083f, 9).all { it in 0f..1f })
    }

    @Test
    fun `the sweep finds the peak of the curve`() {
        val best = run(FocusSweep(), ::sharpnessAt).best
        assertNotNull(best)
        assertTrue(abs(best!!.focus - 0.3f) < 0.03f) { "gefunden bei ${best.focus}" }
    }

    @Test
    fun `the fine pass beats the coarse grid`() {
        // Bewusst zwischen zwei Grobstufen.
        val best = run(FocusSweep(), { sharpnessAt(it, peak = 0.29f) }).best
        assertTrue(abs(best!!.focus - 0.29f) < 0.02f) { "gefunden bei ${best.focus}" }
    }

    @Test
    fun `a flat series is refused and never refined`() {
        val sweep = run(FocusSweep(), { 42f })
        assertNull(sweep.best)
        assertEquals(13, sweep.done) { "der Feinlauf haette nichts zu verfeinern" }
    }

    @Test
    fun `a dark board is refused even where it varies`() {
        // Verhaeltnis 2, aber unter der absoluten Schranke ist kein Gipfel ein Gipfel.
        assertNull(run(FocusSweep(), { if (it > 0.5f) 0.8f else 0.4f }).best)
    }

    @Test
    fun `progress only counts the steps that are really queued`() {
        val sweep = FocusSweep()
        assertEquals(13, sweep.total)
        repeat(13) { sweep.observe(sharpnessAt(sweep.next()!!)) }
        assertEquals(22, sweep.total) { "erst nach dem Grobrasten steht der Feinlauf fest" }
    }

    @Test
    fun `the watch waits for a run of soft readings`() {
        val watch = FocusWatch(reference = 100f)
        assertFalse(watch.observe(30f))
        assertFalse(watch.observe(30f))
        assertTrue(watch.observe(30f)) { "drei hintereinander sind die Meldung" }
    }

    @Test
    fun `a single soft reading between sharp ones says nothing`() {
        val watch = FocusWatch(reference = 100f)
        repeat(5) {
            assertFalse(watch.observe(30f))
            assertFalse(watch.observe(90f))
        }
    }

    @Test
    fun `it reports once per episode, not once per frame`() {
        val watch = FocusWatch(reference = 100f)
        repeat(3) { watch.observe(30f) }
        assertFalse(watch.observe(30f)) { "dieselbe Episode meldet nicht zweimal" }
        watch.observe(90f)
        repeat(2) { watch.observe(30f) }
        assertTrue(watch.observe(30f)) { "nach der Erholung ist es ein neues Ereignis" }
    }
}
