package com.chesslab.tracker.service

import android.app.NotificationManager
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import com.chesslab.cnn.CnnConfig
import com.chesslab.cnn.CnnRecovery
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.camera.CameraRequest
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.camera.TrackerCamera
import com.chesslab.tracker.cnn.AndroidCnnLog
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.cnn.CnnModelAssets
import com.chesslab.tracker.cnn.CnnObserver
import com.chesslab.tracker.cnn.OnnxSquareClassifier
import com.chesslab.tracker.pipeline.CameraStages
import com.chesslab.tracker.pipeline.CropFrameStore
import com.chesslab.tracker.pipeline.FramePipeline
import com.chesslab.tracker.pipeline.FrameSizeGuard
import com.chesslab.tracker.pipeline.StageTimings
import com.chesslab.tracker.settings.DataStoreConfigStore
import com.chesslab.tracker.settings.SettingsRepository
import com.chesslab.tracker.ui.debug.DebugSessionHost
import com.chesslab.tracker.ui.debug.debugSession
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

private const val REQUEST_WIDTH = 1920

private const val REQUEST_HEIGHT = 1080

private const val PREVIEW_MAX_SIDE = 640

/**
 * The single owner of the camera and of the engine.
 *
 * It constructs, wires and closes; it holds no tracker logic at all. That is the whole point:
 * the legacy `TrackerService.kt` grew to 970 LOC of camera control, warper swaps, CNN
 * integration, recording and settings, and a real bug lived in it invisibly for weeks.
 */
class TrackerService : LifecycleService() {
    private lateinit var settings: SettingsRepository
    private lateinit var host: EngineHost
    private lateinit var observer: CnnObserver
    private lateinit var pipeline: FramePipeline
    private lateinit var camera: TrackerCamera
    private lateinit var coordinator: TrackerCoordinator
    private lateinit var publisher: StatusPublisher
    private lateinit var frames: CameraFrameBus
    private lateinit var binder: TrackerBinder
    private lateinit var notification: TrackerNotification

    @Volatile
    private var geometry = BoardGeometry()

    private var moves = 0

    // 07b's two debug probes. Both are inert until the debug screen arms them.
    private lateinit var cropTap: DebugCropTap
    private val cnnProbe = CnnRuntimeProbe()

    override fun onCreate() {
        super.onCreate()
        notification = TrackerNotification(this)
        // Foreground FIRST: Android 14 throws ForegroundServiceStartNotAllowedException when a
        // camera-type service binds the camera before it is foreground.
        startForeground(
            NOTIFICATION_ID,
            notification.build("waiting", 0),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA,
        )
        wire()
        camera.bind(this)
        lifecycleScope.launch { settings.load() }
        publisher.events.onEach(::onEvent).launchIn(lifecycleScope)
        settings.debugEnabled.onEach { if (it) setDebugEnabled(true) }.launchIn(lifecycleScope)
    }

    override fun onBind(intent: Intent): IBinder {
        super.onBind(intent)
        return binder
    }

    override fun onDestroy() {
        DebugSessionHost.publish(null)
        // Reverse construction order: nothing may deliver a frame into a closed pipeline.
        camera.close()
        observer.close()
        pipeline.close()
        frames.close()
        super.onDestroy()
    }

    private fun wire() {
        val config = TrackerConfig()
        val timings = StageTimings()
        val store = CropFrameStore()
        val guard = FrameSizeGuard()
        publisher = StatusPublisher(lifecycleScope, timings)
        pipeline = FramePipeline(config, CameraStages(geometry, config, store), store, guard, timings)
        host = engineHost(config, CnnRecovery(cnnConfig(config))) { pipeline.onConfigChanged(it) }
        settings =
            SettingsRepository(DataStoreConfigStore(this), lifecycleScope) {
                host.submit(EngineAction.UpdateConfig(it))
            }
        observer = openObserver(store)
        frames = CameraFrameBus(openCamera(), lifecycleScope, { bgrToBitmap(it, PREVIEW_MAX_SIDE) })
        val align = LiveAlign(lifecycleScope, ::geometry, settings.config::value) { pipeline.corners = it }
        coordinator = TrackerCoordinator(pipeline, host, publisher, frames, observer, align, guard)
        binder = TrackerBinder(host, publisher, frames, settings, observer.state, ::calibrate)
        DebugSessionHost.publish(
            debugSession(
                status = publisher.status,
                cnnState = observer.state,
                settings = settings,
                onDebugEnabled = ::setDebugEnabled,
                crops = { cropTap.latest },
                runtime = cnnProbe::info,
                retry = { observer.retryAttach(::openClassifier) },
            ),
        )
    }

