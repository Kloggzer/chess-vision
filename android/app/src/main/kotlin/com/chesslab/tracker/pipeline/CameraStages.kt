package com.chesslab.tracker.pipeline

import androidx.camera.core.ImageProxy
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.Undistorter
import org.opencv.core.Mat

/**
 * The phone's frame type, bound to the shared stages.
 *
 * This is the entire Android half of the pipeline: a CameraX `ImageProxy` becomes BGR, and
 * everything after that is the same code the desktop runs. [YuvToBgr] is stateful — it reuses its
 * destination buffers — so it is owned here, one per stack, exactly as it was when it lived inside
 * the stages.
 *
 * [lens] is null today and there is no code path that makes it anything else: nothing on the phone
 * stores a calibration, and a "calibrate the lens" button whose file `LensMode.AUTO` would then
 * switch ON is a one-tap way to make the phone worse (specs/41 took the real phone video from a
 * median 29.83 px offset to 2.00 with the projective quad refit alone, no lens). The parameter is
 * here so the phone's frame path is the same shape as the desktop's, not so it can be turned on
 * without a measurement that says it should be.
 */
fun cameraStages(
    geometry: BoardGeometry,
    config: TrackerConfig,
    cropStore: CropFrameStore,
    frameBus: (Mat) -> Unit = {},
    boardBus: (Mat) -> Unit = {},
    lens: Undistorter? = null,
): FrameStages<ImageProxy> {
    val yuv = YuvToBgr()
    return OpenCvStages(yuv::convert, yuv::close, geometry, config, cropStore, frameBus, boardBus, lens)
}
