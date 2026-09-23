package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/** Die zwei Absagen des Rillenfinders, bis 2026-09-22 ungedeckt: zu FLACH (Rauschen) und zu
 *  BREIT (eine Figur, keine Rille). */
class GrooveRefusalTest {
    @Test
    fun `a narrow notch is located at its centre of mass`() {
        val found = notchCentre(profile(NOTCH_DEPTH), CSP)

        assertNotNull(found)
        assertEquals(PEAK.toDouble(), found!![0], TOLERANCE)
        assertEquals(NOTCH_DEPTH, found[1], TOLERANCE)
    }

    /** Der Boden ist die ZAHL 6, Zwilling von `alignment.MIN_DEPTH` — darunter ist die Delle
     *  Sensorrauschen. Als Zahl gepinnt, weil ein Test auf dem Symbol mit ihm mitwandert. */
    @Test
    fun `a notch shallower than the depth floor is refused`() {
        assertEquals(DEPTH_FLOOR, MIN_DEPTH, TOLERANCE)
        assertNotNull(notchCentre(profile(DEPTH_FLOOR), CSP), "genau auf dem Boden gilt sie noch")
        assertNull(notchCentre(profile(DEPTH_FLOOR - STEP), CSP))
    }

    /** Frame 900 von VID_20260802_222741: die schwarze Grundreihe lehnte ueber die Linie dahinter,
     *  jedes Band meldete die Figur, die Linie kam 36 mrad schief und 16,3 px daneben heraus. */
    @Test
    fun `a dark run still going at both ends is an object, not a groove`() {
        assertNull(notchCentre(wideObject(), CSP))
    }

    /** Ein flacher Hintergrund mit einer drei Proben breiten Delle bei [PEAK]. */
    private fun profile(depth: Double): DoubleArray =
        DoubleArray(WINDOW) { BACKGROUND }.also {
            it[PEAK - 1] = BACKGROUND - SHOULDER_SHARE * depth
            it[PEAK] = BACKGROUND - depth
            it[PEAK + 1] = BACKGROUND - SHOULDER_SHARE * depth
        }

    /** Dieselbe Tiefe, aber breiter als das Zentroid-Fenster und an beiden Enden noch dunkel. */
    private fun wideObject(): DoubleArray =
        DoubleArray(WINDOW) { BACKGROUND }.also {
            for (i in OBJECT_FROM..OBJECT_TO) it[i] = BACKGROUND - NOTCH_DEPTH
            it[PEAK] = BACKGROUND - NOTCH_DEPTH - STEP
        }

    private companion object {
        /** Die Fenster- und Zentroidbreite bei `boardSize` 928: Zelle 116, SEARCH_FRAC, CENTROID_FRAC. */
        const val WINDOW = 59
        const val CSP = 9
        const val PEAK = 29
        const val BACKGROUND = 200.0
        const val NOTCH_DEPTH = 30.0
        const val SHOULDER_SHARE = 0.8
        const val DEPTH_FLOOR = 6.0
        const val STEP = 1.0
        const val OBJECT_FROM = 15
        const val OBJECT_TO = 43
        const val TOLERANCE = 1e-9
    }
}
