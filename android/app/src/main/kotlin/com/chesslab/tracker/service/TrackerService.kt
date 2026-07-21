package com.chesslab.tracker.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.os.Binder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import com.chesslab.engine.api.DebugImages
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerState
import com.chesslab.tracker.R
import com.chesslab.tracker.camera.CameraConfig
import com.chesslab.tracker.camera.DynamicResolutionController
import com.chesslab.tracker.camera.Resolution
import com.chesslab.tracker.camera.TrackerCamera
import com.chesslab.tracker.cnn.CnnModelStore
import com.chesslab.tracker.geometry.ArucoAutoCalibrator
import com.chesslab.tracker.geometry.ArucoCornerDetector
import com.chesslab.tracker.geometry.ArucoCornerSmoother
import com.chesslab.tracker.geometry.BoardWarper
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.CornerDriftMonitor
import com.chesslab.tracker.record.SessionRecorderImpl
import com.chesslab.tracker.spectate.SpectatorServer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.opencv.android.Utils
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

data class DebugBitmaps(
    val detectionDiff: Bitmap? = null,
    val occlusionDiff: Bitmap? = null,
    val motionDiff: Bitmap? = null,
)

/** Corners from a background ArUco live-align detect, awaiting frame-loop application. */
private class LiveAlignResult(
    val corners: com.chesslab.tracker.geometry.BoardCorners,
    val width: Int,
    val height: Int,
)

/**
 * Foreground (camera-type) service that owns the running tracker: it wires
 * [TrackerCamera] → [BoardFramePipeline] → [TrackerCoordinator] on the lifecycle
 * scope, drives [DynamicResolutionController] (rewarping on resolution changes),
 * re-detects the ArUco markers live during tracking and re-aligns the warp (the board/
 * camera drifts during play; a frozen calibration goes stale fast), and applies live/
 * constructor settings changes.
 *
 * Extension points for later phases (defined now, `null` in the base build):
 * [safeguard] (05), [stateSink] (06), [recorder] (07). Phases 05–07 plug in
 * without editing this file.
 */
@Suppress("TooManyFunctions")
class TrackerService : LifecycleService() {
    private val binder = LocalBinder()

    private lateinit var settingsRepo: SettingsRepository
    private lateinit var camera: TrackerCamera
    private val coordinator = TrackerCoordinator()

    @Volatile private var pipeline: BoardFramePipeline? = null

    @Volatile private var baseWarper: BoardWarper? = null
    private var resolutionController: DynamicResolutionController? = null
    private var resolutionCollector: Job? = null
    private var frameLoopJob: Job? = null

    // Live ArUco re-alignment during tracking: the primary geometry source is the markers,
    // not a frozen calibration. Re-detect them (throttled) and swap in a re-aligned warper.
    private val liveAlignDetector = ArucoCornerDetector()
    private val liveAlignSmoother = ArucoCornerSmoother()
    private var liveAlignTickNs = 0L
    private val liveAlignInFlight = AtomicBoolean(false)

    @Volatile private var liveAlignPending: LiveAlignResult? = null
    private var referenceProfile: CalibrationProfile? = null
    private var observedReferenceVersion = -1L

    @Volatile private var settings: TrackerSettings = TrackerSettings()

    // specs/14: one-shot intrinsic calibration — armed when the toggle is on but no
    // cached theta/lo/hi exists; fired from the frame loop on a quiet, non-dark frame.
    @Volatile private var intrinsicCalibrationPending = false
    private val intrinsicCalibrating = AtomicBoolean(false)
    private var cnn: CnnIntegration? = null
    private lateinit var cnnScope: CoroutineScope
    private val cnnFrameStore = CnnFrameStore()

    // ArUco self-calibration: while not yet tracking, detect the four board markers
    // per-frame (throttled) and start tracking automatically — no manual step needed.
    private val autoCalibrator = ArucoAutoCalibrator()

    private val _activeProfile = MutableStateFlow<CalibrationProfile?>(null)

    /** The profile currently driving the warp (manual or ArUco auto), or null in preview. */
    val activeProfile: StateFlow<CalibrationProfile?> = _activeProfile.asStateFlow()

    private val _boardBitmap = MutableStateFlow<Bitmap?>(null)

    /** Latest warped board for the overlay views; null until tracking starts. */
    val boardBitmap: StateFlow<Bitmap?> = _boardBitmap.asStateFlow()

    @Volatile private var requestedOverlayView = OverlayView.BOARD

    private val _debugBitmaps = MutableStateFlow(DebugBitmaps())

    /** Pixel heatmaps produced from the same gray frames consumed by the engine. */
    val debugBitmaps: StateFlow<DebugBitmaps> = _debugBitmaps.asStateFlow()

