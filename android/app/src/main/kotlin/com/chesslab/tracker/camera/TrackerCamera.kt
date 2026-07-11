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
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.imgcodecs.Imgcodecs
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
) : ResolutionTarget,
    AutoCloseable {
    private val analysisExecutor = Executors.newSingleThreadExecutor()
    private val converter = YuvToBgrConverter()

    private val frameChannel =
        Channel<CameraFrame>(
            capacity = 1,
            onBufferOverflow = BufferOverflow.DROP_OLDEST,
            onUndeliveredElement = { it.mat.release() },
        )

    /** Warped-ready analysis frames; the single buffered frame owns its native Mat. */
    val frames: Flow<CameraFrame> = frameChannel.receiveAsFlow()

    private var cameraProvider: ProcessCameraProvider? = null
    private var imageCapture: ImageCapture? = null
    private var config: CameraConfig = CameraConfig()
    private var camera: androidx.camera.core.Camera? = null

    @Volatile private var lockExposure = false

    @Volatile private var focusDistanceDiopters = 0.0

    /**
     * EXPERIMENTAL sensor tuning (Camera2 interop), re-applied after every rebind:
     * - [lockExposure]: AE + AWB lock — the sensor's auto-exposure otherwise re-meters on
     *   every hand entering the frame (live luma swung 91..139), manufacturing exactly the
     *   global lighting shifts the diff robustness stack then has to veto. Lock AFTER the
     *   board is calibrated and lit; the dark-frame gate still catches a truly darkened room.
     * - [focusDistance] > 0: fixed manual focus in diopters (1/m; ~2.0 = 50 cm mount height,
     *   0 = keep continuous autofocus). Stops AF hunting from blurring the reference.
     */
    fun applyTuning(
        lockExposure: Boolean,
        focusDistance: Double,
    ) {
        this.lockExposure = lockExposure
        this.focusDistanceDiopters = focusDistance
        camera?.let { applyCaptureOptions(it) }
    }

    @androidx.annotation.OptIn(androidx.camera.camera2.interop.ExperimentalCamera2Interop::class)
    private fun applyCaptureOptions(camera: androidx.camera.core.Camera) {
        val builder = androidx.camera.camera2.interop.CaptureRequestOptions.Builder()
        if (lockExposure) {
            builder.setCaptureRequestOption(android.hardware.camera2.CaptureRequest.CONTROL_AE_LOCK, true)
            builder.setCaptureRequestOption(android.hardware.camera2.CaptureRequest.CONTROL_AWB_LOCK, true)
        }
        if (focusDistanceDiopters > 0) {
            builder.setCaptureRequestOption(
                android.hardware.camera2.CaptureRequest.CONTROL_AF_MODE,
                android.hardware.camera2.CaptureRequest.CONTROL_AF_MODE_OFF,
            )
            builder.setCaptureRequestOption(
                android.hardware.camera2.CaptureRequest.LENS_FOCUS_DISTANCE,
                focusDistanceDiopters.toFloat(),
            )
        }
        // Empty options clear previous locks (back to full auto).
        androidx.camera.camera2.interop.Camera2CameraControl
            .from(camera.cameraControl)
            .setCaptureRequestOptions(builder.build())
    }

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
                            cont.resume(decodeJpeg(image))
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

    /**
     * Decode an [ImageCapture] still into a BGR [Mat]. ImageCapture delivers JPEG
     * (a single plane of compressed bytes) — not the YUV planes the analysis path
     * uses — so it must be decoded, not run through [YuvToBgrConverter].
     */
    private fun decodeJpeg(image: ImageProxy): Mat {
        val buffer = image.planes[0].buffer
        val n = buffer.remaining()
        val bytes = ByteArray(n)
        buffer.get(bytes)
        // Wrap the JPEG bytes in a 1×N CV_8U Mat (avoids MatOfByte's spread-operator copy).
        val encoded = Mat(1, n, CvType.CV_8UC1)
        encoded.put(0, 0, bytes)
        val mat = Imgcodecs.imdecode(encoded, Imgcodecs.IMREAD_COLOR)
        encoded.release()
        check(!mat.empty()) { "Failed to decode captured JPEG still" }
        return mat
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
        val bound = provider.bindToLifecycle(lifecycleOwner, cameraSelector, analysis, capture)
        camera = bound
        // Rebinds (resolution change) reset the capture session — re-apply the tuning.
        if (lockExposure || focusDistanceDiopters > 0) applyCaptureOptions(bound)
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
            val frame =
                CameraFrame(
                    mat = mat,
                    timestampNs = image.imageInfo.timestamp,
                    width = image.width,
                    height = image.height,
                )
            val sent = frameChannel.trySend(frame)
            if (sent.isFailure) mat.release()
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

    /** Unbind camera use cases while keeping this instance restartable. */
    fun stop() {
        cameraProvider?.unbindAll()
        imageCapture = null
        camera = null
    }

    override fun close() {
        frameChannel.cancel()
        stop()
        analysisExecutor.shutdownNow()
    }
}
