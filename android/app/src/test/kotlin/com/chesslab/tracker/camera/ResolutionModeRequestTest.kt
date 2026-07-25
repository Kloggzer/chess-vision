package com.chesslab.tracker.camera

import com.chesslab.tracker.settings.ResolutionMode
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * 07a's `AppSettings.resolutionMode`, which was persisted and read by nobody (STATUS D07a-11).
 *
 * It changes the WISH and only the wish. The half of this that has already cost a session is
 * asserted at the bottom: `a7dab73` passed the requested numbers on as truth when the device
 * answered with a different aspect ratio, and the warp drifted ~2.3 ranks.
 */
class ResolutionModeRequestTest {
    @Test
    fun everyModeMapsToARequestAndAutoIsTheMeasured1080p() {
        assertEquals(CameraRequest(1920, 1080), cameraRequestFor(ResolutionMode.AUTO))
        assertEquals(CameraRequest(1920, 1080), cameraRequestFor(ResolutionMode.R1080))
        assertEquals(CameraRequest(2560, 1440), cameraRequestFor(ResolutionMode.R1440))
        assertEquals(CameraRequest(3840, 2160), cameraRequestFor(ResolutionMode.R2160))
    }

    @Test
    fun modesAreDistinctAndOrdered() {
        val heights = ResolutionMode.entries.map { cameraRequestFor(it).height }
        assertEquals(heights.drop(1), heights.drop(1).sorted(), "a higher mode must not ask for fewer pixels")
        assertEquals(4, ResolutionMode.entries.size, "a new mode needs a request, or it silently means AUTO")
    }

    @Test
    fun theDeliveredSizeStillWinsOverTheRequestedMode() {
        val requested = cameraRequestFor(ResolutionMode.R2160)
        // The device answers 1080p 4:3. Everything downstream reads THIS, and the mismatch is
        // reported rather than reconciled.
        val delivered = DeliveredSize(width = 1440, height = 1080, rotationDegrees = 0)
        val reported = mutableListOf<String>()
        ResolutionMismatchLogger { reported += it }.report(requested.width, requested.height, delivered)

        assertNotEquals(requested.width, delivered.width)
        assertEquals(1, reported.size, "a request the device did not honour must be said out loud")
        assertTrue(reported.single().contains("1440x1080"), "the DELIVERED size is the one that matters: ${reported.single()}")
    }
}