    /**
     * Arms BOTH halves of the debug payload — the engine's assembly and the crop tap. 07a's
     * persisted switch only ever ARMS from here; disarming belongs to the screen that armed it.
     */
    private fun setDebugEnabled(on: Boolean) {
        cropTap.enabled = on
        host.submit(EngineAction.SetDebugEnabled(on))
    }

    /** The app's ONLY `TrackerCamera`. Its health flow is what the frame bus republishes. */
    private fun openCamera() =
        TrackerCamera(this, CameraRequest(REQUEST_WIDTH, REQUEST_HEIGHT), { image, delivered ->
            binder.deliveredSize = delivered
            publisher.cameraHealth = camera.cameraState.value
            coordinator.onFrame(image, delivered)
        }).also { camera = it }.cameraState

    private fun openObserver(store: CropFrameStore): CnnObserver {
        cropTap = DebugCropTap(cropFrameSource(store, ::geometry))
        val cnn =
            CnnObserver(
                source = cropTap,
                fen = { publisher.lastFen },
                onSnapshot = {
                    cnnProbe.observations += 1
                    host.submit(it)
                },
            )
        // Attaching is asynchronous and LOUD on failure: a silent one once let the tracker run
        // diff-only for a whole session (MEMORY android-live-bringup-2607).
        cnn.attach(::openClassifier)
        cnn.state.onEach { publisher.cnnState = it }.launchIn(lifecycleScope)
        settings.config
            .onEach {
                cnn.setIntervalS(it.observerIntervalS)
                cnn.setEnabled(it.cnnVerify)
            }.launchIn(lifecycleScope)
        return cnn
    }

    /**
     * Opens the classifier and records what the EP chain asked for next to what it got. The
     * requested provider is the head of the chain, which QNN only joins when the quantized graph
     * was staged; anything else is a fall-through and 07b renders it as one.
     */
    private fun openClassifier(): Attached {
        val staged = CnnModelAssets.fromAssets(this).stage()
        val classifier = OnnxSquareClassifier.open(staged, AndroidCnnLog)
        cnnProbe.requestedEp = if (staged.qnn != null) "QNN-HTP(NPU)" else "NNAPI"
        cnnProbe.actualEp = classifier.backend
        cnnProbe.model = classifier.model
        cnnProbe.inputShape = classifier.inputShape
        cnnProbe.lastRunMs = classifier::lastRunMs
        return Attached(classifier, classifier.backend, classifier.model)
    }

    private fun onEvent(event: TrackerEvent) {
        moves +=
            when (event) {
                is TrackerEvent.MoveCommitted -> 1
                is TrackerEvent.SequenceCommitted -> event.ucis.size
                else -> return
            }
        val state = publisher.status.value?.state ?: "tracking"
        getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification.build(state, moves))
    }

    private fun calibrate(
        geom: BoardGeometry,
        corners: FloatArray,
        profileName: String,
    ) {
        geometry = geom
        val requested = camera.requestedSize
        val delivered = camera.deliveredSize ?: DeliveredSize(requested.width, requested.height, 0)
        coordinator.applyCalibration(geom, corners, profileName, delivered)
    }
}

private fun cnnConfig(config: TrackerConfig) =
    CnnConfig(
        confThr = config.cnnConfThr,
        minAgreement = config.cnnMinAgreement,
        marginSquares = config.cnnMarginSquares,
        minConfidentBoard = config.minConfidentBoard,
        minConfidentRecovery = config.minConfidentRecovery,
        recoveryMaxPlies = config.recoveryMaxPlies,
    )