    private val _rawPreview = MutableStateFlow<Bitmap?>(null)

    /**
     * Downscaled (~640px max edge) raw camera frame, throttled to ~5 fps.
     * Non-null from the first camera frame onward, independent of warp/tracking.
     */
    val rawPreview: StateFlow<Bitmap?> = _rawPreview.asStateFlow()

    /** Reduced UI state; the single source the UI observes. */
    val uiState get() = coordinator.uiState

    /** Phase 05: CNN occupancy safeguard. */
    var safeguard: com.chesslab.engine.api.OccupancySafeguard?
        get() = coordinator.safeguard
        set(value) {
            coordinator.safeguard = value
        }

    /** Phase 06: LAN spectator broadcast sink. */
    var stateSink: GameStateSink? = null
    private var spectatorServer: SpectatorServer? = null
    private val _spectatorUrl = MutableStateFlow<String?>(null)
    val spectatorUrl: StateFlow<String?> = _spectatorUrl.asStateFlow()

    /** Phase 07: raw session recorder. */
    var recorder: SessionRecorder? = null
    private var ownedRecorder: SessionRecorderImpl? = null

    inner class LocalBinder : Binder() {
        val service: TrackerService get() = this@TrackerService
    }

    override fun onBind(intent: Intent): IBinder {
        super.onBind(intent)
        return binder
    }

