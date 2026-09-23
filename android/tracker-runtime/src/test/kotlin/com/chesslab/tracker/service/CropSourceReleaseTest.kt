package com.chesslab.tracker.service

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.forNativeCrops
import com.chesslab.tracker.pipeline.CropFrameStore
import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.opencv.core.CvType
import org.opencv.core.Mat

/** The observer catches and carries on, so every failed stage leaked both native warps. */
class CropSourceReleaseTest {
    private val geometry = BoardGeometry(boardSize = 1000, outW = 80, padSide = 0.05)

    @Test
    fun theGridWarpIsReleasedWhenTheCutThrows() {
        val gridWarp = Mat(600, 600, CvType.CV_8UC3)
        val thrown = takeFailing(cropWarp = Mat(), gridWarp = gridWarp)

        assertTrue(thrown != null, "precondition: the cut must fail")
        assertTrue(gridWarp.empty(), "the grid warp must be released even when the cut throws")
    }

    @Test
    fun theCropWarpIsReleasedWhenTheGridReadThrows() {
        val cropWarp = Mat(720, 720, CvType.CV_8UC3)
        // Zweikanalig: der Rillen-Sensor wirft beim Eingrauen, sichtbar erst beim Join desselben Futures.
        val store = CropFrameStore()
        store.update(pending(cropWarp, Mat(600, 600, CvType.CV_8UC2)))
        val frame = cropFrameSource(store).take()

        assertTrue(frame != null, "the cut itself succeeds")
        val thrown = runCatching { frame!!.gridOccludedSquares() }.exceptionOrNull()
        assertTrue(thrown != null, "precondition: the groove read must fail")
        assertTrue(cropWarp.empty(), "the crop warp must be released even when the groove read throws")
    }

    private fun takeFailing(
        cropWarp: Mat,
        gridWarp: Mat,
    ): Throwable? {
        val store = CropFrameStore()
        store.update(pending(cropWarp, gridWarp))
        return runCatching { cropFrameSource(store).take() }.exceptionOrNull()
    }

    private fun pending(
        cropWarp: Mat,
        gridWarp: Mat,
    ) = CropFrameStore.Pending(
        cropWarp = cropWarp,
        seq = 1,
        tsMs = 0,
        bgrDet = BgrImage(1, 1, ByteArray(3)),
        grayDet = GrayImage(1, 1, ByteArray(1)),
        geometry = geometry.forNativeCrops(),
        grid = CropFrameStore.GridPlane(gridWarp, geometry),
    )

    companion object {
        @JvmStatic
        @BeforeAll
        fun loadOpenCv() {
            Loader.load(opencv_java::class.java)
        }
    }
}
