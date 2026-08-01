package com.chesslab.tracker.camera

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private const val RED = 0
private const val GREEN_EVEN = 1
private const val GREEN_ODD = 2
private const val BLUE = 3

/**
 * The pure half of manual optics. The wiring into `OpticsLock` is not written yet — this is the
 * part that can be decided on the JVM, and the part that is easy to get subtly wrong.
 */
class ManualOpticsTest {
    @Test
    fun noValuesMeansAutomatic() {
        assertTrue(ManualOptics().isAuto)
        assertTrue(!ManualOptics(iso = 400).isAuto, "one axis set is not automatic")
        assertTrue(!ManualOptics(kelvin = 5000).isAuto)
    }

    /**
     * The sensor can only amplify. A gain below 1.0 would darken the frame as a side effect of a
     * COLOUR choice, which is a brightness change nobody asked for — so the smallest gain is pinned
     * at unity and the others scale above it.
     */
    @Test
    fun theSmallestGainIsAlwaysUnity() {
        for (k in intArrayOf(KELVIN_MIN, 2700, 4000, 5600, 6500, KELVIN_MAX)) {
            val g = kelvinToGains(k)
            val smallest = g.min()
            assertEquals(1.0f, smallest, 1e-4f, "at ${k}K the smallest gain was $smallest")
        }
    }

    /** Both green photosites carry the same filter; splitting them would be a tint control. */
    @Test
    fun theTwoGreensAreEqual() {
        val g = kelvinToGains(5000)
        assertEquals(g[GREEN_EVEN], g[GREEN_ODD], 1e-6f)
    }

    /**
     * Warm light needs the blue channel lifted to compensate, cool light the red — the correction
     * runs OPPOSITE to the light, which is the sign everyone gets backwards once.
     */
    @Test
    fun warmLightLiftsBlueAndCoolLightLiftsRed() {
        val warm = kelvinToGains(2700)
        val cool = kelvinToGains(8000)
        assertTrue(warm[BLUE] > warm[RED], "2700K corrects toward blue, got r=${warm[RED]} b=${warm[BLUE]}")
        assertTrue(cool[RED] > cool[BLUE], "8000K corrects toward red, got r=${cool[RED]} b=${cool[BLUE]}")
    }

    @Test
    fun theRangeIsClampedRatherThanExtrapolated() {
        assertEquals(kelvinToGains(KELVIN_MIN)[RED], kelvinToGains(500)[RED], 1e-6f)
        assertEquals(kelvinToGains(KELVIN_MAX)[BLUE], kelvinToGains(20_000)[BLUE], 1e-6f)
    }
}
