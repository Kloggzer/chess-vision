package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.camera.DeliveredSize
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc
import org.opencv.objdetect.Objdetect
import java.util.concurrent.atomic.AtomicInteger

/** Bug-Audit C7: ein Wurf hinter der Detection verkeilt das Alignment fuer den Rest der Sitzung.
 *  Ein `finally` um Release und `inFlight` reicht NICHT — der Wurf bricht den Scope ab
 *  (gemessen 2026-09-16, `docs/bug-audit-2026-09-13.md`). */
@EnabledIf(WEDGE_OPENCV_GATE)
class LiveAlignWedgeBugTest {
    @Test
    fun aConsumerThatThrowsDoesNotWedgeEveryLaterAlign() {
        val aligns = AtomicInteger()
        val align =
            LiveAlign(
                CoroutineScope(Dispatchers.Unconfined),
                { BoardGeometry(boardSize = BOARD_SIZE) },
                { CONFIG },
                {
                    // Der Verbraucher zaehlt, nicht `geometry()`: das ruft ein Align zweimal.
                    aligns.incrementAndGet()
                    error("the consumer blew up")
                },
                dispatcher = Dispatchers.Unconfined,
            )
        val delivered = DeliveredSize(MARKER_CANVAS, MARKER_CANVAS, 0)

        runCatching { align.maybeAlign(WedgeMarkerFrames, delivered) }
        val afterFirst = aligns.get()
        runCatching { align.maybeAlign(WedgeMarkerFrames, delivered) }

        assertEquals(
            afterFirst + 1,
            aligns.get(),
            "the second align never started: the first left `inFlight` set because the throw skipped " +
                "both the release and the reset — live alignment is dead for the rest of the session",
        )
    }

    private companion object {
        const val MARKER_CANVAS = 800
        const val BOARD_SIZE = 320
        val CONFIG = TrackerConfig().copy(alignEvery = 1)

        @JvmStatic
        fun openCvAvailable(): Boolean = runCatching { Loader.load(opencv_java::class.java) }.isSuccess
    }
}

/** The four board markers really rendered, so the async path finds corners to hand on. */
private object WedgeMarkerFrames : CalibrationFrames<Unit> {
    override fun latestCalibrationFrame(): Mat {
        val img = Mat(CANVAS, CANVAS, CvType.CV_8UC3, Scalar(LEVEL, LEVEL, LEVEL))
        val dict = Objdetect.getPredefinedDictionary(Objdetect.DICT_4X4_50)
        for (id in 0..3) {
            val marker = Mat()
            Objdetect.generateImageMarker(dict, id, SIDE, marker)
            val bgr = Mat()
            Imgproc.cvtColor(marker, bgr, Imgproc.COLOR_GRAY2BGR)
            val (x, y) = origin(id)
            bgr.copyTo(img.submat(y, y + SIDE, x, x + SIDE))
        }
        return img
    }

    override fun latestCalibrationSample(): CalibrationFrame = CalibrationFrame(null, latestCalibrationFrame())

    override fun latestCalibrationSample(afterVersion: Long?): CalibrationFrame = latestCalibrationSample()

    override val rawPreview: StateFlow<Unit?> = MutableStateFlow(null)
    override val previewRotation: StateFlow<Int> = MutableStateFlow(0)
    override val boardPreview: StateFlow<Unit?> = MutableStateFlow(null)
    override val cameraHealth: StateFlow<CameraHealth> = MutableStateFlow(CameraHealth.Up)

    private const val CANVAS = 800
    private const val SIDE = 120
    private const val INSET = 120
    private const val LEVEL = 255.0

    /** Ids in `[a8, h8, h1, a1]` order, inset from the canvas edges. */
    private fun origin(id: Int): Pair<Int, Int> {
        val far = CANVAS - INSET - SIDE
        return when (id) {
            0 -> INSET to INSET
            1 -> far to INSET
            2 -> far to far
            else -> INSET to far
        }
    }
}

/** JUnit resolves `@EnabledIf` by method reference; the natives live in another module. */
private const val WEDGE_OPENCV_GATE = "com.chesslab.tracker.service.LiveAlignWedgeBugTest#openCvAvailable"
