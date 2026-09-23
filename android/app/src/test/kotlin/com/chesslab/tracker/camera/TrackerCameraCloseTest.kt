package com.chesslab.tracker.camera

import android.app.Application
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/** `shutdownNow` interrupts, which an in-progress OpenCV call ignores — so the wait is the contract. */
@RunWith(RobolectricTestRunner::class)
// A plain [Application]: the app's own initializes WorkManager.
@Config(manifest = Config.NONE, application = Application::class)
class TrackerCameraCloseTest {
    @Test
    fun closeReturnsOnlyOnceTheAnalyzerHasLeftThePipeline() {
        val camera = TrackerCamera(RuntimeEnvironment.getApplication(), REQUEST, { _, _ -> })
        val started = CountDownLatch(1)
        val finished = AtomicBoolean(false)
        camera.runOnAnalyzer {
            started.countDown()
            // Busy, not sleeping: an interrupt cannot end a `warpPerspective` half-way either.
            val until = System.nanoTime() + WORK_MS * NANOS_PER_MS
            while (System.nanoTime() < until) Thread.onSpinWait()
            finished.set(true)
        }

        assertTrue("the analyzer task never started", started.await(TIMEOUT_S, TimeUnit.SECONDS))
        camera.close()

        assertTrue("close returned while a frame was still inside the pipeline", finished.get())
    }

    private companion object {
        val REQUEST = CameraRequest(width = 1280, height = 720, targetFps = 30)
        const val WORK_MS = 200L
        const val NANOS_PER_MS = 1_000_000L
        const val TIMEOUT_S = 10L
    }
}
