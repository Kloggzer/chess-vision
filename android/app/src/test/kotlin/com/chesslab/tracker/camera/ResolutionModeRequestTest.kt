package com.chesslab.tracker.camera

import com.chesslab.tracker.settings.FrameRateMode
import com.chesslab.tracker.settings.ResolutionMode
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** The WISH only; the delivered size winning is `DeliveredSizeTest` and `ResolutionMismatchLoggerTest`. */
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

    @Test
    fun everyRateReachesTheRequestAndTheSetIsSmall() {
        assertEquals(15, cameraRequestFor(ResolutionMode.R1440, FrameRateMode.FPS15).targetFps)
        assertEquals(30, cameraRequestFor(ResolutionMode.R1440, FrameRateMode.FPS30).targetFps)
        assertTrue(
            FrameRateMode.entries.all { it.fps in ADVERTISED_LOCKED_FPS },
            "camera 0 of the 24117RK2CG advertises no other locked range, and an unadvertised one is not pinned",
        )
    }
}

/** `android.control.aeAvailableTargetFpsRanges`, camera 0, read off the device on 2026-08-24. */
private val ADVERTISED_LOCKED_FPS = setOf(15, 19, 21, 24, 25, 26, 30)
