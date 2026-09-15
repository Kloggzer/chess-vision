package com.chesslab.tracker.camera

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * `asAsked` compared only the LONG side, so a device that cropped the short one reported "exactly
 * as asked" and `capture.json` claimed a picture it never delivered.
 */
class CaptureProfileTest {
    private val requested = CaptureProfile(3840, 2160, 30)

    private fun observed(delivered: DeliveredSize?) =
        CaptureObserved(
            requested = requested,
            delivered = delivered,
            aeFpsRange = "[30, 30]",
            bitRate = requested.bitRate,
            notes = emptyList(),
        )

    @Test
    fun `the requested picture reads as asked`() {
        assertTrue(observed(DeliveredSize(3840, 2160, 0)).asAsked)
    }

    @Test
    fun `a rotated delivery is still the same picture`() {
        assertTrue(observed(DeliveredSize(2160, 3840, 90)).asAsked)
    }

    @Test
    fun `a cropped short side is not what was asked for`() {
        assertFalse(observed(DeliveredSize(3840, 1644, 0)).asAsked, "the short side is 1644, not 2160")
    }

    @Test
    fun `nothing delivered is never as asked`() {
        assertFalse(observed(null).asAsked)
    }
}
