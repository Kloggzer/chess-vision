package com.chesslab.tracker.ui.calibration

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class CornerMappingTest {
    @Test
    fun tapMapsToSourcePixelsUsingTheRenderedBitmapSize() {
        // 640x480 rendered preview of a 1280x960 source: the centre tap is the source centre.
        val p = mapTapToSource(320f, 240f, renderedWidth = 640, renderedHeight = 480, sourceWidth = 1280, sourceHeight = 960)
        assertEquals(640f, p!!.x)
        assertEquals(480f, p.y)
        // The mapping depends on the RENDERED size alone; no requested camera size exists here
        // to derive from (a7dab73 — delivered is truth).
        val other = mapTapToSource(320f, 240f, 640, 480, 3840, 2160)
        assertEquals(1920f, other!!.x)
        assertEquals(1080f, other.y)
    }

    @Test
    fun anUnmeasurableTapIsRejectedRatherThanGuessed() {
        assertNull(mapTapToSource(1f, 1f, 0, 480, 1280, 960))
        assertNull(mapTapToSource(1f, 1f, 640, 480, 0, 960))
    }

    @Test
    fun fourTapsAreStoredInTapOrderNotSorted() {
        // Deliberately tapped in a non-canonical spatial order: bottom-right first.
        val taps =
            listOf(
                TapPoint(900f, 900f),
                TapPoint(100f, 900f),
                TapPoint(100f, 100f),
                TapPoint(900f, 100f),
            )
        val corners = tapsToCorners(taps)!!
        assertArrayEquals(floatArrayOf(900f, 900f, 100f, 900f, 100f, 100f, 900f, 100f), corners, 0f)
        // [0] is whatever the user tapped FIRST — it is a8 by declaration, not by position.
        assertEquals(900f, corners[0])
    }

    @Test
    fun anIncompleteTapSetYieldsNoCorners() {
        assertNull(tapsToCorners(listOf(TapPoint(1f, 1f), TapPoint(2f, 2f))))
        assertEquals(4, CORNER_PROMPTS.size)
        assertEquals(true, CORNER_PROMPTS[0].contains("a8"))
        assertEquals(true, CORNER_PROMPTS[3].contains("a1"))
    }
}
