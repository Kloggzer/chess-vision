package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.camera.DeliveredSize
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.CvType
import org.opencv.core.Mat
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference

/**
 * Where the align work actually runs.
 *
 * `LiveAlign`'s KDoc has claimed "off the frame thread" since it was written, and on the phone that
 * was false for months: `TrackerService` is a `LifecycleService`, `TrackerStack` builds its scope
 * from the parent's context, and so ArUco (44-87 ms) plus the once-per-pose `improveQuad` ran on
 * `Dispatchers.Main.immediate`. Nothing failed — the UI just stuttered — which is why a comment was
 * the only thing guarding it.
 *
 * The probe is the `geometry` lambda: it is evaluated INSIDE the coroutine, unlike `config`, which
 * `maybeAlign` reads on the caller's thread before it launches anything.
 */
@EnabledIf(OPENCV_GATE)
class LiveAlignDispatchTest {
    @Test
    fun cachedAlignmentBypassesFrameSourceAndAppliesAtRecordedFrame() {
        val applied = AtomicReference<FloatArray?>()
        val align =
            LiveAlign(
                CoroutineScope(Dispatchers.Unconfined),
                { BoardGeometry(boardSize = BOARD_SIZE) },
                { CONFIG },
                { applied.set(it) },
                dispatcher = Dispatchers.Unconfined,
                cachedCorners = { frame -> if (frame == 2L) CACHED_CORNERS else null },
            )
        val source =
            object : CalibrationFrames<Unit> by OneBlankFrame {
                override fun latestCalibrationSample(): CalibrationFrame = error("cached replay must not read pixels")
            }

        align.maybeAlign(source, DeliveredSize(FRAME_SIDE, FRAME_SIDE, 0))
        assertEquals(null, applied.get())
        align.maybeAlign(source, DeliveredSize(FRAME_SIDE, FRAME_SIDE, 0))
        assertArrayEquals(CACHED_CORNERS, applied.get())
    }

    @Test
    fun retainedCalibrationFrameIsAlignedOnlyOnce() {
        val calls = AtomicInteger()
        val source = VersionedBlankFrame(version = 7L)
        val align =
            LiveAlign(
                CoroutineScope(Dispatchers.Unconfined),
                {
                    calls.incrementAndGet()
                    BoardGeometry(boardSize = BOARD_SIZE)
                },
                { CONFIG },
                {},
                dispatcher = Dispatchers.Unconfined,
            )

        align.maybeAlign(source, DeliveredSize(FRAME_SIDE, FRAME_SIDE, 0))
        align.maybeAlign(source, DeliveredSize(FRAME_SIDE, FRAME_SIDE, 0))

        assertEquals(1, calls.get(), "the retained bus frame must not update the marker smoother twice")
        assertEquals(1, source.clones, "a known frame version must be rejected before its full-plane clone")
    }

    @Test
    fun alignRunsOffTheScopesOwnThread() {
        val ran = runAlignOn(dispatcher = null)
        assertTrue(ran != null, "the align never ran at all, so this test proved nothing")
        assertNotEquals(SCOPE_THREAD, ran, "align must not run on the scope's thread — that is the UI thread on the phone")
    }

    /**
     * The counter-test, and the reason this file is worth its lines.
     *
     * Without it the first assertion holds for any implementation that happens to hop threads, and
     * would keep holding if the dispatcher parameter were ignored entirely. So this does not hand
     * back the scope's own dispatcher — that would pass either way — but a THIRD thread belonging to
     * neither, and requires the work to land there. Only the parameter can put it there.
     */
    @Test
    fun theDispatcherIsWhatDecides() {
        val elsewhere = Executors.newSingleThreadExecutor { Thread(it, NAMED_THREAD) }
        try {
            assertEquals(NAMED_THREAD, runAlignOn(elsewhere.asCoroutineDispatcher()))
        } finally {
            elsewhere.shutdown()
        }
    }

    /** One align, on a scope pinned to [SCOPE_THREAD]; returns the thread the work ran on. */
    private fun runAlignOn(dispatcher: CoroutineDispatcher?): String? {
        val pool = Executors.newSingleThreadExecutor { Thread(it, SCOPE_THREAD) }
        val scope = CoroutineScope(pool.asCoroutineDispatcher())
        val seen = AtomicReference<String?>(null)
        val done = CountDownLatch(1)
        val geometry = {
            // Coroutine debug mode appends " @coroutine#N" to the thread name; the thread is the
            // part before it, and comparing the whole string would make this test fail on a flag.
            seen.set(Thread.currentThread().name.substringBefore(" @"))
            done.countDown()
            BoardGeometry(boardSize = BOARD_SIZE)
        }
        val align =
            if (dispatcher == null) {
                LiveAlign(scope, geometry, { CONFIG }, {})
            } else {
                LiveAlign(scope, geometry, { CONFIG }, {}, dispatcher = dispatcher)
            }
        try {
            align.maybeAlign(OneBlankFrame, DeliveredSize(FRAME_SIDE, FRAME_SIDE, 0))
            assertTrue(done.await(TIMEOUT_SECONDS, TimeUnit.SECONDS), "the align never started")
            return seen.get()
        } finally {
            pool.shutdown()
        }
    }

    /** Blank on purpose: ArUco finds nothing, which is enough to observe WHERE it looked. */
    private object OneBlankFrame : CalibrationFrames<Unit> {
        override fun latestCalibrationFrame(): Mat = Mat(FRAME_SIDE, FRAME_SIDE, CvType.CV_8UC3)

        override val rawPreview: StateFlow<Unit?> = MutableStateFlow(null)
        override val previewRotation: StateFlow<Int> = MutableStateFlow(0)
        override val boardPreview: StateFlow<Unit?> = MutableStateFlow(null)
        override val cameraHealth: StateFlow<CameraHealth> = MutableStateFlow(CameraHealth.Up)
    }

    private class VersionedBlankFrame(
        private val version: Long,
    ) : CalibrationFrames<Unit> by OneBlankFrame {
        var clones = 0
            private set

        override fun latestCalibrationSample(): CalibrationFrame = sample()

        override fun latestCalibrationSample(afterVersion: Long?): CalibrationFrame? =
            if (afterVersion == version) null else sample()

        private fun sample(): CalibrationFrame {
            clones += 1
            return CalibrationFrame(version, Mat(FRAME_SIDE, FRAME_SIDE, CvType.CV_8UC3))
        }
    }

    private companion object {
        /** Stands in for the phone's UI thread: what `lifecycleScope` gave `LiveAlign` for months. */
        const val SCOPE_THREAD = "pretend-main"
        val CACHED_CORNERS = floatArrayOf(1f, 2f, 3f, 4f, 5f, 6f, 7f, 8f)

        /** Belongs to neither the scope nor `Dispatchers.Default` — only the parameter reaches it. */
        const val NAMED_THREAD = "somewhere-else"
        const val FRAME_SIDE = 64
        const val BOARD_SIZE = 320
        const val TIMEOUT_SECONDS = 10L

        /** `alignEvery = 1` so the very first frame aligns; the default of 3 would need three. */
        val CONFIG = TrackerConfig().copy(alignEvery = 1)

        @JvmStatic
        fun openCvAvailable(): Boolean = runCatching { Loader.load(opencv_java::class.java) }.isSuccess
    }
}

/** JUnit resolves `@EnabledIf` by method reference; the natives live in another module. */
private const val OPENCV_GATE = "com.chesslab.tracker.service.LiveAlignDispatchTest#openCvAvailable"
