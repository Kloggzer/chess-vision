package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.OpenCvGate
import com.chesslab.tracker.camera.DeliveredSize
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.asCoroutineDispatcher
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.CvType
import org.opencv.core.Mat
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference

/** ArUco (44-87 ms) ran on `Dispatchers.Main.immediate` for months. The probe is `geometry`: evaluated
 *  INSIDE the coroutine. */
@EnabledIf(OpenCvGate.REF)
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
            object : CalibrationFrames<Unit> by BlankFrames(FRAME_SIDE) {
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

    /** Der Refit sagt es weiter: sonst verglich jeder Frame gegen ein anders ausgerichtetes Referenzbild. */
    @Test
    fun aRegridSaysSoAndOnlyWhenTheBoardReallyMoved() {
        assertEquals(0, refitsAfterMarkerShift(shiftPx = 0.5), "marker jitter must not throw the reference away")
        assertEquals(1, refitsAfterMarkerShift(shiftPx = 60.0), "a board that moved must drop the reference")
    }

    private fun refitsAfterMarkerShift(shiftPx: Double): Int {
        val refits = AtomicInteger()
        val align =
            LiveAlign(
                CoroutineScope(Dispatchers.Unconfined),
                { BoardGeometry(boardSize = BOARD_SIZE) },
                { CONFIG },
                {},
                dispatcher = Dispatchers.Unconfined,
                cachedMarkers = { frame -> markerQuad(if (frame == 1L) 0.0 else shiftPx) },
                onRectificationChanged = { refits.incrementAndGet() },
            )
        val frames = BlankFrames(BOARD_SIZE)
        align.maybeAlign(frames, DeliveredSize(BOARD_SIZE, BOARD_SIZE, 0))
        align.maybeAlign(frames, DeliveredSize(BOARD_SIZE, BOARD_SIZE, 0))
        return refits.get()
    }

    private fun markerQuad(shiftPx: Double): Map<Int, DoubleArray> =
        mapOf(
            0 to doubleArrayOf(MARKER_LOW + shiftPx, MARKER_LOW),
            1 to doubleArrayOf(MARKER_HIGH + shiftPx, MARKER_LOW),
            2 to doubleArrayOf(MARKER_HIGH + shiftPx, MARKER_HIGH),
            3 to doubleArrayOf(MARKER_LOW + shiftPx, MARKER_HIGH),
        )

    /** An align in flight landing after `applyCalibration` silently replaced the fresh calibration. */
    @Test
    fun anAlignFromBeforeTheRecalibrationIsDropped() {
        assertNull(alignAcross(resetMidFlight = true), "a job launched before the reset must not install its corners")
        assertNotNull(alignAcross(resetMidFlight = false), "without a reset the align must still apply — else this proves nothing")
    }

    private fun alignAcross(resetMidFlight: Boolean): FloatArray? {
        val pool = Executors.newSingleThreadExecutor { Thread(it, NAMED_THREAD) }
        val applied = AtomicReference<FloatArray?>(null)
        val sunk = AtomicReference<FloatArray?>(null)
        val inside = CountDownLatch(1)
        val go = CountDownLatch(1)
        val held = AtomicBoolean(false)
        val delivered = DeliveredSize(MARKER_CANVAS, MARKER_CANVAS, 0)
        val align =
            LiveAlign(
                CoroutineScope(Dispatchers.Unconfined),
                {
                    if (held.compareAndSet(false, true)) {
                        inside.countDown()
                        go.await()
                    }
                    BoardGeometry(boardSize = BOARD_SIZE)
                },
                { CONFIG },
                { applied.set(it) },
                dispatcher = pool.asCoroutineDispatcher(),
                cornerSink = { _, corners -> sunk.set(corners) },
            )
        try {
            align.maybeAlign(MarkerFrames, delivered)
            assertTrue(inside.await(TIMEOUT_SECONDS, TimeUnit.SECONDS), "the align never started")
            if (resetMidFlight) align.reset(delivered)
            go.countDown()
            pool.shutdown()
            assertTrue(pool.awaitTermination(TIMEOUT_SECONDS, TimeUnit.SECONDS), "the align never finished")
        } finally {
            pool.shutdownNow()
        }
        assertEquals(applied.get()?.toList(), sunk.get()?.toList(), "the sink and the pipeline must see the same decision")
        return applied.get()
    }

    @Test
    fun alignRunsOffTheScopesOwnThread() {
        val ran = runAlignOn(dispatcher = null)
        assertTrue(ran != null, "the align never ran at all, so this test proved nothing")
        assertNotEquals(SCOPE_THREAD, ran, "align must not run on the scope's thread — that is the UI thread on the phone")
    }

    /** Counter-test: any thread hop passes the one above; only the parameter reaches a THIRD thread. */
    @Test
    fun theDispatcherIsWhatDecides() {
        val elsewhere = Executors.newSingleThreadExecutor { Thread(it, NAMED_THREAD) }
        try {
            assertEquals(NAMED_THREAD, runAlignOn(elsewhere.asCoroutineDispatcher()))
        } finally {
            elsewhere.shutdown()
        }
    }

    private fun runAlignOn(dispatcher: CoroutineDispatcher?): String? {
        val pool = Executors.newSingleThreadExecutor { Thread(it, SCOPE_THREAD) }
        val scope = CoroutineScope(pool.asCoroutineDispatcher())
        val seen = AtomicReference<String?>(null)
        val done = CountDownLatch(1)
        val geometry = {
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
            align.maybeAlign(BlankFrames(FRAME_SIDE), DeliveredSize(FRAME_SIDE, FRAME_SIDE, 0))
            assertTrue(done.await(TIMEOUT_SECONDS, TimeUnit.SECONDS), "the align never started")
            return seen.get()
        } finally {
            pool.shutdown()
        }
    }

    private class VersionedBlankFrame(
        private val version: Long,
    ) : BlankFrames(FRAME_SIDE) {
        var clones = 0
            private set

        override fun latestCalibrationSample(): CalibrationFrame = sample()

        override fun latestCalibrationSample(afterVersion: Long?): CalibrationFrame? = if (afterVersion == version) null else sample()

        private fun sample(): CalibrationFrame {
            clones += 1
            return CalibrationFrame(version, Mat(FRAME_SIDE, FRAME_SIDE, CvType.CV_8UC3))
        }
    }

    private companion object {
        const val SCOPE_THREAD = "pretend-main"

        val CACHED_CORNERS = floatArrayOf(1f, 2f, 3f, 4f, 5f, 6f, 7f, 8f)

        const val NAMED_THREAD = "somewhere-else"
        const val FRAME_SIDE = 64
        const val BOARD_SIZE = 320

        const val MARKER_LOW = 40.0
        const val MARKER_HIGH = 240.0
        const val TIMEOUT_SECONDS = 10L

        val CONFIG = TrackerConfig().copy(alignEvery = 1)
    }
}
