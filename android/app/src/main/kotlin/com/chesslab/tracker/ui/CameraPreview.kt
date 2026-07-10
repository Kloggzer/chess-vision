package com.chesslab.tracker.ui

import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.chesslab.tracker.camera.YuvToBgrConverter
import org.opencv.core.Mat
import java.util.concurrent.Executors

/**
 * Live CameraX [Preview] hosted in an [AndroidView], with optional [ImageAnalysis]
 * that captures the latest frame for ArUco detection.
 *
 * Used by the calibration screen so the user can tap the four board corners on a
 * live image. When [latestFrameRef] is provided, an [ImageAnalysis] use case is
 * also bound and the latest BGR [Mat] is stored in the ref (on the analysis thread).
 * The caller must release the Mat when done with it.
 *
 * Independent of the tracker's [com.chesslab.tracker.camera.TrackerCamera] analysis binding.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun CameraPreview(
    modifier: Modifier = Modifier,
    latestFrameRef: MutableState<Mat?>? = null,
) {
    val lifecycleOwner = LocalLifecycleOwner.current
    val analysisExecutor = remember { Executors.newSingleThreadExecutor() }
    val converter = remember { YuvToBgrConverter() }

    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            val previewView = PreviewView(ctx)
            val future = ProcessCameraProvider.getInstance(ctx)
            future.addListener({
                val provider = future.get()
                val preview =
                    Preview.Builder().build().apply {
                        surfaceProvider = previewView.surfaceProvider
                    }

                val analysis =
                    if (latestFrameRef != null) {
                        ImageAnalysis
                            .Builder()
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()
                            .apply {
                                setAnalyzer(analysisExecutor) { image ->
                                    latestFrameRef.value?.release()
                                    val bgr = converter.convert(image)
                                    latestFrameRef.value = bgr
                                    image.close()
                                }
                            }
                    } else {
                        null
                    }

                provider.unbindAll()
                if (analysis != null) {
                    provider.bindToLifecycle(
                        lifecycleOwner,
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        preview,
                        analysis,
                    )
                } else {
                    provider.bindToLifecycle(
                        lifecycleOwner,
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        preview,
                    )
                }
            }, ContextCompat.getMainExecutor(ctx))
            previewView
        },
    )
}
