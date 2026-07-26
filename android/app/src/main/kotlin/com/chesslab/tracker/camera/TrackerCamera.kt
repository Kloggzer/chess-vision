package com.chesslab.tracker.camera

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.Size
import androidx.camera.core.CameraInfo
import androidx.camera.core.CameraSelector
import androidx.camera.core.CameraState
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.Observer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.concurrent.Executors

/**
 * The ONLY class in the app that binds a camera — constructed exactly once, by `TrackerService`.
 * No screen, no ViewModel, no composable may bind its own: CameraX hands the device to the last
 * binder, and a second `ProcessCameraProvider` binding from the calibration screen froze the
 * analyzer feed dead on tab switch. Two owners is a coin flip, not a race that can be fixed.
 *
 * `ImageAnalysis` is the only use case — no preview, no still capture. A second use case
 * fighting for the stream is the same bug class. What the user sees is rendered from the analyzer
 * frames by 06b. `STRATEGY_KEEP_ONLY_LATEST` is the Android `LatestFrame` (`chesslab/camera.py`,
 * "Latest frame, but NEVER the same frame twice"): CameraX keeps only the newest frame and never
 * re-delivers one, because a repeated frame diffs to zero and reads as "board stable" while a
 * hand is moving (entry.md invariant 14).
 *
 * Nothing here converts, warps or scales anything; `camera/` hands out a raw [ImageProxy].
 */
