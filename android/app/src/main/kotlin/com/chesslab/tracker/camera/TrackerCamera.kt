package com.chesslab.tracker.camera

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
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
import java.util.concurrent.TimeUnit

/** The ONLY class that binds a camera: CameraX hands the device to the last binder, and a second binding
 *  froze the analyzer feed on tab switch. `STRATEGY_KEEP_ONLY_LATEST` never re-delivers a frame — a
 *  repeat diffs to zero and reads as "board stable" while a hand moves (entry.md invariant 14). */
@Suppress("TooManyFunctions")
class TrackerCamera(
    private val context: Context,
    request: CameraRequest,
    private val sink: FrameSink,
    private val policy: ReconnectPolicy = ReconnectPolicy(),
    private val onVideoAvailability: (DeliveredSize?, String?) -> Unit = { _, _ -> },
) : AutoCloseable,
    VideoRecorderPort,
    CaptureProfilePort {
    private val analyzerExecutor = Executors.newSingleThreadExecutor { r -> Thread(r, "chesslab-analyzer") }
    private val mainHandler = Handler(Looper.getMainLooper())
    private val mismatch = ResolutionMismatchLogger { Log.w(TAG, it) }
    private val optics = OpticsLock()
    private val health = MutableStateFlow<CameraHealth>(CameraHealth.Up)
    private val lamp = TorchLamp()
    private val video = CameraVideo()

    val cameraState: StateFlow<CameraHealth> = health.asStateFlow()

    val torch: TorchLamp get() = lamp

    val look: CameraLookPort get() = optics.looks

    val observedExposure: ExposureSetting? get() = optics.observedExposure

    private var target: CameraRequest = request

    private var lastSensorNs = 0L
    private var lastSensorLogMs = 0L
    private var sensorGapMs = 0.0

    val requestedSize: Size get() = Size(target.width, target.height)

    @Volatile
    var deliveredSize: DeliveredSize? = null
        private set

    private var provider: ProcessCameraProvider? = null
    private var owner: LifecycleOwner? = null
    private var observed: CameraInfo? = null
    private var rebindPending = false

    @Volatile
    private var videoEnabled = false

    @Volatile
    private var restoreTo: CameraRequest? = null

    @Volatile
    private var requestedProfile: CaptureProfile? = null

    @Volatile
    var pinnedFpsRange: String? = null
        private set

    override val videoFailure: String? get() = video.failure
    override val videoResolution: DeliveredSize? get() = video.resolution

    override val videoSegments: Int get() = video.segments

    override val videoPreRollNs: Long get() = video.preRollUs * 1000L

    override val videoBitRateRequested: Int get() = video.requestedBitRate

    override val videoBitRate: Int get() = video.acceptedBitRate

    /** Set by [stop], cleared only by [resume]: every in-flight rebind path checks it, so a timer cannot
     *  undo "the user stopped the camera". */
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
            // `get` throws when the provider cannot initialise, and this listener runs on the MAIN
            // thread: unhandled it took the process down instead of the retry the state already has.
            runCatching { future.get() }
                .onSuccess {
                    provider = it
                    bindAnalysis()
                }.onFailure { scheduleRebind("camera provider unavailable (${it.javaClass.simpleName})") }
        }, context.mainExecutor)
    }

    /** Rebinds the ONE analysis use case — no second provider binding, no second owner. */
    fun retarget(request: CameraRequest) {
        if (request == target) return
        target = request
        mainHandler.post(::bindAnalysis)
    }

    /** Encoder down FIRST: an armed encoder is sized for its arm size, and `copyImage` would overrun it with
     *  4K rows. The arm comes back when the first frame of the new size publishes an availability. */
    override fun applyCaptureProfile(profile: CaptureProfile) {
        restoreTo = restoreTo ?: target
        requestedProfile = profile
        video.stop()
        retarget(CameraRequest(profile.width, profile.height, target.lensFacing, profile.fps))
    }

    override fun restoreCaptureProfile() {
        val previous = restoreTo ?: return
        restoreTo = null
        requestedProfile = null
        video.stop()
        retarget(previous)
    }

    override val captureObserved: CaptureObserved?
        get() =
            requestedProfile?.let {
                CaptureObserved(it, deliveredSize, pinnedFpsRange, video.acceptedBitRate, video.profileNotes)
            }

    fun setVideoEnabled(enabled: Boolean) {
        if (videoEnabled == enabled) return
        videoEnabled = enabled
        if (!enabled) video.stop()
        if (!enabled) onVideoAvailability(null, null)
    }

    override fun startVideo(
        maxBytes: Long,
        onProgress: (VideoProgress) -> Unit,
    ): Boolean = video.start(maxBytes, onProgress)

    override fun keepVideo(file: File) = video.keep(file)

    override fun stopVideo() = video.stop()

    /** Releases the DEVICE (the camera indicator goes out), keeps this single owner and the analyzer thread,
     *  so the engine's latched thread ownership still holds when [resume] rebinds. */
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

    fun resume() {
        if (!stopped) return
        stopped = false
        health.value = CameraHealth.Up
        mainHandler.post(::bindAnalysis)
        // [stop] took the encoder down, and an unchanged size publishes no new availability — without this the
        // pre-roll stayed dead for the rest of the run.
        if (videoEnabled) onVideoAvailability(video.resolution, video.failure)
    }

    /** Serialized against [deliver]: the restart may tear down pipeline, engine and observer only while no
     *  frame is inside them, which the single-thread executor guarantees. */
    fun runOnAnalyzer(block: () -> Unit) {
        runCatching { analyzerExecutor.execute(block) }
            .onFailure { Log.w(TAG, "analyzer thread is gone, skipped a queued task", it) }
    }

    /** Waits for the analyzer: `shutdownNow` only interrupts, and a running `warpPerspective` ignores that —
     *  `onDestroy` released the Mats under a frame still in flight. */
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
        if (!analyzerExecutor.awaitTermination(ANALYZER_DRAIN_MS, TimeUnit.MILLISECONDS)) {
            Log.w(TAG, "the analyzer did not finish within $ANALYZER_DRAIN_MS ms — closing anyway")
        }
    }

    @OptIn(ExperimentalCamera2Interop::class)
    @Suppress("ReturnCount")
    private fun bindAnalysis() {
        val cameraProvider = provider.takeUnless { stopped } ?: return
        val lifecycleOwner = owner ?: return
        val selector = CameraSelector.Builder().requireLensFacing(target.lensFacing).build()
        val builder =
            ImageAnalysis
                .Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
                .setResolutionSelector(resolutionSelector(requestedSize))
        // ONE extender for the whole request: a second one over the same builder is a second view of one config.
        val extender = Camera2Interop.Extender(builder)
        val bound = cameraProvider.availableCameraInfos.firstOrNull { selector.filter(listOf(it)).isNotEmpty() }
        pinFrameRate(extender, bound)
        pinExposureTime(extender, bound)
        video.frameRate = target.targetFps
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

    /** Pins `CONTROL_AE_TARGET_FPS_RANGE`: unpinned, AE took long exposures in room light and delivered 14 fps.
     *  Only an ADVERTISED range (an unsupported one fails the bind), the NARROWEST topping at the target; a
     *  wider one for longer exposure was measured useless (`docs/camera.md`). A pinned rate darkens the frame. */
    @OptIn(ExperimentalCamera2Interop::class)
    private fun pinFrameRate(
        extender: Camera2Interop.Extender<*>,
        info: CameraInfo?,
    ) {
        val available = info?.let { Camera2CameraInfo.from(it).getCameraCharacteristic(CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES) }
        val picked = chooseAeRange(available.orEmpty().map { it.lower to it.upper }, target.targetFps)
        val range = picked?.let { (lo, hi) -> available?.firstOrNull { it.lower == lo && it.upper == hi } }
        if (range == null) {
            // Loud: the setting then reads 15 while the sensor runs at 30 — the 24117RK2CG's back camera advertises no
            // locked range below 15. `null` carries that into `capture.json`.
            pinnedFpsRange = null
            Log.w(TAG, "no ${target.targetFps} fps AE range advertised (${available?.joinToString()}) — leaving auto-exposure alone")
            return
        }
        extender.setCaptureRequestOption(CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, range)
        pinnedFpsRange = range.toString()
        Log.i(TAG, "AE target fps range pinned to $range (of ${available?.joinToString()})")
    }

    /** Qualcomms `iso_exp_priority` gibt die Zeit vor und laesst der AE das ISO: sonst waehlt dieses Tuning
     *  10,0 ms und zahlt mit Verstaerkung — gemessen ISO 404 auf 55 bei gleicher Helligkeit (`docs/camera.md`). */
    @OptIn(ExperimentalCamera2Interop::class)
    private fun pinExposureTime(
        extender: Camera2Interop.Extender<*>,
        info: CameraInfo?,
    ) {
        val select = vendorKey(SELECT_PRIORITY, Int::class.javaObjectType) ?: return
        val value = vendorKey(USE_ISO_EXP_PRIORITY, Long::class.javaObjectType) ?: return
        // Die halbe Bildperiode: lang genug, um das ISO zu druecken, mit Luft gegen einen
        // Ratenabfall — eine Belichtung ueber der Periode kostet Bilder.
        val wanted = HALF_SECOND_NS / target.targetFps
        val allowed = info?.let { vendorRange(it) }
        val capped = allowed?.let { wanted.coerceIn(it[0], it[1]) } ?: wanted
        extender.setCaptureRequestOption(select, EXP_PRIORITY)
        extender.setCaptureRequestOption(value, capped)
        Log.i(TAG, "exposure time pinned to %.1f ms, AE keeps the ISO".format(capped / 1e6))
    }

    /** Ein Vendor-Tag als Request-Schluessel; sein Konstruktor steht nicht im SDK. */
    private fun <T> vendorKey(
        name: String,
        type: Class<T>,
    ): CaptureRequest.Key<T>? =
        runCatching {
            @Suppress("UNCHECKED_CAST")
            CaptureRequest.Key::class.java
                .getConstructor(String::class.java, Class::class.java)
                .newInstance(name, type) as CaptureRequest.Key<T>
        }.getOrNull()

    @OptIn(ExperimentalCamera2Interop::class)
    private fun vendorRange(info: CameraInfo): LongArray? =
        runCatching {
            @Suppress("UNCHECKED_CAST")
            val key =
                CameraCharacteristics.Key::class.java
                    .getConstructor(String::class.java, Class::class.java)
                    .newInstance(EXPOSURE_TIME_RANGE, LongArray::class.java)
                    as CameraCharacteristics.Key<LongArray>
            Camera2CameraInfo.from(info).getCameraCharacteristic(key)
        }.getOrNull()?.takeIf { it.size == 2 }

    /** The aspect ratio is stated: without it 1920x1080 under `FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER`
     *  delivered 1920x1440, and that 4:3 frame fed the convert and all three warps. */
    private fun resolutionSelector(requested: Size): ResolutionSelector =
        ResolutionSelector
            .Builder()
            .setAspectRatioStrategy(AspectRatioStrategy(aspectRatioFor(target), AspectRatioStrategy.FALLBACK_RULE_AUTO))
            .setResolutionStrategy(
                ResolutionStrategy(requested, ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER),
            ).build()

    /** The smoothed SENSOR timestamp gap separates "the sensor is slow" from "CameraX drops frames for us",
     *  which `STRATEGY_KEEP_ONLY_LATEST` makes identical: a multiple of the period means we are the bottleneck. */
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
                if (video.sourceAvailable(delivered)) {
                    mainHandler.post { onVideoAvailability(video.resolution, video.failure) }
                }
                video.encode(image)
            }
            noteSensorRate(image)
            mismatch.report(target.width, target.height, delivered)
            policy.onFrameDelivered(System.currentTimeMillis())
            if (health.value !is CameraHealth.Up) health.value = CameraHealth.Up
            // An unhandled throw here would kill the analyzer thread and the whole feed: dropped frame, not a crash.
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

        /** Qualcomms Belichtungs-Vorrang: `select_priority` = 1 ist CAM_EXP_PRIORITY. */
        const val SELECT_PRIORITY = "org.codeaurora.qcamera3.iso_exp_priority.select_priority"
        const val USE_ISO_EXP_PRIORITY = "org.codeaurora.qcamera3.iso_exp_priority.use_iso_exp_priority"
        const val EXPOSURE_TIME_RANGE = "org.codeaurora.qcamera3.iso_exp_priority.exposure_time_range"
        const val EXP_PRIORITY = 1

        const val HALF_SECOND_NS = 500_000_000L
        const val MS_PER_S = 1000.0
        const val NANOS_PER_MS = 1_000_000.0
        const val SENSOR_LOG_INTERVAL_MS = 1000L

        /** One frame's work is tens of milliseconds; 2 s is a hang, and a teardown may not block on one. */
        const val ANALYZER_DRAIN_MS = 2000L

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