    override fun onCreate() {
        super.onCreate()
        settingsRepo = SettingsRepository(settingsDataStore(this))
        camera = TrackerCamera(this, this)
        // Phase 03: camera loss must not freeze the tracker silently — the camera rebinds
        // itself with backoff and the status note shows "camera down" until frames flow again.
        camera.onCameraDown = { note -> coordinator.onCameraState(note) }
        cnnScope = CoroutineScope(lifecycleScope.coroutineContext + Dispatchers.Default)
        // First start installs the bundled tiny model (no-op when a model is
        // already imported/installed) — the safeguard works out-of-the-box.
        val modelStore = CnnModelStore(filesDir).also { it.installBundledIfMissing(assets) }
        cnn =
            CnnIntegration(
                coordinator,
                cnnFrameStore::latest,
                cnnScope,
                modelStore,
                debugDumpDir = getExternalFilesDir(null)?.let { java.io.File(it, "cnn_debug") },
            )
        restoreCheckpoint()
        observeSettings()
        forwardStateToSink()
        forwardEventsToRecorder()
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int {
        super.onStartCommand(intent, flags, startId)
        if (intent?.action == ACTION_STOP) {
            // "Stop tracking" action from the notification: drop detection, remove the
            // notification and stop the service. If the app is still bound (open in the
            // foreground) the service object lives until it unbinds, but tracking is stopped
            // and the notification is gone — which is what the user asked for.
            stopCameraAndTracking()
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }
        startForegroundInternal()
        return START_STICKY
    }

    override fun onDestroy() {
        cnn?.detach()
        ownedRecorder?.close()
        spectatorServer?.stop()
        resolutionController?.stop()
        resolutionCollector?.cancel()
        frameLoopJob?.cancel()
        pipeline?.close()
        baseWarper?.close()
        pipeline = null
        baseWarper = null
        camera.close()
        cnnFrameStore.clear()
        synchronized(calibFrameLock) {
            calibFrame?.release()
            calibFrame = null
        }
        super.onDestroy()
    }

    /**
     * Camera-only mode before calibration: frames feed [rawPreview] so the user can aim
     * the phone; no warp, no detection. Without this, a fresh install never started the
     * camera at all (start() was gated on a saved profile — chicken-and-egg).
     */
    fun startPreviewOnly() {
        if (cameraRunning) return
        if (settings.spectatorEnabled && spectatorServer == null) reconcileSpectator()
        cameraRunning = true
        camera.start(settings.toCameraConfig())
        startFrameLoop()
    }

    /** Begin tracking with a calibrated [profile]. Idempotent per profile. */
    fun start(profile: CalibrationProfile) {
        resolutionController?.stop()
        resolutionCollector?.cancel()
        val warper = BoardWarper(profile)
        pipeline?.close()
        baseWarper?.close()
        baseWarper = warper
        val pipe = BoardFramePipeline(warper, settings.claheClip)
        pipeline = pipe
        applyIntrinsic(settings) // specs/14: pipeline is fresh — re-derive the intrinsic channel
        liveAlignTickNs = 0L
        referenceProfile = null
        observedReferenceVersion = coordinator.referenceVersion
        liveAlignSmoother.reset(profile.corners)
        _activeProfile.value = profile

        startPreviewOnly() // idempotent camera + frame-loop start
        startResolutionController(settings.toCameraConfig())
    }

    /**
     * Drop the warp/tracking pipeline but keep the camera + [rawPreview] running.
     * Used by the "Recalibrate / New board" flow: the frame loop guards on a null
     * [pipeline] and reverts to preview-only without touching the camera binding.
     */
    fun stopTrackingToPreview() {
        resolutionController?.stop()
        resolutionController = null
        resolutionCollector?.cancel()
        resolutionCollector = null
        pipeline?.close()
        pipeline = null
        baseWarper?.close()
        baseWarper = null
        liveAlignSmoother.reset()
        _activeProfile.value = null
        referenceProfile = null
        cnnFrameStore.clear()
        coordinator.reset()
        clearCheckpoint()
        // specs/14: the Recalibrate flow invalidates the intrinsic calibration cache —
        // new geometry/lighting means theta/lo/hi must be re-estimated on the next
        // quiet frame after tracking resumes.
        if (settings.intrinsicGray) {
            lifecycleScope.launch {
                settingsRepo.update {
                    it.copy(intrinsicAngle = Double.NaN, intrinsicLo = Double.NaN, intrinsicHi = Double.NaN)
                }
            }
        }
    }

    /** Stop all camera work as requested by the foreground-notification action. */
    private fun stopCameraAndTracking() {
        stopTrackingToPreview()
        camera.stop()
        cameraRunning = false
        _rawPreview.value = null
        _boardBitmap.value = null
        _debugBitmaps.value = DebugBitmaps()
        spectatorServer?.stop()
        spectatorServer = null
        stateSink = null
        _spectatorUrl.value = null
    }

    private var cameraRunning = false

    // Latest full-res BGR analysis frame retained for ArUco calibration. Only
    // populated while the calibration screen is on-screen (calibrationActive), so
    // tracking pays no clone cost otherwise. Guarded by calibFrameLock.
    private val calibFrameLock = Any()
    private var calibFrame: Mat? = null

    @Volatile
    private var calibrationActive = false

    /** Toggle retention of the latest frame for ArUco (calibration screen on/off). */
    fun setCalibrationActive(active: Boolean) {
        synchronized(calibFrameLock) {
            calibrationActive = active
            if (!active) {
                calibFrame?.release()
                calibFrame = null
            }
        }
    }

    /** Clone of the latest full-res BGR frame for ArUco; caller MUST release. Null if none. */
    fun latestCalibrationFrame(): Mat? = synchronized(calibFrameLock) { calibFrame?.clone() }

    fun undo(): Boolean = coordinator.undo().also { if (it) writeCheckpoint() }

    fun reset() {
        coordinator.reset()
        clearCheckpoint()
        reconcileRecorder(forceNew = true)
    }

    fun renewBaseline() = coordinator.renewBaseline()

    fun forcePromote(piece: String): Boolean = coordinator.forcePromote(piece)

    /** Accept-CNN preview (phase 04): the would-be adoption; null without CNN/observation. */
    fun acceptCnnOutcome(): com.chesslab.tracker.cnn.AcceptOutcome? = cnn?.takeIf { it.attached }?.acceptCnnOutcome()

    /**
     * Adopt a previewed CNN position: reset to the FEN (clears history + alarm latch,
     * logs the discontinuity) — the visual reference re-captures from the next clear frame.
     */
    fun acceptCnnApply(fen: String) {
        coordinator.reset(fen)
        clearCheckpoint()
        reconcileRecorder(forceNew = true)
    }

    /** In-app CNN debug view data (phase 04); null without CNN/frame. */
    fun cnnDebugData(): CnnDebugData? = cnn?.takeIf { it.attached }?.cnnDebugData()

    /** Select which diagnostic bitmap the frame loop should materialize. */
    fun setOverlayView(view: OverlayView) {
        requestedOverlayView = view
    }

    private fun startFrameLoop() {
        if (frameLoopJob != null) return
        // Per-stage engine timing (throttled ~1/s), tag `chesslabEnginePerf` — the fine-grained
        // companion of the `chesslabPerf` frame stages (2026-07-22, engine was the fps eater).
        com.chesslab.engine.EnginePerf.sink = { line ->
            val now = System.nanoTime()
            if (now - lastEnginePerfNs >= DIAG_INTERVAL_NS) {
                lastEnginePerfNs = now
                android.util.Log.i("chesslabEnginePerf", line)
            }
        }
        frameLoopJob =
            lifecycleScope.launch(Dispatchers.Default) {
                camera.frames.collect { frame ->
                    val tFrame0 = System.nanoTime()
                    try {
                        // Publish raw camera preview (independent of warp/tracking success —
                        // also the ONLY consumer in preview-only mode before calibration).
                        publishRawPreview(frame.mat, frame.width, frame.height)
                        val tPreview = System.nanoTime()

                        // Retain the latest full-res frame for ArUco while calibrating.
                        if (calibrationActive) {
                            synchronized(calibFrameLock) {
                                calibFrame?.release()
                                calibFrame = frame.mat.clone()
                            }
                        }
                        val pipe = pipeline
                        if (pipe == null) {
                            // Preview-only: try to self-calibrate from ArUco markers (throttled).
                            val auto =
                                autoCalibrator.tryDetect(
                                    frame.mat,
                                    frame.width,
                                    frame.height,
                                    System.nanoTime(),
                                    settings.arucoMargin,
                                )
                            if (auto != null) start(auto)
                            return@collect
                        }

                        // Live ArUco re-alignment: re-detect the markers and swap in a re-aligned
                        // warper (inside this same pipeline) BEFORE warping, so a drifting
                        // board/camera stays tracked instead of the calibration going stale.
                        maybeLiveAlign(frame.mat, frame.width, frame.height)
                        val tAlign = System.nanoTime()

                        // Feed raw frame + corners before warp (phase 07 recorder).
                        val corners = baseWarper?.profile?.corners
                        recorder?.onRawFrame(frame.mat, corners, frame.width, frame.height)

                        recorder?.onFrame(coordinator.uiState.value.fen, frame.timestampNs)
                        val tRecorder = System.nanoTime()
                        // Full-res (1024px) warp only on CNN demand: the free-running observer
                        // consumes a few frames/s, so warping full-res EVERY frame (~2x the
                        // detect warp) was pure waste. The store's consumed-flag is the demand
                        // signal; without CNN the detect-res board serves the UI preview.
                        val wantFullRes = cnn?.attached == true && cnnFrameStore.wantsFrame()
                        val processed = pipe.process(frame.mat, frame.timestampNs, fullResolutionBoard = wantFullRes)
                        val tWarp = System.nanoTime()
                        try {
                            // Dark-frame gate: below the pre-CLAHE luma floor the diff is pure
                            // amplified sensor noise — freeze detection instead of feeding it.
                            var tEngine = 0L
                            coordinator.meanLuma = processed.meanLuma
                            val thr = settings.darkLumaThr
                            if (thr > 0 && processed.meanLuma < thr) {
                                coordinator.onDarkFrame()
                                diag { "dark frame gated: meanLuma=${"%.1f".format(processed.meanLuma)} < $thr" }
                            } else {
                                coordinator.onFrame(processed.gray, processed.bgr, processed.timestampNs)
                                tEngine = System.nanoTime()
                                synchronizeReferenceGeometry()
                                // Only full-res boards enter the store — CNN crops must never
                                // come from the detect-res board (crop resolution!).
                                if (wantFullRes) cnnFrameStore.update(processed, coordinator.frameSeq)
                                // specs/14: never calibrate off a dark-gated frame (this branch)
                                // and only when the scene is quiet.
                                maybeCalibrateIntrinsic(processed.boardBgr, coordinator.uiState.value.debug.motion)
                            }

                            val ui = coordinator.uiState.value
                            val d = ui.debug
                            diag {
                                "state=${ui.trackerState} stuck=${d.stuckReason} " +
                                    "luma=${"%.1f".format(processed.meanLuma)} " +
                                    "motion=${"%.4f".format(d.motion)}/${"%.4f".format(d.motionThr)} " +
                                    "changed=${d.changed} cand=${d.candidate} " +
                                    "best=${"%.2f".format(d.bestScore)} 2nd=${"%.2f".format(d.secondScore)} " +
                                    // Soft-hot fused z (>= zThr/2) — shows evidence that never reached
                                    // `changed`, e.g. a dark-on-dark move hovering below threshold.
                                    "zTop=${d.changedVals.joinToString(",") { (sq, v) -> "$sq:${"%.1f".format(v)}" }} " +
                                    "shadowVeto=${d.shadowVetoed} occlVeto=${d.occludedVetoed}"
                            }

                            // Phase 07: flush pending capture when board is clean (never off a dark frame).
                            if (ui.trackerState == TrackerState.TRACKING && !ui.sceneDark) recorder?.onCleanFrame()

                            publishBoard(processed.boardBgr)
                            publishDebug(coordinator.debugImages)
                            // Per-stage frame timing (throttled 1/s like diag): finds the
                            // fps eater factually instead of by guesswork (2026-07-22, 4fps).
                            val tEnd = System.nanoTime()
                            perf {
                                fun ms(
                                    a: Long,
                                    b: Long,
                                ) = if (a == 0L || b == 0L) -1.0 else (b - a) / 1e6
                                "frame=${"%.0f".format(ms(tFrame0, tEnd))}ms " +
                                    "preview=${"%.0f".format(ms(tFrame0, tPreview))} " +
                                    "align=${"%.0f".format(ms(tPreview, tAlign))} " +
                                    "recorder=${"%.0f".format(ms(tAlign, tRecorder))} " +
                                    "warp=${"%.0f".format(ms(tRecorder, tWarp))} " +
                                    "engine=${"%.0f".format(ms(tWarp, tEngine))} " +
                                    "publish=${"%.0f".format(ms(if (tEngine != 0L) tEngine else tWarp, tEnd))}"
                            }
                        } finally {
                            processed.boardBgr.release()
                        }
                    } finally {
                        frame.mat.release()
                    }
                }
            }
    }

    private var lastDiagNs = 0L

    /** Throttled diagnostic log (~1/sec) for tracker bring-up debugging. */
    private inline fun diag(message: () -> String) {
        val now = System.nanoTime()
        if (now - lastDiagNs < DIAG_INTERVAL_NS) return
        lastDiagNs = now
        android.util.Log.i("chesslabDiag", message())
    }

    private var lastPerfNs = 0L
    private var lastEnginePerfNs = 0L

    /** Throttled per-frame stage timing (~1/sec), tag `chesslabPerf`. */
    private inline fun perf(message: () -> String) {
        val now = System.nanoTime()
        if (now - lastPerfNs < DIAG_INTERVAL_NS) return
        lastPerfNs = now
        android.util.Log.i("chesslabPerf", message())
    }

    private fun startResolutionController(cameraConfig: CameraConfig) {
        resolutionCollector?.cancel()
        resolutionCollector = null
        if (!cameraConfig.dynamicResolution) return
        val controller =
            DynamicResolutionController(
                camera = camera,
                engine = EngineUncertaintySource(coordinator),
                scope = lifecycleScope,
                config = cameraConfig,
            )
        resolutionController = controller
        controller.start()
        resolutionCollector =
            lifecycleScope.launch {
                controller.activeResolution.collect { res -> rewarpFor(res) }
            }
    }

    /** Rewarp when the dynamic controller changes the analysis resolution. */
    private fun rewarpFor(res: Resolution) {
        val base = baseWarper ?: return
        val profile = base.profile.forResolution(res.width, res.height)
        liveAlignSmoother.reset(profile.corners)
        pipeline?.warper = BoardWarper(profile)
    }

    /** Live-apply a new ArUco warp margin to the active profile (grid-fit tuning). */
    private fun rewarpForMargin(margin: Double) {
        val base = baseWarper ?: return
        val profile = base.profile.copy(margin = margin.toFloat())
        val warper = BoardWarper(profile)
        baseWarper = warper
        pipeline?.warper = warper
        _activeProfile.value = profile
        liveAlignSmoother.reset(profile.corners)
        base.close()
        coordinator.renewBaseline()
    }

    /**
     * Re-detect the four ArUco markers on the raw [frame] (throttled) and swap in a warper
     * re-aligned to the fresh corners. ArUco gives ABSOLUTE board geometry every time, so the
     * warped board stays locked to the same grid as the camera/board drifts and the engine's
     * reference stays valid — no reset needed. When the markers aren't visible the current warp
     * is kept. This is the project's per-frame self-calibration (ports tracker.py `live_align`).
     */
    private fun maybeLiveAlign(
        frame: Mat,
        width: Int,
        height: Int,
    ) {
        // Apply a finished background detection first — on the frame loop, so the
        // warper swap stays on the same thread as before the async split.
        liveAlignPending?.let { result ->
            liveAlignPending = null
            applyLiveAlign(result)
        }
        val now = System.nanoTime()
        if (now - liveAlignTickNs < LIVE_ALIGN_INTERVAL_NS || baseWarper == null) return
        // The ArUco detect (resize + detectMarkers, 40-90ms) blocked the frame loop
        // every 300ms — the former "recorder" spikes. A clone (~few ms) hands the
        // frame to a background detect; at most one in flight.
        if (!liveAlignInFlight.compareAndSet(false, true)) return
        liveAlignTickNs = now
        val clone = frame.clone()
        lifecycleScope.launch(Dispatchers.Default) {
            try {
                // null when markers are hidden → keep current warp
                val fresh = liveAlignDetector.detectScaled(clone)
                if (fresh != null) liveAlignPending = LiveAlignResult(fresh, width, height)
            } finally {
                clone.release()
                liveAlignInFlight.set(false)
            }
        }
    }

    /** Swap in a warper re-aligned to freshly detected corners (frame-loop thread). */
    private fun applyLiveAlign(result: LiveAlignResult) {
        val base = baseWarper ?: return
        val aligned = liveAlignSmoother.update(result.corners)
        val referenceCorners = referenceProfile?.forResolution(result.width, result.height)?.corners
        if (
            referenceCorners != null &&
            CornerDriftMonitor.maxCornerShift(referenceCorners, aligned) > settings.toTrackerConfig().cornerJumpPx
        ) {
            // A discontinuous homography cannot be compared with the image that established
            // the detector reference; otherwise geometry looks like pieces moving.
            coordinator.renewBaseline()
            referenceProfile = null
            diag { "ArUco geometry jumped; invalidating detector reference" }
        }
        val updated = base.profile.copy(corners = aligned, sourceWidth = result.width, sourceHeight = result.height)
        val warper = BoardWarper(updated)
        baseWarper = warper
        pipeline?.warper = warper
        _activeProfile.value = updated
        base.close()
    }

    /** Capture the exact warp geometry whenever the engine establishes a new visual reference. */
    private fun synchronizeReferenceGeometry() {
        val version = coordinator.referenceVersion
        if (version == observedReferenceVersion) return
        observedReferenceVersion = version
        referenceProfile = baseWarper?.profile
    }

    private fun observeSettings() {
        lifecycleScope.launch {
            settingsRepo.settings.collect { next ->
                val prev = settings
                settings = next
                if (next.resolution != prev.resolution || next.dynamicResolution != prev.dynamicResolution) {
                    resolutionController?.stop()
                    resolutionController = null
                    resolutionCollector?.cancel()
                    resolutionCollector = null
                    camera.setResolution(next.resolution)
                    if (pipeline != null) {
                        rewarpFor(next.resolution)
                        startResolutionController(next.toCameraConfig())
                    }
                }
                pipeline?.claheClip = next.claheClip
                applyIntrinsic(next)
                camera.applyTuning(next.lockExposure, next.focusDistance)
                if (next.arucoMargin != prev.arucoMargin) rewarpForMargin(next.arucoMargin)
                if (next.requiresEngineRestart(prev)) {
                    coordinator.reconfigure(next.toTrackerConfig())
                } else {
                    coordinator.applyConfig(next.toTrackerConfig())
                }
                cnn?.reconcile(prev, next)
                if (next.autoRecord != prev.autoRecord || next.autoRecord != (ownedRecorder != null)) reconcileRecorder()
                if (next.spectatorEnabled != prev.spectatorEnabled) reconcileSpectator()
            }
        }
    }

    /**
     * specs/14: derive the pipeline's intrinsic channel from a settings snapshot.
     * Off → null; on + cached calibration (all three finite) → active transform;
     * on + no cache → arm the one-shot calibration for the next quiet frame.
     */
    private fun applyIntrinsic(s: TrackerSettings) {
        if (!s.intrinsicGray) {
            pipeline?.intrinsic = null
            intrinsicCalibrationPending = false
            return
        }
        if (s.intrinsicAngle.isFinite() && s.intrinsicLo.isFinite() && s.intrinsicHi.isFinite()) {
            val current = pipeline?.intrinsic
            if (current == null ||
                current.angleDeg != s.intrinsicAngle ||
                current.lo != s.intrinsicLo ||
                current.hi != s.intrinsicHi
            ) {
                pipeline?.intrinsic = IntrinsicGray(s.intrinsicAngle, s.intrinsicLo, s.intrinsicHi)
            }
            intrinsicCalibrationPending = false
        } else {
            pipeline?.intrinsic = null
            intrinsicCalibrationPending = true
        }
    }

    /**
     * specs/14: one-shot on-device calibration. Clones [boardBgr] BEFORE the frame
     * loop's `finally { release() }` (ownership rule, see [CnnFrameStore.update])
     * and runs the 180-angle entropy sweep on [Dispatchers.Default] — never on the
     * frame loop. Result is persisted via [settingsRepo]; the settings flow then
     * re-enters [applyIntrinsic], which activates the pipeline channel.
     */
    private fun maybeCalibrateIntrinsic(
        boardBgr: Mat,
        motion: Double,
    ) {
        if (!intrinsicCalibrationPending) return
        if (motion >= settings.motionThr) return
        if (!intrinsicCalibrating.compareAndSet(false, true)) return
        val frame = boardBgr.clone()
        lifecycleScope.launch(Dispatchers.Default) {
            try {
                val calib = IntrinsicGray.calibrate(frame)
                intrinsicCalibrationPending = false
                android.util.Log.i(
                    "chesslabDiag",
                    "intrinsic calibrated: theta=${calib.angleDeg} " +
                        "lo=${"%.4f".format(calib.lo)} hi=${"%.4f".format(calib.hi)}",
                )
                settingsRepo.update {
                    it.copy(intrinsicAngle = calib.angleDeg, intrinsicLo = calib.lo, intrinsicHi = calib.hi)
                }
            } finally {
                frame.release()
                intrinsicCalibrating.set(false)
            }
        }
    }

    private fun reconcileRecorder(forceNew: Boolean = false) {
        if (!forceNew && settings.autoRecord == (ownedRecorder != null)) return
        ownedRecorder?.close()
        ownedRecorder = null
        recorder = null
        if (settings.autoRecord) {
            val sessionDir = File(filesDir.resolve("sessions"), "session-${System.currentTimeMillis()}")
            ownedRecorder = SessionRecorderImpl(sessionDir)
            recorder = ownedRecorder
        }
    }

    private fun reconcileSpectator() {
        spectatorServer?.stop()
        spectatorServer = null
        stateSink = null
        _spectatorUrl.value = null
        if (!settings.spectatorEnabled) return
        val server = SpectatorServer(context = this)
        if (runCatching { server.start() }.isFailure) return
        spectatorServer = server
        stateSink = server
        server.onState(coordinator.uiState.value)
        _spectatorUrl.value = server.url.value
    }

    private fun forwardStateToSink() {
        lifecycleScope.launch {
            coordinator.uiState.collect { state -> stateSink?.onState(state) }
        }
    }

    private fun forwardEventsToRecorder() {
        lifecycleScope.launch {
            coordinator.events.collect { event ->
                recorder?.onEvent(event)
                when (event) {
                    is com.chesslab.engine.api.TrackerEvent.MoveCommitted,
                    is com.chesslab.engine.api.TrackerEvent.FeedbackRecorded,
                    -> writeCheckpoint()
                    else -> Unit
                }
            }
        }
    }

    private val checkpointFile: File get() = File(filesDir, "tracker-checkpoint.txt")

    private fun restoreCheckpoint() {
        val file = checkpointFile
        if (!file.exists()) return
        val moves = runCatching { file.readLines().filter(String::isNotBlank) }.getOrElse { emptyList() }
        if (moves.isEmpty() || !coordinator.restoreMoves(moves)) clearCheckpoint()
    }

    private fun writeCheckpoint() {
        val moves = coordinator.uciHistory
        if (moves.isEmpty()) {
            clearCheckpoint()
            return
        }
        val target = checkpointFile
        val temp = File(target.parentFile, ".${target.name}.tmp")
        temp.writeText(moves.joinToString("\n", postfix = "\n"))
        if (!temp.renameTo(target)) {
            target.delete()
            temp.renameTo(target)
        }
        temp.delete()
    }

    private fun clearCheckpoint() {
        checkpointFile.delete()
    }

    /**
     * Publish the warped board for the UI, throttled ~10 fps, converted off-thread.
     * The preview dim equals the detect resolution (512), so the output size is
     * stable whether the frame carried the full-res (1024, CNN-demand frames) or
     * the detect-res board — no shimmer from the full-res warp gating.
     */
    private fun publishBoard(boardBgr: Mat) {
        val now = System.nanoTime()
        if (now - lastBoardPreviewNs < BOARD_PREVIEW_INTERVAL_NS) return
        if (!boardPreviewInFlight.compareAndSet(false, true)) return
        lastBoardPreviewNs = now
        val clone = boardBgr.clone()
        lifecycleScope.launch(Dispatchers.Default) {
            try {
                val display = Mat()
                val maxDim = maxOf(clone.cols(), clone.rows())
                if (maxDim > BOARD_PREVIEW_MAX_DIM) {
                    val scale = BOARD_PREVIEW_MAX_DIM.toDouble() / maxDim
                    Imgproc.resize(clone, display, org.opencv.core.Size(), scale, scale, Imgproc.INTER_LINEAR)
                } else {
                    clone.copyTo(display)
                }
                val rgba = Mat()
                try {
                    Imgproc.cvtColor(display, rgba, Imgproc.COLOR_BGR2RGBA)
                    val bitmap = Bitmap.createBitmap(rgba.cols(), rgba.rows(), Bitmap.Config.ARGB_8888)
                    Utils.matToBitmap(rgba, bitmap)
                    _boardBitmap.value = bitmap
                } finally {
                    rgba.release()
                    display.release()
                }
            } finally {
                clone.release()
                boardPreviewInFlight.set(false)
            }
        }
    }

    private fun publishDebug(images: DebugImages) {
        val view = requestedOverlayView
        if (view != OverlayView.DIFF && view != OverlayView.OCCLUSION && view != OverlayView.MOTION) return
        val now = System.nanoTime()
        if (now - lastDebugPreviewNs < DEBUG_PREVIEW_INTERVAL_NS) return
        lastDebugPreviewNs = now
        _debugBitmaps.value =
            DebugBitmaps(
                detectionDiff = if (view == OverlayView.DIFF) images.detectionDiff?.toHeatmap() else null,
                occlusionDiff = if (view == OverlayView.OCCLUSION) images.occlusionDiff?.toHeatmap() else null,
                motionDiff = if (view == OverlayView.MOTION) images.motionDiff?.toHeatmap() else null,
            )
    }

    private fun GrayImage.toHeatmap(): Bitmap {
        val gray = Mat(height, width, CvType.CV_8UC1)
        val bgr = Mat()
        val rgba = Mat()
        try {
            gray.put(0, 0, data)
            Imgproc.applyColorMap(gray, bgr, Imgproc.COLORMAP_HOT)
            Imgproc.cvtColor(bgr, rgba, Imgproc.COLOR_BGR2RGBA)
            return Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also {
                Utils.matToBitmap(rgba, it)
            }
        } finally {
            gray.release()
            bgr.release()
            rgba.release()
        }
    }

    /**
     * Downscale raw [mat] to ~640 px max edge and publish as [rawPreview], throttled ~5 fps.
     * The resize/convert (up to ~30ms on a full-res frame) runs on a background coroutine
     * off a clone — the frame loop only pays the clone (~few ms), and only when due.
     */
    private fun publishRawPreview(
        mat: Mat,
        width: Int,
        height: Int,
    ) {
        val now = System.nanoTime()
        if (now - lastRawPreviewNs < RAW_PREVIEW_INTERVAL_NS) return
        if (!rawPreviewInFlight.compareAndSet(false, true)) return
        lastRawPreviewNs = now
        val clone = mat.clone()
        lifecycleScope.launch(Dispatchers.Default) {
            try {
                val maxDim = maxOf(width, height)
                val scale =
                    if (maxDim > RAW_PREVIEW_MAX_DIM) RAW_PREVIEW_MAX_DIM.toDouble() / maxDim else 1.0
                val scaled = Mat()
                if (scale < 1.0) {
                    Imgproc.resize(clone, scaled, org.opencv.core.Size(0.0, 0.0), scale, scale, Imgproc.INTER_LINEAR)
                } else {
                    clone.copyTo(scaled)
                }
                val rgba = Mat()
                Imgproc.cvtColor(scaled, rgba, Imgproc.COLOR_BGR2RGBA)
                val bitmap = Bitmap.createBitmap(rgba.cols(), rgba.rows(), Bitmap.Config.ARGB_8888)
                Utils.matToBitmap(rgba, bitmap)
                rgba.release()
                scaled.release()
                _rawPreview.value = bitmap
            } finally {
                clone.release()
                rawPreviewInFlight.set(false)
            }
        }
    }

    private fun startForegroundInternal() {
        val channelId = "tracker"
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(channelId, getString(R.string.notif_channel), NotificationManager.IMPORTANCE_LOW),
            )
        }
        val stopIntent =
            Intent(this, TrackerService::class.java).setAction(ACTION_STOP)
        val stopPending =
            PendingIntent.getService(
                this,
                0,
                stopIntent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
        val notification: Notification =
            NotificationCompat
                .Builder(this, channelId)
                .setContentTitle(getString(R.string.notif_title))
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .setOngoing(true)
                .addAction(0, getString(R.string.notif_stop), stopPending)
                .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA)
        } else {
            startForeground(NOTIF_ID, notification)
        }
    }

    private var lastRawPreviewNs = 0L
    private val rawPreviewInFlight = AtomicBoolean(false)
    private var lastBoardPreviewNs = 0L
    private val boardPreviewInFlight = AtomicBoolean(false)
    private var lastDebugPreviewNs = 0L

    companion object {
        private const val NOTIF_ID = 1
        private const val ACTION_STOP = "com.chesslab.tracker.action.STOP"

        // Re-detect markers ~3×/s: enough for fixed-camera drift without monopolizing the frame loop.
        private const val LIVE_ALIGN_INTERVAL_NS = 300_000_000L
        private const val DIAG_INTERVAL_NS = 700_000_000L
        private const val RAW_PREVIEW_INTERVAL_NS = 200_000_000L // ~5 fps throttle
        private const val BOARD_PREVIEW_INTERVAL_NS = 100_000_000L // ~10 fps throttle
        private const val DEBUG_PREVIEW_INTERVAL_NS = 200_000_000L // ~5 fps throttle
        private const val RAW_PREVIEW_MAX_DIM = 640

        // = detect resolution (boardSize 1024 * 0.5): keeps the preview size identical
        // for full-res (CNN-demand) and detect-res frames under the warp gating.
        private const val BOARD_PREVIEW_MAX_DIM = 512

        /** Start + bind the tracker service. */
        fun start(context: Context) {
            val intent = Intent(context, TrackerService::class.java)
            context.startForegroundService(intent)
        }
    }
}
