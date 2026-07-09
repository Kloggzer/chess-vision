package com.chesslab.tracker.camera

import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageProxy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.conflate
import kotlinx.coroutines.suspendCancellableCoroutine
import org.opencv.core.Mat
import java.util.concurrent.Executors
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * CameraX front-end for the tracker.
 *
 * Grab-latest semantics (the Android equivalent of the Python `LatestFrame`
 * wrapper, `src/chesslab/web/camera.py:150-161`): `ImageAnalysis` is configured with
 * [ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST] so CameraX only ever holds the newest
 * frame, and [frames] is [conflate]d so a slow engine can never queue stale frames.
 *
 * Analysis resolution is settings-driven and can be rebound live via
 * [setResolution] (used by [DynamicResolutionController]). A separate
 * [ImageCapture] use case provides on-demand hi-res stills via [captureHiRes],
 * independent of the analysis resolution.
 */
class TrackerCamera(
    private val context: Context,
    private val lifecycleOwner: LifecycleOwner,
) : ResolutionTarget {
    private val analysisExecutor = Executors.newSingleThreadExecutor()
    private val converter = YuvToBgrConverter()

    private val _frames =
        MutableSharedFlow<CameraFrame>(
            replay = 0,
            extraBufferCapacity = 1,
            onBufferOverflow = BufferOverflow.DROP_OLDEST,
        )

    /** Warped-ready analysis frames; conflated (grab-latest). */
    val frames: Flow<CameraFrame> = _frames.asSharedFlow().conflate()

    private var cameraProvider: ProcessCameraProvider? = null
    private var imageCapture: ImageCapture? = null
    private var config: CameraConfig = CameraConfig()

    /** Binds the camera use cases. Idempotent per lifecycle. */
    fun start(config: CameraConfig) {
        this.config = config
        val future = ProcessCameraProvider.getInstance(context)
        future.addListener({
            cameraProvider = future.get()
            bindUseCases()
        }, ContextCompat.getMainExecutor(context))
    }

    /** Rebinds [ImageAnalysis] at the requested resolution. */
    override fun setResolution(res: Resolution) {
        config = config.copy(resolution = res)
        if (cameraProvider != null) {
            bindUseCases()
        }
    }

    /**
     * Captures one full-resolution still (for CNN verify / uncertainty, phase 05),
     * independent of the analysis resolution.
     */
    suspend fun captureHiRes(): Mat {
        val capture = imageCapture ?: error("Camera not started")
        return suspendCancellableCoroutine { cont ->
            capture.takePicture(
                analysisExecutor,
                object : ImageCapture.OnImageCapturedCallback() {
                    override fun onCaptureSuccess(image: ImageProxy) {
                        try {
                            cont.resume(converter.convert(image))
                        } catch (e: IllegalStateException) {
                            cont.resumeWithException(e)
                        } finally {
                            image.close()
                        }
                    }

                    override fun onError(exception: androidx.camera.core.ImageCaptureException) {
                        cont.resumeWithException(exception)
                    }
                },
            )
        }
    }

    private fun bindUseCases() {
        val provider = cameraProvider ?: return
        val selector = resolutionSelector(config.resolution)
        val analysis = buildAnalysis(selector)
        val capture =
            ImageCapture
                .Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                .build()
        imageCapture = capture

        val cameraSelector =
            CameraSelector
                .Builder()
                .requireLensFacing(config.lensFacing)
                .build()

        provider.unbindAll()
        provider.bindToLifecycle(lifecycleOwner, cameraSelector, analysis, capture)
    }

    private fun buildAnalysis(selector: ResolutionSelector): ImageAnalysis {
        val analysis =
            ImageAnalysis
                .Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setResolutionSelector(selector)
                .build()
        analysis.setAnalyzer(analysisExecutor) { image ->
            emitFrame(image)
        }
        return analysis
    }

    private fun emitFrame(image: ImageProxy) {
        try {
            val mat = converter.convert(image)
            _frames.tryEmit(
                CameraFrame(
                    mat = mat,
                    timestampNs = image.imageInfo.timestamp,
                    width = image.width,
                    height = image.height,
                ),
            )
        } finally {
            image.close()
        }
    }

    private fun resolutionSelector(res: Resolution): ResolutionSelector =
        ResolutionSelector
            .Builder()
            .setResolutionStrategy(
                ResolutionStrategy(
                    res.size(),
                    ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER,
                ),
            ).build()
}
