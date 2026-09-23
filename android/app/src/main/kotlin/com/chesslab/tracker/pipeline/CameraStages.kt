package com.chesslab.tracker.pipeline

import androidx.camera.core.ImageProxy
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import org.opencv.core.Mat

/**
 * The phone's frame type, bound to the shared stages.
 *
 * This is the entire Android half of the pipeline: a CameraX `ImageProxy` becomes BGR, and
 * everything after that is the same code the desktop runs. [YuvToBgr] is stateful — it reuses its
 * destination buffers — so it is owned here, one per stack, exactly as it was when it lived inside
 * the stages. No lens: specs/41 took the phone from 29.83 px to 2.00 with the quad refit alone.
 */
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