class TrackerCamera(
    private val context: Context,
    request: CameraRequest,
    private val sink: FrameSink,
    private val policy: ReconnectPolicy = ReconnectPolicy(),
) : AutoCloseable {
    private val analyzerExecutor = Executors.newSingleThreadExecutor { r -> Thread(r, "chesslab-analyzer") }
    private val mainHandler = Handler(Looper.getMainLooper())
    private val mismatch = ResolutionMismatchLogger { Log.w(TAG, it) }
    private val health = MutableStateFlow<CameraHealth>(CameraHealth.Up)

    /** Camera-down is a status, not a freeze. 06c maps this into `TrackerStatus.note`. */
    val cameraState: StateFlow<CameraHealth> = health.asStateFlow()

    private var target: CameraRequest = request

    /** What was ASKED for. Never conflated with [deliveredSize]. */
    val requestedSize: Size get() = Size(target.width, target.height)

    /** What the device actually delivers, read off the ImageProxy. Null until the first frame. */
    @Volatile
    var deliveredSize: DeliveredSize? = null
        private set

    private var provider: ProcessCameraProvider? = null
    private var owner: LifecycleOwner? = null
    private var observed: CameraInfo? = null
    private var rebindPending = false

    /**
     * Set by [stop] and cleared only by [resume].
     *
     * Every path that could put the device back — the queued rebind, the error-recovery rebind, the
     * provider future arriving late — checks it, so "the user stopped the camera" cannot be undone
     * by a timer that was already in flight.
     */
    @Volatile
    private var stopped = false

    private val stateObserver =
        Observer<CameraState> { state ->
            val error = state.error ?: return@Observer
            val closedWithError = state.type == CameraState.Type.CLOSED || state.type == CameraState.Type.CLOSING
            if (closedWithError || error.code in REBIND_ERROR_CODES) scheduleRebind("camera error ${error.code}")
        }

    fun bind(lifecycleOwner: LifecycleOwner) {
        owner = lifecycleOwner
        val future = ProcessCameraProvider.getInstance(context)
        future.addListener({
            provider = future.get()
            bindAnalysis()
        }, context.mainExecutor)
    }

    /**
     * Ask the device for a different mode.
     *
     * It rebinds the ONE analysis use case; it does not create a second [ProcessCameraProvider]
     * binding, and it does not create a second camera owner — a tracker restart keeps this object
     * alive for exactly that reason (MEMORY `android-single-camera-owner`). What changes is the
     * request; what the device delivers still decides everything downstream.
     */
    fun retarget(request: CameraRequest) {
        if (request == target) return
        target = request
        mainHandler.post(::bindAnalysis)
    }

    /**
     * Release the DEVICE, keep the object.
     *
     * The privacy switch: after this the green camera indicator goes out, because the analysis use
     * case is unbound and nothing holds the camera. What survives is this instance — the app-wide
     * single owner (MEMORY `android-single-camera-owner`) — and the analyzer thread, so the engine's
     * latched thread ownership still holds when [resume] rebinds.
     */
    fun stop() {
        if (stopped) return
        stopped = true
        rebindPending = false
        mainHandler.removeCallbacksAndMessages(null)
        mainHandler.post {
            stopObserving()
            provider?.unbindAll()
        }
        health.value = CameraHealth.Off
    }

    /** Rebinds the ONE analysis use case. No second provider, no second owner — see [stop]. */
    fun resume() {
        if (!stopped) return
        stopped = false
        health.value = CameraHealth.Up
        mainHandler.post(::bindAnalysis)
    }

    /**
     * Run [block] on the analyzer thread, serialized against [deliver].
     *
     * The tracker restart uses it: the pipeline, the engine and the ONNX observer may only be torn
     * down when no frame is inside them, and "the analyzer thread is not currently delivering" is
     * exactly what running on its single-thread executor guarantees.
     */
    fun runOnAnalyzer(block: () -> Unit) {
        runCatching { analyzerExecutor.execute(block) }
            .onFailure { Log.w(TAG, "analyzer thread is gone, skipped a queued task", it) }
    }

    override fun close() {
        stopped = true
        mainHandler.removeCallbacksAndMessages(null)
        rebindPending = false
        stopObserving()
        provider?.unbindAll()
        provider = null
        owner = null
        analyzerExecutor.shutdownNow()
    }

    private fun bindAnalysis() {
        // `takeUnless` rather than a fourth guard clause: a stopped camera and a camera with no
        // provider yet are the same answer here — do not bind.
        val cameraProvider = provider.takeUnless { stopped } ?: return
        val lifecycleOwner = owner ?: return
        val analysis =
            ImageAnalysis
                .Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
                .setResolutionSelector(resolutionSelector())
                .build()
        analysis.setAnalyzer(analyzerExecutor, ::deliver)

        stopObserving()
        cameraProvider.unbindAll()
        val selector = CameraSelector.Builder().requireLensFacing(target.lensFacing).build()
        val camera =
            runCatching { cameraProvider.bindToLifecycle(lifecycleOwner, selector, analysis) }
                .getOrElse { failure ->
                    scheduleRebind("bind failed (${failure.javaClass.simpleName})")
                    return
                }
        camera.cameraInfo.cameraState.observe(lifecycleOwner, stateObserver)
        observed = camera.cameraInfo
    }

    /** The requested mode is a wish; [ResolutionStrategy] may hand back anything it likes. */
    private fun resolutionSelector(): ResolutionSelector =
        ResolutionSelector
            .Builder()
            .setResolutionStrategy(
                ResolutionStrategy(requestedSize, ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER),
            ).build()

    private fun deliver(image: ImageProxy) {
        try {
            val delivered = DeliveredSize.of(image)
            deliveredSize = delivered
            mismatch.report(target.width, target.height, delivered)
            policy.onFrameDelivered(System.currentTimeMillis())
            if (health.value !is CameraHealth.Up) health.value = CameraHealth.Up
            // An unhandled throw here would kill the analyzer thread and with it the whole feed —
            // `_loop` treats a throwing read the same way: dropped frame, not a crash.
            runCatching { sink.onFrame(image, delivered) }
                .onFailure { Log.w(TAG, "frame sink threw, frame dropped", it) }
        } finally {
            image.close()
        }
    }

    private fun scheduleRebind(reason: String) {
        if (rebindPending || stopped) return
        rebindPending = true
        val waitS = policy.backoffS()
        policy.onFailure(System.currentTimeMillis())
        if (policy.offerDownshift(deliveredSize)) {
            target = target.downshifted()
            Log.w(TAG, "$reason — retrying once at ${target.width}x${target.height}")
        }
        if (policy.shouldDiagnose()) {
            Log.w(
                TAG,
                "$reason — the device keeps failing to start after ${policy.attempts} attempts; " +
                    "retry interval backing off to ${waitS.toInt()}s",
            )
        }
        health.value = CameraHealth.Down(reason, waitS.toInt())
        mainHandler.postDelayed({
            rebindPending = false
            bindAnalysis()
        }, (waitS * MS_PER_S).toLong())
    }

    private fun stopObserving() {
        observed?.cameraState?.removeObserver(stateObserver)
        observed = null
    }

    private companion object {
        const val TAG = "chesslabCamera"
        const val MS_PER_S = 1000.0

        /** Device-level failures a rebind can plausibly recover from. */
        val REBIND_ERROR_CODES =
            setOf(
                CameraState.ERROR_CAMERA_IN_USE,
                CameraState.ERROR_MAX_CAMERAS_IN_USE,
                CameraState.ERROR_CAMERA_FATAL_ERROR,
                CameraState.ERROR_CAMERA_DISABLED,
                CameraState.ERROR_OTHER_RECOVERABLE_ERROR,
            )
    }
}
