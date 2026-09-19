package com.chesslab.tracker.service

import com.chesslab.tracker.settings.FrameRateMode
import org.junit.Assert.assertEquals
import org.junit.Test

// Skaliert wurde mit der EINGESTELLTEN Rate. Gemessen 2026-09-19 (24117RK2CG, `R1440`/`FPS15`):
// geliefert 7,5 fps. Die Schwelle war halb so gross wie noetig, das Brett nie ruhig.
class EffectiveFrameRateTest {
    @Test
    fun `without a measurement the setting decides`() {
        assertEquals(15.0, effectiveFrameRate(FrameRateMode.FPS15, null), 0.0)
        assertEquals(30.0, effectiveFrameRate(FrameRateMode.FPS30, 0.0), 0.0)
    }

    @Test
    fun `a sensor that cannot hold the rate decides instead`() {
        assertEquals(7.5, effectiveFrameRate(FrameRateMode.FPS15, 7.5), 0.0)
    }

    @Test
    fun `small jitter under the setting does not move the threshold`() {
        // Die gelieferte Rate ist ein EMA. Wer ihr auf die Nachkommastelle folgt, laesst
        // `motionThr` zwischen zwei Aufrufen wandern und macht Laeufe unvergleichbar.
        assertEquals(15.0, effectiveFrameRate(FrameRateMode.FPS15, 14.3), 0.0)
        assertEquals(15.0, effectiveFrameRate(FrameRateMode.FPS15, 15.4), 0.0)
    }

    @Test
    fun `a sensor running FASTER than asked keeps the setting`() {
        // Die Obergrenze ist gewollt (`pinFrameRate` kappt bewusst); schneller zu rechnen waere
        // eine Rezeptaenderung, die niemand gemessen hat.
        assertEquals(15.0, effectiveFrameRate(FrameRateMode.FPS15, 28.0), 0.0)
    }

    @Test
    fun `nonsense measurements are ignored`() {
        assertEquals(15.0, effectiveFrameRate(FrameRateMode.FPS15, -3.0), 0.0)
        assertEquals(15.0, effectiveFrameRate(FrameRateMode.FPS15, Double.NaN), 0.0)
    }
}

// Einmal, nach einer Aufwaermzeit: die gelieferte Rate ist ein EMA und steht anfangs nicht.
class RetuneDueTest {
    @Test
    fun `nothing happens before the rate has settled`() {
        assertEquals(false, retuneDue(1, FrameRateMode.FPS15, 7.5))
        assertEquals(false, retuneDue(59, FrameRateMode.FPS15, 7.5))
    }

    @Test
    fun `it fires exactly once, at the warm-up frame`() {
        assertEquals(true, retuneDue(60, FrameRateMode.FPS15, 7.5))
        assertEquals(false, retuneDue(61, FrameRateMode.FPS15, 7.5))
    }

    @Test
    fun `a sensor that holds the rate is left alone`() {
        assertEquals(false, retuneDue(60, FrameRateMode.FPS15, 15.0))
        assertEquals(false, retuneDue(60, FrameRateMode.FPS15, 14.4))
    }
}
