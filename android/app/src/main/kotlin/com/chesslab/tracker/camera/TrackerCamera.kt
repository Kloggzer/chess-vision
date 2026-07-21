package com.chesslab.tracker.camera

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.camera.core.CameraSelector
import androidx.camera.core.CameraState
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageProxy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.Observer
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

    // -- Camera-device robustness (phase 03, ports dba6f29/43fa7bb adapted to CameraX) --
    private val reconnectPolicy = ReconnectPolicy()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var rebindScheduled = false
    private var observedInfo: androidx.camera.core.CameraInfo? = null
    private var lastStateError: CameraState.StateError? = null

    @Volatile private var cameraDown = false

    /**
     * Camera-device status callback for the service (main thread): a non-null note means
     * the camera is down and a rebind is scheduled; null means frames flow again.
     */
    @Volatile var onCameraDown: ((String?) -> Unit)? = null

    /**
     * CameraState observer: a CLOSING/CLOSED state with an error, or one of the
     * recoverable/fatal error codes, means the device is gone — schedule a rebind
     * (unbindAll + bind again) with exponential backoff instead of freezing silently.
     */
    private val cameraStateObserver =
        Observer<CameraState> { s ->
            val err = s.error
            val closedWithError = err != null && (s.type == CameraState.Type.CLOSED || s.type == CameraState.Type.CLOSING)
            val knownError = err != null && err.code in RECOVERABLE_ERROR_CODES
            if (closedWithError || knownError) {
                lastStateError = err
                scheduleRebind(err)
            }
        }

    /** Rebind after the policy's backoff; one-shot diagnosis after repeated failures. */
    private fun scheduleRebind(err: CameraState.StateError?) {
        if (rebindScheduled) return
        rebindScheduled = true
        cameraDown = true
        val waitS = reconnectPolicy.backoffS()
        reconnectPolicy.onFailure()
        if (reconnectPolicy.shouldDiagnose()) {
            Log.w(
                TAG,
                "camera keeps failing (last CameraState error code=${lastStateError?.code}) after " +
                    "${reconnectPolicy.attempts} rebinds — retrying every ${reconnectPolicy.backoffS().toInt()}s",
            )
        }
        onCameraDown?.invoke("camera down (error ${err?.code ?: "?"}) — rebinding in ${waitS.toInt()}s…")
        mainHandler.postDelayed({
            rebindScheduled = false
            if (cameraProvider != null) bindUseCases()
        }, (waitS * MS_PER_S).toLong())
    }

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
        val builder =
            androidx.camera.camera2.interop.CaptureRequestOptions
                .Builder()
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

        observedInfo?.cameraState?.removeObserver(cameraStateObserver)
        observedInfo = null
        provider.unbindAll()
        val bound =
            try {
                provider.bindToLifecycle(lifecycleOwner, cameraSelector, analysis, capture)
            } catch (e: IllegalArgumentException) {
                // Device unavailable right now (e.g. mid-disconnect) — retry with backoff.
                Log.w(TAG, "bindToLifecycle failed: $e")
                scheduleRebind(lastStateError)
                return
            }
        camera = bound
        bound.cameraInfo.cameraState.observe(lifecycleOwner, cameraStateObserver)
        observedInfo = bound.cameraInfo
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
            if (cameraDown) {
                // First frame after a rebind: the camera is back — reset the backoff
                // schedule, re-arm the diagnosis, tell the service to drop its note.
                cameraDown = false
                reconnectPolicy.onFrameDelivered()
                onCameraDown?.invoke(null)
            }
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
        mainHandler.removeCallbacksAndMessages(null)
        rebindScheduled = false
        cameraDown = false
        observedInfo?.cameraState?.removeObserver(cameraStateObserver)
        observedInfo = null
        cameraProvider?.unbindAll()
        imageCapture = null
        camera = null
    }

    override fun close() {
        frameChannel.cancel()
        stop()
        analysisExecutor.shutdownNow()
    }

    private companion object {
        const val TAG = "chesslabCamera"
        const val MS_PER_S = 1000.0

        /** CameraState error codes that warrant a rebind (device-level failures). */
        val RECOVERABLE_ERROR_CODES =
            setOf(
                CameraState.ERROR_CAMERA_IN_USE,
                CameraState.ERROR_CAMERA_FATAL_ERROR,
                CameraState.ERROR_CAMERA_DISABLED,
                CameraState.ERROR_OTHER_RECOVERABLE_ERROR,
            )
    }
}
