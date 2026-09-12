package com.chesslab.tracker.service

import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.perf.RecordingWorkProbe
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.opencv.core.CvType
import org.opencv.core.Mat

class CameraFrameBusTest {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Unconfined)

    @AfterEach
    fun closeScope() = scope.cancel()

    @Test
    fun consumersShareTheStableFrameWithoutCopyingItsPixels() {
        val probe = RecordingWorkProbe()
        val profiling = WorkProfiler.install(probe)
        val bus =
            CameraFrameBus(
                MutableStateFlow<CameraHealth>(CameraHealth.Up),
                scope,
                toPreview = { Unit },
            )
        val source = Mat(1, 2, CvType.CV_8UC3)
        val pixels = byteArrayOf(1, 2, 3, 4, 5, 6)
        source.put(0, 0, pixels)
        try {
            bus.offer(source)
            val sample = requireNotNull(bus.latestCalibrationSample())
            bus.close()

            val retained = ByteArray(pixels.size)
            sample.frame.get(0, 0, retained)
            assertArrayEquals(pixels, retained, "the consumer view must retain pixels after the bus releases its header")
            sample.frame.release()
        } finally {
            source.release()
            bus.close()
            profiling.close()
        }

        val work = probe.snapshot()
        assertEquals(pixels.size.toLong(), work.operation(WorkOperation.RAW_FRAME_COPY)?.copiedBytes)
        assertEquals(0L, work.operation(WorkOperation.RAW_PREVIEW_COPY)?.copiedBytes)
        assertEquals(0L, work.operation(WorkOperation.CALIBRATION_FRAME_COPY)?.copiedBytes)
    }

    companion object {
        @JvmStatic
        @BeforeAll
        fun loadOpenCv() {
            Loader.load(opencv_java::class.java)
        }
    }

    /** LiveAlign reads markers at `alignScale`; the bus hands it the resize instead of the clone. */
    @Test
    fun theMarkerReadGetsAResizedCopyAndNobodyGetsAFullClone() {
        val bus = CameraFrameBus(MutableStateFlow<CameraHealth>(CameraHealth.Up), scope, toPreview = { Unit })
        bus.demandFrom(full = { false }, small = { true }, scale = { 0.5 })
        val source = Mat(4, 4, CvType.CV_8UC3)
        try {
            bus.offer(source)
            val sample = requireNotNull(bus.latestCalibrationSample())
            assertEquals(0.5, sample.scale)
            assertEquals(2, sample.frame.rows())
            assertEquals(null, bus.latestCalibrationFrame(), "the calibration tap wants full resolution only")
            sample.frame.release()
        } finally {
            source.release()
            bus.close()
        }
    }

    @Test
    fun withoutAnyConsumerTheBusRetainsNothing() {
        val bus = CameraFrameBus(MutableStateFlow<CameraHealth>(CameraHealth.Up), scope, toPreview = { Unit })
        bus.demandFrom(full = { false }, small = { false }, scale = { 0.5 })
        val source = Mat(4, 4, CvType.CV_8UC3)
        try {
            bus.offer(source)
            assertEquals(null, bus.latestCalibrationSample())
        } finally {
            source.release()
            bus.close()
        }
    }
}
