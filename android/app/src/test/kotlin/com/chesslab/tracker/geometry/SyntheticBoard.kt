package com.chesslab.tracker.geometry

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.warpBoardForCrops
import com.chesslab.tracker.pipeline.CropFrameStore
import com.chesslab.tracker.service.cropFrameSource
import org.opencv.core.CvType
import org.opencv.core.Mat

internal const val SYNTHETIC_FRAME_SIDE = 640
private const val CHANNELS = 3
private const val BOARD_INSET = 40.0

private val CORNERS: List<DoubleArray> =
    listOf(
        doubleArrayOf(BOARD_INSET, BOARD_INSET),
        doubleArrayOf(SYNTHETIC_FRAME_SIDE - BOARD_INSET, BOARD_INSET),
        doubleArrayOf(SYNTHETIC_FRAME_SIDE - BOARD_INSET, SYNTHETIC_FRAME_SIDE - BOARD_INSET),
        doubleArrayOf(BOARD_INSET, SYNTHETIC_FRAME_SIDE - BOARD_INSET),
    )

internal fun storeWithSyntheticWarp(geom: BoardGeometry): CropFrameStore {
    val store = CropFrameStore()
    val frame = syntheticFrame()
    val warp = warpBoardForCrops(frame, geom, CORNERS)
    frame.release()
    store.update(CropFrameStore.Pending(warp, 7L, 11L, BgrImage(2, 2, ByteArray(12)), GrayImage(2, 2, ByteArray(4)), geom))
    return store
}

internal fun cropsAsHandedToTheClassifier(geom: BoardGeometry): List<BgrImage> =
    requireNotNull(cropFrameSource(storeWithSyntheticWarp(geom)).take()) { "the store held a pending warp" }.crops

/** High-frequency B and G expose any change of scale or offset byte-wise, a per-cell R a transposed crop. */
private fun syntheticFrame(): Mat {
    val data = ByteArray(SYNTHETIC_FRAME_SIDE * SYNTHETIC_FRAME_SIDE * CHANNELS)
    var i = 0
    for (y in 0 until SYNTHETIC_FRAME_SIDE) {
        for (x in 0 until SYNTHETIC_FRAME_SIDE) {
            data[i] = (x * 7 % 251).toByte()
            data[i + 1] = (y * 11 % 241).toByte()
            data[i + 2] = ((x / 70 * 8 + y / 70) * 3).toByte()
            i += CHANNELS
        }
    }
    val frame = Mat(SYNTHETIC_FRAME_SIDE, SYNTHETIC_FRAME_SIDE, CvType.CV_8UC3)
    frame.put(0, 0, data)
    return frame
}
