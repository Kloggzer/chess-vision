package com.chesslab.tracker.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.os.Binder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import com.chesslab.engine.api.TrackerState
import com.chesslab.tracker.R
import com.chesslab.tracker.camera.CameraConfig
import com.chesslab.tracker.camera.DynamicResolutionController
import com.chesslab.tracker.camera.Resolution
import com.chesslab.tracker.camera.TrackerCamera
import com.chesslab.tracker.cnn.CnnModelStore
import com.chesslab.tracker.geometry.BoardWarper
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.CornerDriftMonitor
import com.chesslab.tracker.geometry.DriftResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.opencv.android.Utils
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc

/**
 * Foreground (camera-type) service that owns the running tracker: it wires
 * [TrackerCamera] → [BoardFramePipeline] → [TrackerCoordinator] on the lifecycle
 * scope, drives [DynamicResolutionController] (rewarping on resolution changes),
 * polls [CornerDriftMonitor] every 5 s **only** when experimental detection is on,
 * and applies live/constructor settings changes.
 *
 * Extension points for later phases (defined now, `null` in the base build):
 * [safeguard] (05), [stateSink] (06), [recorder] (07). Phases 05–07 plug in
 * without editing this file.
 */
class TrackerService : LifecycleService() {
    private val binder = LocalBinder()

    private lateinit var settingsRepo: SettingsRepository
    private lateinit var camera: TrackerCamera
    private val coordinator = TrackerCoordinator()

    private var pipeline: BoardFramePipeline? = null
    private var baseWarper: BoardWarper? = null
    private var resolutionController: DynamicResolutionController? = null
    private var driftMonitor: CornerDriftMonitor? = null
    private var settings: TrackerSettings = TrackerSettings()
    private var cnn: CnnIntegration? = null

    private val _boardBitmap = MutableStateFlow<Bitmap?>(null)

    /** Latest warped board for the overlay views; null until tracking starts. */
    val boardBitmap: StateFlow<Bitmap?> = _boardBitmap.asStateFlow()

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

    /** Phase 07: raw session recorder. */
    var recorder: SessionRecorder? = null

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
        cnn = CnnIntegration(coordinator, camera, { baseWarper }, { settings.claheClip }, lifecycleScope, CnnModelStore(filesDir))
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
        startForegroundInternal()
        return START_STICKY
    }

    /** Begin tracking with a calibrated [profile]. Idempotent per profile. */
    fun start(profile: CalibrationProfile) {
        val warper = BoardWarper(profile)
        baseWarper = warper
        val pipe = BoardFramePipeline(warper, settings.claheClip)
        pipeline = pipe
        driftMonitor = CornerDriftMonitor(profile.corners, cornerJumpPx = 6.0)

        val cameraConfig = settings.toCameraConfig()
        camera.start(cameraConfig)
        startFrameLoop()
        startResolutionController(cameraConfig)
    }

    fun undo(): Boolean = coordinator.undo()

    fun reset() = coordinator.reset()

    fun forcePromote(piece: String): Boolean = coordinator.forcePromote(piece)

    private fun startFrameLoop() {
        lifecycleScope.launch {
            camera.frames.collect { frame ->
                val pipe = pipeline ?: return@collect

                // Publish raw camera preview (independent of warp/tracking success).
                publishRawPreview(frame.mat, frame.width, frame.height)

                // Feed raw frame + corners before warp (phase 07 recorder).
                val corners = baseWarper?.profile?.corners
                recorder?.onRawFrame(frame.mat, corners, frame.width, frame.height)

                recorder?.onFrame(coordinator.uiState.value.fen, frame.timestampNs)
                val processed = pipe.process(frame.mat, frame.timestampNs)
                coordinator.onFrame(processed.gray, processed.bgr, processed.timestampNs)

                // Phase 07: flush pending capture when board is clean.
                val state = coordinator.uiState.value.trackerState
                if (state == TrackerState.TRACKING) {
                    recorder?.onCleanFrame()
                }

                publishBoard(processed.boardBgr)
                maybeCheckDrift(frame.mat)
                processed.boardBgr.release()
                frame.mat.release()
            }
        }
    }

    private fun startResolutionController(cameraConfig: CameraConfig) {
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
        lifecycleScope.launch {
            controller.activeResolution.collect { res -> rewarpFor(res) }
        }
    }

    /** Rewarp when the dynamic controller changes the analysis resolution. */
    private fun rewarpFor(res: Resolution) {
        val base = baseWarper ?: return
        pipeline?.warper = base.forResolution(res.width, res.height)
    }

    private var driftTickNs = 0L

    private fun maybeCheckDrift(frame: Mat) {
        val now = System.nanoTime()
        val monitor = driftMonitor
        val due = settings.experimentalDetection && monitor != null && now - driftTickNs >= DRIFT_INTERVAL_NS
        if (!due) return
        driftTickNs = now
        if (monitor!!.check(frame) is DriftResult.Drifted) {
            coordinator.reset(coordinator.uiState.value.fen)
        }
    }

    private fun observeSettings() {
        lifecycleScope.launch {
            settingsRepo.settings.collect { next ->
                val prev = settings
                settings = next
                pipeline?.claheClip = next.claheClip
                if (next.requiresEngineRestart(prev)) {
                    coordinator.reconfigure(next.toTrackerConfig())
                } else {
                    coordinator.applyConfig(next.toTrackerConfig())
                }
                cnn?.reconcile(prev, next)
            }
        }
    }

    private fun forwardStateToSink() {
        lifecycleScope.launch {
            coordinator.uiState.collect { state -> stateSink?.onState(state) }
        }
    }

    private fun forwardEventsToRecorder() {
        lifecycleScope.launch {
            coordinator.events.collect { event -> recorder?.onEvent(event) }
        }
    }

    private fun publishBoard(boardBgr: Mat) {
        val rgba = Mat()
        Imgproc.cvtColor(boardBgr, rgba, Imgproc.COLOR_BGR2RGBA)
        val bitmap = Bitmap.createBitmap(rgba.cols(), rgba.rows(), Bitmap.Config.ARGB_8888)
        Utils.matToBitmap(rgba, bitmap)
        rgba.release()
        _boardBitmap.value = bitmap
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
        val notification: Notification =
            NotificationCompat
                .Builder(this, channelId)
                .setContentTitle(getString(R.string.notif_title))
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .setOngoing(true)
                .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA)
        } else {
            startForeground(NOTIF_ID, notification)
        }
    }

    private var lastRawPreviewNs = 0L

    companion object {
        private const val NOTIF_ID = 1
        private const val DRIFT_INTERVAL_NS = 5_000_000_000L
        private const val RAW_PREVIEW_INTERVAL_NS = 200_000_000L // ~5 fps throttle
        private const val RAW_PREVIEW_MAX_DIM = 640

        /** Start + bind the tracker service. */
        fun start(context: Context) {
            val intent = Intent(context, TrackerService::class.java)
            context.startForegroundService(intent)
        }
    }
}
