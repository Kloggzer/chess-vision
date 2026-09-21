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
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.opencv.core.CvType
import org.opencv.core.Mat
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

/**
 * Which bus images `maybeAlign` lets through -- the two refusals `LiveAlignDispatchTest` never
 * reaches. Both guards stand in front of ArUco, which costs 44-87 ms a run.
 */
class LiveAlignFrameGuardsTest {
    /**
     * `afterVersion` is a HINT a source may ignore, and the same sample twice ran ArUco twice and
     * smoothed one measurement in as though it were two.
     */
    @Test
    fun `a bus image that arrives twice is aligned once, and its clone is released`() {
        val source = UnfilteredFrames(version = 7L)
        val aligns = AtomicInteger()
        val align = liveAlign(aligns)

        align.maybeAlign(source, DELIVERED)
        align.maybeAlign(source, DELIVERED)

        assertEquals(2, source.clones, "this proves nothing unless the source really handed it over twice")
        assertEquals(1, aligns.get(), "the same bus image was aligned twice")
        assertTrue(source.frames.all { it.empty() }, "the refused clone was never released")
    }

    /**
     * One align at a time. `MarkerTracker` is plain mutable state that both jobs would smooth into
     * at once, and the second job takes a second bus frame while the first still holds one.
     */
    @Test
    fun `no second align starts while one is still in flight`() {
        val pool = Executors.newSingleThreadExecutor()
        val source = UnfilteredFrames(version = null)
        val inside = CountDownLatch(1)
        val go = CountDownLatch(1)
        val aligns = AtomicInteger()
        val align =
            liveAlign(aligns, pool.asCoroutineDispatcher()) {
                inside.countDown()
                go.await()
            }
        try {
            align.maybeAlign(source, DELIVERED)
            assertTrue(inside.await(TIMEOUT_S, TimeUnit.SECONDS), "the first align never started")
            align.maybeAlign(source, DELIVERED)

            assertEquals(1, source.clones, "a second align took a bus frame while the first was still running")
            assertEquals(1, aligns.get(), "two aligns were in flight on one MarkerTracker")
        } finally {
            go.countDown()
            pool.shutdownNow()
        }
    }

    /** [onAlign] runs INSIDE the coroutine — `geometry()` is the first thing the job evaluates. */
    private fun liveAlign(
        aligns: AtomicInteger,
        dispatcher: CoroutineDispatcher = Dispatchers.Unconfined,
        onAlign: () -> Unit = {},
    ): LiveAlign =
        LiveAlign(
            CoroutineScope(Dispatchers.Unconfined),
            {
                aligns.incrementAndGet()
                onAlign()
                BoardGeometry(boardSize = BOARD_SIZE)
            },
            { CONFIG },
            {},
            dispatcher = dispatcher,
        )

    /**
     * Stamps a version but does NOT filter on `afterVersion` — the documented unversioned
     * behaviour. Blank on purpose: ArUco finds nothing, which is enough to see WHETHER it looked.
     */
    private class UnfilteredFrames(
        private val version: Long?,
    ) : CalibrationFrames<Unit> {
        val frames = mutableListOf<Mat>()
        val clones get() = frames.size

        override fun latestCalibrationFrame(): Mat = Mat(FRAME_SIDE, FRAME_SIDE, CvType.CV_8UC3)

        override fun latestCalibrationSample(): CalibrationFrame =
            CalibrationFrame(version, latestCalibrationFrame()).also { frames += it.frame }

        override val rawPreview: StateFlow<Unit?> = MutableStateFlow(null)
        override val previewRotation: StateFlow<Int> = MutableStateFlow(0)
        override val boardPreview: StateFlow<Unit?> = MutableStateFlow(null)
        override val cameraHealth: StateFlow<CameraHealth> = MutableStateFlow(CameraHealth.Up)
    }

    private companion object {
        const val FRAME_SIDE = 64
        const val BOARD_SIZE = 320
        const val TIMEOUT_S = 10L
        val DELIVERED = DeliveredSize(FRAME_SIDE, FRAME_SIDE, 0)

        /** `alignEvery = 1` so every call aligns; the default of 3 would need three. */
        val CONFIG = TrackerConfig().copy(alignEvery = 1)

        @BeforeAll
        @JvmStatic
        fun natives() {
            Loader.load(opencv_java::class.java)
        }
    }
}
