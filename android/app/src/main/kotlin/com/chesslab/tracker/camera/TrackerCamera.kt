package com.chesslab.tracker.camera

import android.content.Context
import android.hardware.camera2.CameraCharacteristics.CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES
import android.hardware.camera2.CaptureRequest
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.Size
import androidx.camera.camera2.interop.Camera2CameraInfo
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.CameraInfo
import androidx.camera.core.CameraSelector
import androidx.camera.core.CameraState
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.Observer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.File
import java.util.concurrent.Executors

/**
 * The ONLY class in the app that binds a camera — constructed exactly once, by `TrackerService`.
 * No screen, no ViewModel, no composable may bind its own: CameraX hands the device to the last
 * binder, and a second `ProcessCameraProvider` binding from the calibration screen froze the
 * analyzer feed dead on tab switch. Two owners is a coin flip, not a race that can be fixed.
 *
 * `ImageAnalysis` is the single camera stream. What the user sees and the optional QHD encoder
 * both consume those analyzer frames; no second camera use case or owner is introduced.
 * `STRATEGY_KEEP_ONLY_LATEST` is the Android `LatestFrame` (`chesslab/camera.py`,
 * "Latest frame, but NEVER the same frame twice"): CameraX keeps only the newest frame and never
 * re-delivers one, because a repeated frame diffs to zero and reads as "board stable" while a
 * hand is moving (entry.md invariant 14).
 *
 * Nothing here converts, warps or scales anything; `camera/` hands out a raw [ImageProxy].
 */
