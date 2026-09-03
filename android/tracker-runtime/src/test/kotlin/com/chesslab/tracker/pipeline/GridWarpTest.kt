package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.cropBorderPx
import com.chesslab.geometry.forNativeCrops
import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar

/**
 * Der Rillen-Sensor liest die Kalibriergroesse, die Crops das Modell: bei `outW` 80 ist der Crop-Warp
 * 576 px, und dort flaggten die Rillen 13 Felder auf ruhigem Rig-Brett (2026-09-04, 0 von 25 Plies).
 */
class GridWarpTest {
    private val geometry = BoardGeometry(boardSize = 1000, outW = 80, padSide = 0.05)
    private val corners = floatArrayOf(100f, 100f, 1100f, 100f, 1100f, 1100f, 100f, 1100f)

    @Test
    fun theGridArmGetsItsOwnWarpAtCalibratedSize() {
        val pending = pendingWith(gridArm = true)
        val native = geometry.forNativeCrops()
        assertEquals(576, native.boardSize, "precondition: the model's crop plane is smaller")
        assertEquals(native.boardSize + 2 * cropBorderPx(native), requireNotNull(pending.cropWarp).cols())
        assertEquals(geometry.boardSize + 2 * cropBorderPx(geometry), requireNotNull(pending.grid).warp.cols())
        assertEquals(geometry, pending.grid?.geometry)
        pending.release()
    }

    @Test
    fun withoutTheGridArmThereIsNoSecondWarp() {
        val pending = pendingWith(gridArm = false)
        assertNull(pending.grid)
        pending.release()
    }

    private fun pendingWith(gridArm: Boolean): CropFrameStore.Pending {
        val store = CropFrameStore()
        val config = TrackerConfig(boardSize = geometry.boardSize)
        val stages = OpenCvStages<Mat>({ it }, {}, geometry, config, store, gridArm = gridArm)
        val frame = Mat(1200, 1200, CvType.CV_8UC3, Scalar(128.0, 128.0, 128.0))
        stages.convert(frame)
        stages.warpDetection(corners)
        store.request()
        stages.updateCropFrame(corners, seq = 1, tsMs = 0, bgr = stages.bgrDet(), gray = stages.grayDet())
        stages.close()
        frame.release()
        return requireNotNull(store.take())
    }

    companion object {
        @JvmStatic
        @BeforeAll
        fun loadOpenCv() {
            Loader.load(opencv_java::class.java)
        }
    }
}
