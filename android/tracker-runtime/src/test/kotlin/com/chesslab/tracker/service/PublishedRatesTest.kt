package com.chesslab.tracker.service

import com.chesslab.tracker.pipeline.CameraRate
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

private const val MS = 1_000_000L

/**
 * The two rates the header reads apart. `0.0 fps` beside a live camera is the defect this pair
 * exists to remove: it says "dead feed" when the truth is "nothing is being analysed".
 */
@OptIn(ExperimentalCoroutinesApi::class)
class PublishedRatesTest {
    private var now = 0L

    @Test
    fun aSkippedFrameCarriesTheCameraRateAndAZeroedDetectionRate() =
        runTest {
            val scope = CoroutineScope(UnconfinedTestDispatcher(testScheduler) + SupervisorJob())
            val rate = CameraRate(nowNs = { now })
            val publisher = StatusPublisher(scope, cameraRate = rate, nowMs = { now / MS })
            repeat(50) {
                now += 33 * MS
                publisher.onCameraFrame()
            }

            // The engine's own EMA is FROZEN at its last tick, so a stale rate would stand forever
            // over a pipeline that is discarding every frame.
            publisher.publish({ statusOf().copy(fps = 14.8) }, "", emptyList(), "waiting for markers…")
            advanceTimeBy(STATUS_SAMPLE_MS * 2)
            val skipped = publisher.status.value!!
            assertEquals(0.0, skipped.fps, "a frame that produced no FrameInput analysed nothing")
            assertEquals(1000.0 / 33.0, skipped.cameraFps, 1e-6, "…while the camera is plainly fine")

            now += STATUS_SAMPLE_MS * MS
            publisher.publish({ statusOf().copy(fps = 14.8) }, "", emptyList(), null)
            advanceTimeBy(STATUS_SAMPLE_MS * 2)
            assertEquals(14.8, publisher.status.value!!.fps, "a detecting frame reports the engine's rate")
            scope.cancel()
        }
}