@Suppress("TooManyFunctions")
class TrackerCamera(
    private val context: Context,
    request: CameraRequest,
    private val sink: FrameSink,
    private val policy: ReconnectPolicy = ReconnectPolicy(),
    private val onVideoAvailability: (Size?, String?) -> Unit = { _, _ -> },
) : AutoCloseable {
    private val analyzerExecutor = Executors.newSingleThreadExecutor { r -> Thread(r, "chesslab-analyzer") }
    private val mainHandler = Handler(Looper.getMainLooper())
    private val mismatch = ResolutionMismatchLogger { Log.w(TAG, it) }
    private val optics = OpticsLock()
    private val health = MutableStateFlow<CameraHealth>(CameraHealth.Up)
    private val lamp = TorchLamp()
    private val video = CameraVideo()

    /** Camera-down is a status, not a freeze. 06c maps this into `TrackerStatus.note`. */
    val cameraState: StateFlow<CameraHealth> = health.asStateFlow()

    /** The camera's lamp. Its own owner, like [OpticsLock] — see `TorchLamp`. */
    val torch: TorchLamp get() = lamp

    /** Brightness and illuminant, steering the automatic. See [CameraLookControl]. */
    val look: CameraLookPort get() = optics.looks

    private var target: CameraRequest = request

    // Analyzer thread only — see [noteSensorRate].
    private var lastSensorNs = 0L
    private var lastSensorLogMs = 0L
    private var sensorGapMs = 0.0

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

    @Volatile
    private var videoEnabled = false

    val videoFailure: String? get() = video.failure
    val videoResolution: Size? get() = video.resolution

    /** Files this recording is spread over — see `CameraVideo.SEGMENT_SECONDS`. */
    val videoSegments: Int get() = video.segments

    /** The pre-roll the last recording actually carried — see `CameraVideo.preRollUs`. */
    val videoPreRollNs: Long get() = video.preRollUs * 1000L

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

    /** Enable/disable encoding of the one analyzer stream. No camera rebind is needed. */
    fun setVideoEnabled(enabled: Boolean) {
        if (videoEnabled == enabled) return
        videoEnabled = enabled
        if (!enabled) video.stop()
        if (!enabled) onVideoAvailability(null, null)
    }

    /** Arms the encoder: samples buffer in memory until [keepVideo] — see `CameraVideo`. */
    fun startVideo(
        maxBytes: Long,
        onProgress: (VideoProgress) -> Unit,
    ): Boolean = video.start(maxBytes, onProgress)

    /** The first committed move: the pre-roll becomes [file] and the recording goes live. */
    fun keepVideo(file: File) = video.keep(file)

    fun stopVideo() = video.stop()

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
        video.stop()
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
        optics.detach()
        provider?.unbindAll()
        provider = null
        owner = null
        video.close()
        analyzerExecutor.shutdownNow()
    }

    @OptIn(ExperimentalCamera2Interop::class)
    @Suppress("ReturnCount")
    private fun bindAnalysis() {
        // `takeUnless` rather than a fourth guard clause: a stopped camera and a camera with no
        // provider yet are the same answer here — do not bind.
        val cameraProvider = provider.takeUnless { stopped } ?: return
        val lifecycleOwner = owner ?: return
        val selector = CameraSelector.Builder().requireLensFacing(target.lensFacing).build()
        val builder =
            ImageAnalysis
                .Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
                .setResolutionSelector(resolutionSelector(requestedSize))
        // ONE extender for the whole request: a second `Camera2Interop.Extender` over the same
        // builder is a second view of one config, and splitting the options across two reads as if
        // they were independent.
        val extender = Camera2Interop.Extender(builder)
        pinFrameRate(extender, cameraProvider.availableCameraInfos.firstOrNull { selector.filter(listOf(it)).isNotEmpty() })
        optics.prepare(extender)
        val analysis = builder.build()
        analysis.setAnalyzer(analyzerExecutor, ::deliver)

        stopObserving()
        optics.detach()
        cameraProvider.unbindAll()
        val camera =
            runCatching { cameraProvider.bindToLifecycle(lifecycleOwner, selector, analysis) }
                .getOrElse { failure ->
                    scheduleRebind("bind failed (${failure.javaClass.simpleName})")
                    return
                }
        camera.cameraInfo.cameraState.observe(lifecycleOwner, stateObserver)
        observed = camera.cameraInfo
        optics.attach(camera)
        lamp.attach(camera)
    }

    /**
     * Ask auto-exposure to keep the frame rate up.
     *
     * `CameraRequest.targetFps` was dead code until now: nothing pinned
     * `CONTROL_AE_TARGET_FPS_RANGE`, so in room light AE was free to pick a long exposure and
     * hand us 14 fps. Measured, that is what it did — the analyzer did 52 ms of work inside a
     * 71 ms frame and then sat idle, so the sensor was the cap and no pipeline work could have
     * bought a single frame.
     *
     * The range is chosen from what the device ADVERTISES, never invented: an unsupported range
     * is a binding failure, and a dead camera is worse than a slow one. Preference is the
     * narrowest range whose upper bound is [CameraRequest.targetFps] — a locked `[30,30]` is what
     * actually stops AE from stretching the period, where `[15,30]` leaves it the same freedom it
     * already had.
     *
     * The trade is real and belongs in the log: a pinned rate caps exposure time, so the frame
     * gets darker, and `darkLumaThr = 18` is a gate that can then start firing.
     */
    @OptIn(ExperimentalCamera2Interop::class)
    private fun pinFrameRate(
        extender: Camera2Interop.Extender<*>,
        info: CameraInfo?,
    ) {
        val available = info?.let { Camera2CameraInfo.from(it).getCameraCharacteristic(CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES) }
        val range =
            available
                ?.filter { it.upper == target.targetFps }
                ?.maxByOrNull { it.lower }
        if (range == null) {
            Log.w(TAG, "no ${target.targetFps} fps AE range advertised (${available?.joinToString()}) — leaving auto-exposure alone")
            return
        }
        extender.setCaptureRequestOption(CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, range)
        Log.i(TAG, "AE target fps range pinned to $range")
    }

    /**
     * The requested mode is a wish; [ResolutionStrategy] may hand back anything it likes.
     *
     * The aspect ratio is stated explicitly because leaving it out cost 33 % of every source
     * pixel: asking for 1920x1080 under `FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER` got us
     * 1920x1440, and that 4:3 frame is the source of the convert and of all three warps.
     */
    private fun resolutionSelector(requested: Size): ResolutionSelector =
        ResolutionSelector
            .Builder()
            .setAspectRatioStrategy(AspectRatioStrategy(aspectRatioFor(target), AspectRatioStrategy.FALLBACK_RULE_AUTO))
            .setResolutionStrategy(
                ResolutionStrategy(requested, ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER),
            ).build()

    /**
     * The gap between the SENSOR timestamps of two delivered frames, smoothed, once a second.
     *
     * This is the one number that separates "the sensor is slow" from "we are too slow and
     * CameraX is dropping frames for us" — `STRATEGY_KEEP_ONLY_LATEST` makes both look identical
     * from the analyzer's side. A gap near the sensor period means we see every frame; a gap at a
     * multiple of it means frames are being dropped and the pipeline is the bottleneck.
     */
    private fun noteSensorRate(image: ImageProxy) {
        val now = image.imageInfo.timestamp
        val previous = lastSensorNs
        lastSensorNs = now
        if (previous == 0L || now <= previous) return
        val gap = (now - previous) / NANOS_PER_MS
        sensorGapMs = if (sensorGapMs != 0.0) EMA_OLD * sensorGapMs + EMA_NEW * gap else gap
        val wall = System.currentTimeMillis()
        if (wall - lastSensorLogMs < SENSOR_LOG_INTERVAL_MS) return
        lastSensorLogMs = wall
        Log.d(TAG, "sensor gap ${"%.1f".format(sensorGapMs)} ms between delivered frames")
    }

    private fun deliver(image: ImageProxy) {
        try {
            val delivered = deliveredSizeOf(image)
            deliveredSize = delivered
            if (videoEnabled) {
                if (video.sourceAvailable(Size(delivered.width, delivered.height), image.imageInfo.rotationDegrees)) {
                    mainHandler.post { onVideoAvailability(video.resolution, video.failure) }
                }
                video.encode(image)
            }
            noteSensorRate(image)
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
        lamp.detach()
    }

    private companion object {
        const val TAG = "chesslabCamera"
        const val MS_PER_S = 1000.0
        const val NANOS_PER_MS = 1_000_000.0
        const val SENSOR_LOG_INTERVAL_MS = 1000L

        /** `CameraRate`'s weights, so every rate in the app settles the same way. */
        const val EMA_OLD = 0.9
        const val EMA_NEW = 0.1

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
