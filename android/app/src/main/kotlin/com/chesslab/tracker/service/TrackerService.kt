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

data class DebugBitmaps(
    val detectionDiff: Bitmap? = null,
    val occlusionDiff: Bitmap? = null,
    val motionDiff: Bitmap? = null,
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
    private var referenceProfile: CalibrationProfile? = null
    private var observedReferenceVersion = -1L

    @Volatile private var settings: TrackerSettings = TrackerSettings()
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
        cnnScope = CoroutineScope(lifecycleScope.coroutineContext + Dispatchers.Default)
        cnn =
            CnnIntegration(
                coordinator,
                cnnFrameStore::latest,
                cnnScope,
                CnnModelStore(filesDir),
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

    /** Select which diagnostic bitmap the frame loop should materialize. */
    fun setOverlayView(view: OverlayView) {
        requestedOverlayView = view
    }

    private fun startFrameLoop() {
        if (frameLoopJob != null) return
        frameLoopJob =
            lifecycleScope.launch(Dispatchers.Default) {
                camera.frames.collect { frame ->
                    try {
                        // Publish raw camera preview (independent of warp/tracking success —
                        // also the ONLY consumer in preview-only mode before calibration).
                        publishRawPreview(frame.mat, frame.width, frame.height)

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

                        // Feed raw frame + corners before warp (phase 07 recorder).
                        val corners = baseWarper?.profile?.corners
                        recorder?.onRawFrame(frame.mat, corners, frame.width, frame.height)

                        recorder?.onFrame(coordinator.uiState.value.fen, frame.timestampNs)
                        val processed = pipe.process(frame.mat, frame.timestampNs, fullResolutionBoard = cnn?.attached == true)
                        try {
                            // Dark-frame gate: below the pre-CLAHE luma floor the diff is pure
                            // amplified sensor noise — freeze detection instead of feeding it.
                            coordinator.meanLuma = processed.meanLuma
                            val thr = settings.darkLumaThr
                            if (thr > 0 && processed.meanLuma < thr) {
                                coordinator.onDarkFrame()
                                diag { "dark frame gated: meanLuma=${"%.1f".format(processed.meanLuma)} < $thr" }
                            } else {
                                coordinator.onFrame(processed.gray, processed.bgr, processed.timestampNs)
                                synchronizeReferenceGeometry()
                                cnnFrameStore.update(processed, coordinator.frameSeq)
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
        val now = System.nanoTime()
        if (now - liveAlignTickNs < LIVE_ALIGN_INTERVAL_NS) return
        liveAlignTickNs = now
        val base = baseWarper ?: return
        val fresh = liveAlignDetector.detectScaled(frame) // null when markers are hidden → keep current warp
        if (fresh != null) {
            val aligned = liveAlignSmoother.update(fresh)
            val referenceCorners = referenceProfile?.forResolution(width, height)?.corners
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
            val updated = base.profile.copy(corners = aligned, sourceWidth = width, sourceHeight = height)
            val warper = BoardWarper(updated)
            baseWarper = warper
            pipeline?.warper = warper
            _activeProfile.value = updated
            base.close()
        }
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

    private fun publishBoard(boardBgr: Mat) {
        val now = System.nanoTime()
        if (now - lastBoardPreviewNs < BOARD_PREVIEW_INTERVAL_NS) return
        lastBoardPreviewNs = now
        val display = Mat()
        val maxDim = maxOf(boardBgr.cols(), boardBgr.rows())
        if (maxDim > BOARD_PREVIEW_MAX_DIM) {
            val scale = BOARD_PREVIEW_MAX_DIM.toDouble() / maxDim
            Imgproc.resize(boardBgr, display, org.opencv.core.Size(), scale, scale, Imgproc.INTER_LINEAR)
        } else {
            boardBgr.copyTo(display)
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

    /** Downscale raw [mat] to ~640 px max edge and publish as [rawPreview], throttled ~5 fps. */
    private fun publishRawPreview(
        mat: Mat,
        width: Int,
        height: Int,
    ) {
        val now = System.nanoTime()
        if (now - lastRawPreviewNs < RAW_PREVIEW_INTERVAL_NS) return
        lastRawPreviewNs = now

        val maxDim = maxOf(width, height)
        val scale =
            if (maxDim > RAW_PREVIEW_MAX_DIM) RAW_PREVIEW_MAX_DIM.toDouble() / maxDim else 1.0
        val scaled = Mat()
        if (scale < 1.0) {
            Imgproc.resize(mat, scaled, org.opencv.core.Size(0.0, 0.0), scale, scale, Imgproc.INTER_LINEAR)
        } else {
            mat.copyTo(scaled)
        }
        val rgba = Mat()
        Imgproc.cvtColor(scaled, rgba, Imgproc.COLOR_BGR2RGBA)
        val bitmap = Bitmap.createBitmap(rgba.cols(), rgba.rows(), Bitmap.Config.ARGB_8888)
        Utils.matToBitmap(rgba, bitmap)
        rgba.release()
        scaled.release()
        _rawPreview.value = bitmap
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
    private var lastBoardPreviewNs = 0L
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
        private const val BOARD_PREVIEW_MAX_DIM = 640

        /** Start + bind the tracker service. */
        fun start(context: Context) {
            val intent = Intent(context, TrackerService::class.java)
            context.startForegroundService(intent)
        }
    }
}
