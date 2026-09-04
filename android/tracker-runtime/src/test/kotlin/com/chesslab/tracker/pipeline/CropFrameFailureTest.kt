package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProbe
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.geometry.BoardGeometry
import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar

/** Ein Abbruch NACH dem Crop-Warp: der Store darf nichts sehen, und die Warps gehoeren niemandem mehr. */
class CropFrameFailureTest {
    private val geometry = BoardGeometry(boardSize = 1000, outW = 80, padSide = 0.05)
    private val corners = floatArrayOf(100f, 100f, 1100f, 100f, 1100f, 1100f, 100f, 1100f)

    @Test
    fun aFailureAfterTheWarpHandsNothingOver() {
        val store = CropFrameStore()
        val config = TrackerConfig(boardSize = geometry.boardSize)
        val stages = OpenCvStages<Mat>({ it }, {}, geometry, config, store)
        val frame = Mat(1200, 1200, CvType.CV_8UC3, Scalar(128.0, 128.0, 128.0))
        stages.convert(frame)
        stages.warpDetection(corners)
        store.request()

        val failed =
            WorkProfiler.install(ThrowingProbe(WorkOperation.CROP_FRAME_COPY)).use {
                runCatching {
                    stages.updateCropFrame(corners, seq = 1, tsMs = 0, bgr = stages.bgrDet(), gray = stages.grayDet())
                }.exceptionOrNull()
            }
        stages.close()
        frame.release()

        assertNotNull(failed, "precondition: the hand-off must fail")
        assertNull(store.take(), "a failed hand-off must not leave a half-built pending behind")
    }

    private class ThrowingProbe(
        private val at: WorkOperation,
    ) : WorkProbe {
        override fun enter(
            operation: WorkOperation,
            input: Long,
        ): Long {
            check(operation != at) { "probe exploded" }
            return 0L
        }

        override fun exit(token: Long) = Unit

        override fun bytes(
            operation: WorkOperation,
            count: Long,
            input: Long,
        ) = Unit

        override fun cache(
            operation: WorkOperation,
            hit: Boolean,
            input: Long,
        ) = Unit
    }

    companion object {
        @JvmStatic
        @BeforeAll
        fun loadOpenCv() {
            Loader.load(opencv_java::class.java)
        }
    }
}
