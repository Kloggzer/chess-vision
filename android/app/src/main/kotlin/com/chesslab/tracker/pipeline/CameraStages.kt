package com.chesslab.tracker.pipeline

import androidx.camera.core.ImageProxy
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import org.opencv.core.Mat

/** [YuvToBgr] reuses its buffers, so it is owned here, one per stack. No lens: the quad refit alone took
 *  the phone from 29.83 px to 2.00 (specs/41). */
fun cameraStages(
    geometry: BoardGeometry,
    config: TrackerConfig,
    cropStore: CropFrameStore,
    frameBus: (Mat) -> Unit = {},
    boardBus: (Mat) -> Unit = {},
    gridArm: Boolean = true,
): FrameStages<ImageProxy> {
    val yuv = YuvToBgr()
    return OpenCvStages(yuv::convert, yuv::close, geometry, config, cropStore, frameBus, boardBus, gridArm = gridArm)
}
