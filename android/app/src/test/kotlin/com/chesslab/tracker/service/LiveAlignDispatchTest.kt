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
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc
import org.opencv.objdetect.Objdetect
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
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

    /**
     * Der Refit sagt es weiter. Die Korrektur wird seit jeher nachgemessen, die Pixel-Referenz blieb
     * — danach verglich jeder Frame gegen ein anders ausgerichtetes Bild (`docs/verifier-stall.md`).
     */
    @Test
    fun aRegridSaysSoAndOnlyWhenTheBoardReallyMoved() {
        assertEquals(0, refitsAfterMarkerShift(shiftPx = 0.5), "marker jitter must not throw the reference away")
        assertEquals(1, refitsAfterMarkerShift(shiftPx = 60.0), "a board that moved must drop the reference")
    }

    /** Two aligns from cached markers, the second one [shiftPx] away; returns the refits reported. */
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
        align.maybeAlign(BoardSizedBlankFrame, DeliveredSize(BOARD_SIZE, BOARD_SIZE, 0))
        align.maybeAlign(BoardSizedBlankFrame, DeliveredSize(BOARD_SIZE, BOARD_SIZE, 0))
        return refits.get()
    }

    /** The four board markers `[a8, h8, h1, a1]`, all of them moved [shiftPx] along x. */
    private fun markerQuad(shiftPx: Double): Map<Int, DoubleArray> =
        mapOf(
            0 to doubleArrayOf(MARKER_LOW + shiftPx, MARKER_LOW),
            1 to doubleArrayOf(MARKER_HIGH + shiftPx, MARKER_LOW),
            2 to doubleArrayOf(MARKER_HIGH + shiftPx, MARKER_HIGH),
            3 to doubleArrayOf(MARKER_LOW + shiftPx, MARKER_HIGH),
        )

    /**
     * An align in flight has an OLD frame and an old smoother; `applyCalibration` resets the tracker
     * and installs fresh corners under it. Landing afterwards, its quad — measured before the user
     * recalibrated — replaced the calibration that had just been made, silently.
     */
    @Test
    fun anAlignFromBeforeTheRecalibrationIsDropped() {
        assertNull(alignAcross(resetMidFlight = true), "a job launched before the reset must not install its corners")
        assertNotNull(alignAcross(resetMidFlight = false), "without a reset the align must still apply — else this proves nothing")
    }

    /** One align held inside `geometry()`; [resetMidFlight] recalibrates while it waits. */
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

    /** Big enough that the marker quad and its shift stay inside the image. */
    private object BoardSizedBlankFrame : CalibrationFrames<Unit> by OneBlankFrame {
        override fun latestCalibrationFrame(): Mat = Mat(BOARD_SIZE, BOARD_SIZE, CvType.CV_8UC3)

        override fun latestCalibrationSample(): CalibrationFrame = CalibrationFrame(null, latestCalibrationFrame())

        override fun latestCalibrationSample(afterVersion: Long?): CalibrationFrame = latestCalibrationSample()
    }

    private class VersionedBlankFrame(
        private val version: Long,
    ) : CalibrationFrames<Unit> by OneBlankFrame {
        var clones = 0
            private set

        override fun latestCalibrationSample(): CalibrationFrame = sample()

        override fun latestCalibrationSample(afterVersion: Long?): CalibrationFrame? = if (afterVersion == version) null else sample()

        private fun sample(): CalibrationFrame {
            clones += 1
            return CalibrationFrame(version, Mat(FRAME_SIDE, FRAME_SIDE, CvType.CV_8UC3))
        }
    }

    /** The four board markers really rendered, so the async path produces corners to apply. */
    private object MarkerFrames : CalibrationFrames<Unit> by OneBlankFrame {
        override fun latestCalibrationFrame(): Mat {
            val img = Mat(MARKER_CANVAS, MARKER_CANVAS, CvType.CV_8UC3, Scalar(WHITE, WHITE, WHITE))
            val dict = Objdetect.getPredefinedDictionary(Objdetect.DICT_4X4_50)
            for (id in 0..3) {
                val marker = Mat()
                Objdetect.generateImageMarker(dict, id, MARKER_PX, marker)
                val bgr = Mat()
                Imgproc.cvtColor(marker, bgr, Imgproc.COLOR_GRAY2BGR)
                val (x, y) = markerOrigin(id)
                bgr.copyTo(img.submat(y, y + MARKER_PX, x, x + MARKER_PX))
            }
            return img
        }

        override fun latestCalibrationSample(): CalibrationFrame = CalibrationFrame(null, latestCalibrationFrame())

        override fun latestCalibrationSample(afterVersion: Long?): CalibrationFrame = latestCalibrationSample()

        /** Ids in `[a8, h8, h1, a1]` order, inset from the canvas edges. */
        private fun markerOrigin(id: Int): Pair<Int, Int> {
            val far = MARKER_CANVAS - MARKER_INSET - MARKER_PX
            return when (id) {
                0 -> MARKER_INSET to MARKER_INSET
                1 -> far to MARKER_INSET
                2 -> far to far
                else -> MARKER_INSET to far
            }
        }
    }

    private companion object {
        /** Stands in for the phone's UI thread: what `lifecycleScope` gave `LiveAlign` for months. */
        const val SCOPE_THREAD = "pretend-main"

        const val MARKER_CANVAS = 800
        const val MARKER_PX = 120
        const val MARKER_INSET = 120
        const val WHITE = 255.0
        val CACHED_CORNERS = floatArrayOf(1f, 2f, 3f, 4f, 5f, 6f, 7f, 8f)

        /** Belongs to neither the scope nor `Dispatchers.Default` — only the parameter reaches it. */
        const val NAMED_THREAD = "somewhere-else"
        const val FRAME_SIDE = 64
        const val BOARD_SIZE = 320

        /** A quad inside [BOARD_SIZE]; one cell is 40 px, so `DRIFT_REFIT_CELLS` is 10 px. */
        const val MARKER_LOW = 40.0
        const val MARKER_HIGH = 240.0
        const val TIMEOUT_SECONDS = 10L

        /** `alignEvery = 1` so the very first frame aligns; the default of 3 would need three. */
        val CONFIG = TrackerConfig().copy(alignEvery = 1)

        @JvmStatic
        fun openCvAvailable(): Boolean = runCatching { Loader.load(opencv_java::class.java) }.isSuccess
    }
}

/** JUnit resolves `@EnabledIf` by method reference; the natives live in another module. */
private const val OPENCV_GATE = "com.chesslab.tracker.service.LiveAlignDispatchTest#openCvAvailable"
