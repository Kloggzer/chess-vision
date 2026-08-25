package com.chesslab.tracker.camera

import com.chesslab.tracker.settings.FrameRateMode
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
        val rate = FrameRateMode.FPS30
        assertEquals(CameraRequest(1920, 1080, targetFps = 30), cameraRequestFor(ResolutionMode.AUTO, rate))
        assertEquals(CameraRequest(1920, 1080, targetFps = 30), cameraRequestFor(ResolutionMode.R1080, rate))
        assertEquals(CameraRequest(2560, 1440, targetFps = 30), cameraRequestFor(ResolutionMode.R1440, rate))
        assertEquals(CameraRequest(3840, 2160, targetFps = 30), cameraRequestFor(ResolutionMode.R2160, rate))
    }

    @Test
    fun modesAreDistinctAndOrdered() {
        val heights = ResolutionMode.entries.map { cameraRequestFor(it, FrameRateMode.FPS30).height }
        assertEquals(heights.drop(1), heights.drop(1).sorted(), "a higher mode must not ask for fewer pixels")
        assertEquals(4, ResolutionMode.entries.size, "a new mode needs a request, or it silently means AUTO")
    }

    /** The rate is a WISH like the size — what it may not do is silently mean something else. */
    @Test
    fun everyRateReachesTheRequestAndTheSetIsSmall() {
        assertEquals(15, cameraRequestFor(ResolutionMode.R1440, FrameRateMode.FPS15).targetFps)
        assertEquals(30, cameraRequestFor(ResolutionMode.R1440, FrameRateMode.FPS30).targetFps)
        assertTrue(
            FrameRateMode.entries.all { it.fps in ADVERTISED_LOCKED_FPS },
            "camera 0 of the 24117RK2CG advertises no other locked range, and an unadvertised one is not pinned",
        )
    }

    @Test
    fun theDeliveredSizeStillWinsOverTheRequestedMode() {
        val requested = cameraRequestFor(ResolutionMode.R2160, FrameRateMode.FPS30)
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

/** `android.control.aeAvailableTargetFpsRanges`, camera 0, read off the device on 2026-08-24. */
private val ADVERTISED_LOCKED_FPS = setOf(15, 19, 21, 24, 25, 26, 30)
