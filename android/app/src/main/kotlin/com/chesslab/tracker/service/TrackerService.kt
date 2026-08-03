package com.chesslab.tracker.service

import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.camera.CameraLookPort
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.camera.TrackerCamera
import com.chesslab.tracker.camera.cameraRequestFor
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.cnn.CnnModelAssets
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.diagnostics.DiagnosticsLog
import com.chesslab.tracker.diagnostics.appVersionOf
import com.chesslab.tracker.diagnostics.diagnosticsDir
import com.chesslab.tracker.diagnostics.runStartOf
import com.chesslab.tracker.games.GameSessionController
import com.chesslab.tracker.geometry.calibrationStore
import com.chesslab.tracker.geometry.withCropSizeOf
import com.chesslab.tracker.pipeline.CameraRate
import com.chesslab.tracker.pipeline.StageTimings
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.DataStoreConfigStore
import com.chesslab.tracker.settings.SettingsRepository
import com.chesslab.tracker.settings.cameraLook
import com.chesslab.tracker.speech.MoveAnnouncer
import com.chesslab.tracker.speech.androidSpeechEngine
import com.chesslab.tracker.ui.debug.DebugSessionHost
import com.chesslab.tracker.ui.debug.debugSession
import com.chesslab.tracker.ui.games.GameSessionHost
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

private const val PREVIEW_MAX_SIDE = 640

/**
 * How long the run header waits for the CNN attach to resolve.
 *
 * An attach is a synchronous ONNX session open and normally takes a second or two; the multi-minute
 * case was QNN's EPContext generation, and the QNN provider is not in this binary at all.
 */
private const val ATTACH_HEADER_WAIT_MS = 30_000L

/**
 * The single owner of the camera and of the engine.
 *
 * It constructs, wires and closes; it holds no tracker logic at all. That is the whole point:
 * the legacy `TrackerService.kt` grew to 970 LOC of camera control, warper swaps, CNN
 * integration, recording and settings, and a real bug lived in it invisibly for weeks.
 *
 * Two lifetimes live here. The **session** — camera, frame bus, status publisher, settings, game
 * recording — lasts as long as the service, because the UI collects its flows and the camera may
 * have exactly one owner. The **stack** — pipeline, engine, CNN observer, coordinator — is rebuilt by
 * [restartTracker] so the 34 construction-time knobs can be applied without killing the process.
 */
class TrackerService :
    LifecycleService(),
    TrackerControls {
    private lateinit var settings: SettingsRepository
    private lateinit var publisher: StatusPublisher
    private lateinit var camera: TrackerCamera
    private lateinit var frames: CameraFrameBus
    private lateinit var binder: TrackerBinder
    private lateinit var notification: TrackerNotification
    private lateinit var speech: MoveAnnouncer
    private lateinit var games: GameSessionController
    private lateinit var diagnostics: DiagnosticsLog

    /** Read once: `PackageManager` is a binder call and the answer cannot change under us. */
    private val version by lazy { appVersionOf(this) }

    private val calibration by lazy { calibrationStore(this) }

    private val cameraRate = CameraRate()
    private val timings = StageTimings()
    private val cnnProbe = CnnRuntimeProbe()

    /** Re-read on every attach, so a changed model or EP lands on the next stack (D07a-3). */
    private val attachCnn: () -> Attached = { openClassifier(this, settings.appSettings.value, cnnProbe) }

    // The factory is inline because it has exactly one call site and `StackSwitch` already says
    // what it is for; the lambda is lazy, so the `lateinit` session parts are wired by then.
    private val stacks =
        StackSwitch {
            TrackerStack(
                TrackerSeed(
                    onMeasuredBoard(settings.config.value, geometry),
                    ::geometry,
                    corners,
                    publisher.lastFen ?: STARTPOS,
                    diagnostics::offer,
                ),
                settings,
                publisher,
                frames,
                timings,
                lifecycleScope,
                attachCnn,
            )
        }

    /** Mirrors the CURRENT stack's observer, so the binder and 07b survive a restart. */
    private val cnn = MutableStateFlow<CnnState>(CnnState.Off)

    private val cameraRunning = MutableStateFlow(true)

    override val cameraOn: StateFlow<Boolean> = cameraRunning.asStateFlow()

    override val cameraLook: CameraLookPort get() = camera.look

    /** The lamp and the baseline as one act — see [TorchSwitch]. */
    private val torch by lazy {
        TorchSwitch(
            lamp = camera.torch,
            scope = lifecycleScope,
            baseline = { stacks.current?.host?.submit(EngineAction.CaptureBaseline) },
        )
    }

    /**
     * The tracker's live geometry: the calibration profile contributes the board, the loaded model
     * contributes the crop size.
     *
     * **Every write goes through `withCropSizeOf(modelSpec)`** — there are exactly three, and
     * `git grep withCropSizeOf` finds all of them. The stored profile carries a crop size of its own
     * (`CropParams`) and the live path must not use it: the size that has to be right is the one the
     * ONNX graph takes, and `preprocessInto` requires the crops to already BE that size.
     */
    @Volatile
    private var geometry = BoardGeometry()

    /**
     * What the model declares it takes (`infer_size`, specs/22), or null while nothing could be read.
     *
     * Null keeps [BoardGeometry]'s 128 defaults — calibration runs long before a classifier attaches
     * and must never depend on one.
     */
    @Volatile
    private var modelSpec: ModelSpec? = null

    @Volatile
    private var corners: FloatArray? = null

    /** Survives the restart that rebuilds the tap it arms. */
    @Volatile
    private var debugOn = false

    private var moves = 0

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
        wireSession()
        lifecycleScope.launch { start() }
    }

    override fun onBind(intent: Intent): IBinder {
        super.onBind(intent)
        return binder
    }

    /**
     * `START_NOT_STICKY`, deliberately: a tracker the system killed must not come back on its own
     * and re-open the camera with nobody watching. Coming back is the user's call.
     */
    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int {
        super.onStartCommand(intent, flags, startId)
        if (intent?.action == ACTION_STOP_TRACKING) endService()
        return START_NOT_STICKY
    }

    /** Swiping the app out of recents is unambiguous: the camera goes, the service goes. */
    override fun onTaskRemoved(rootIntent: Intent?) {
        endService()
        super.onTaskRemoved(rootIntent)
    }

    /**
     * The privacy switch (see [CameraSwitch]). The stack, the engine and the game are untouched —
     * only the device is handed back, so a resume continues the same game rather than starting one.
     */
    override fun setCameraOn(on: Boolean) {
        if (cameraRunning.value == on) return
        cameraRunning.value = on
        if (on) {
            // Re-enter foreground first: the notification's Stop action may have dropped us out of
            // it, and a background service that binds a camera is denied outright on Android 14.
            // Resume is only ever a tap in a visible app, so starting the FGS here is allowed.
            startForeground(NOTIFICATION_ID, notification.build("waiting", moves), ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA)
            camera.resume()
        } else {
            camera.stop()
            publisher.onCameraStopped()
        }
        notification.post(publisher.status.value?.state, moves, on)
    }

    /**
     * Release the camera FIRST and unconditionally: a bound UI client keeps the service alive past
     * `stopSelf`, so leaving the unbind to `onDestroy` would leave the green indicator lit for as
     * long as the activity happens to live.
     */
    private fun endService() {
        camera.stop()
        cameraRunning.value = false
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        DebugSessionHost.publish(null)
        TrackerRestartHost.publish(null)
        GameSessionHost.publish(null)
        // The service IS the session: stopping it ends the game rather than losing it. A game with
        // no moves saves nothing, so a start/stop cycle still leaves the library alone.
        games.endAndSave()
        // Reverse construction order: nothing may deliver a frame into a closed pipeline.
        speech.close()
        camera.close()
        stacks.close()
        frames.close()
        // After the stack, so the last rows of the session it just tore down are still accepted.
        diagnostics.close()
        super.onDestroy()
    }

    /** The long-lived half. Nothing here is rebuilt by a restart — see the class doc. */
    private fun wireSession() {
        publisher = StatusPublisher(lifecycleScope, timings, cameraRate)
        // Before the stack, which is wired to its sink at construction. Session-lived on purpose:
        // a tracker restart is a new run header in the same file, not a new file.
        diagnostics = DiagnosticsLog(diagnosticsDir(filesDir), lifecycleScope)
        settings =
            SettingsRepository(DataStoreConfigStore(this), lifecycleScope) {
                // The config the ENGINE gets, never the stored one — see [onMeasuredBoard].
                stacks.current?.host?.submit(EngineAction.UpdateConfig(onMeasuredBoard(settings.config.value, geometry)))
            }
        camera =
            TrackerCamera(this, cameraRequestFor(settings.appSettings.value.resolutionMode), { image, delivered ->
                binder.deliveredSize = delivered
                publisher.cameraHealth = camera.cameraState.value
                // Here, not in the coordinator: this is the last point that sees EVERY delivered
                // frame, including the ones dropped below while a restart swaps the stack.
                publisher.onCameraFrame()
                // Dropped, not queued, while a restart swaps the stack: `StackSwitch` detaches
                // before it closes, so this is the window in which there is nothing to run.
                stacks.current?.coordinator?.onFrame(image, delivered)
            })
        frames = CameraFrameBus(camera.cameraState, lifecycleScope, { bgrToBitmap(it, PREVIEW_MAX_SIDE) })
        binder =
            TrackerBinder(publisher, frames, settings, cnn, { stacks.current?.host?.submit(it) }, this, torch)
        DebugSessionHost.publish(
            debugSession(
                status = publisher.status,
                cnnState = cnn,
                settings = settings,
                onDebugEnabled = ::setDebugEnabled,
                crops = { stacks.current?.cropTap?.latest },
                runtime = cnnProbe::info,
                retry = { stacks.current?.let { it.observer.retryAttach(attachCnn) } },
            ),
        )
        TrackerRestartHost.publish(binder)
        // 08c: speech collects the same events off `Dispatchers.Default`; it opens no speech engine
        // until an announcement is actually due, so it costs nothing while disabled.
        speech = MoveAnnouncer(lifecycleScope, androidSpeechEngine(this), settings).also { it.attach(publisher.events) }
        cnnProbe.observations = { stacks.current?.observations ?: 0L }
        // 08a's recorder, in the SESSION half: it must outlive both the UI and a tracker restart.
        games = wireGameSession(this, lifecycleScope, frames, publisher, calibration)
    }

    /** Persisted truth first, then the stack, then the camera — a frame with no stack is wasted. */
    private suspend fun start() {
        settings.load()
        // The saved picture, straight onto the camera. The port holds it as a WANT even before a
        // device is bound and re-asserts it on every rebind, so this is the only place the stored
        // value has to be handed over.
        camera.look.setLook(settings.appSettings.value.cameraLook())
        // Before the geometry, because the geometry follows it.
        modelSpec = declaredModelSpec(this, settings.appSettings.value)
        geometry = adoptStoredOrientation(calibration, settings).withCropSizeOf(modelSpec)
        swapStack()
        // Before the bind, so the FIRST binding already asks for the persisted mode instead of
        // binding at the default and immediately rebinding.
        camera.retarget(cameraRequestFor(settings.appSettings.value.resolutionMode))
        camera.bind(this)
        publisher.events.onEach(::onEvent).launchIn(lifecycleScope)
        settings.debugEnabled.onEach { if (it) setDebugEnabled(true) }.launchIn(lifecycleScope)
    }

    /**
     * D07a-1: apply the 34 construction-time knobs without killing the process.
     *
     * Order: the orientation setting reaches the profile, the stack is swapped on the analyzer
     * thread, and only then is the camera retargeted — a request change is the one part that must
     * happen on the main thread, and doing it last means no frame is delivered into a half-built
     * stack. The camera object itself is never replaced: exactly one `ProcessCameraProvider`
     * binding may exist app-wide.
     */
    override fun restartTracker() {
        lifecycleScope.launch {
            // `modelDir`/`modelAsset` are restart-required knobs, so the size the model declares is
            // re-read here for the same reason the camera request is: the next stack must crop for
            // the next model. Switching from the 96 px model to the 80 px one and keeping 96 px
            // crops would kill the first observation of the new stack.
            modelSpec = declaredModelSpec(this@TrackerService, settings.appSettings.value)
            geometry =
                calibration
                    .applyOrientation(settings.appSettings.value.orientation.whitePov)
                    .withCropSizeOf(modelSpec)
            swapStack()
            camera.retarget(cameraRequestFor(settings.appSettings.value.resolutionMode))
        }
    }

    /**
     * The swap runs on the ANALYZER thread, serialized against frame delivery, so no frame can be
     * inside the pipeline while it is torn down. The rebuilt [EngineHost] latches its owning thread
     * on its first tick — which is this same analyzer thread — so the ownership `check` is
     * re-established rather than defeated.
     */
    private fun swapStack() =
        camera.runOnAnalyzer {
            stacks.restart()
            stacks.current?.let { stack ->
                stack.cropTap.enabled = debugOn
                stack.host.submit(EngineAction.SetDebugEnabled(debugOn))
                // In the STACK's scope: mirrored into the service scope, every restart would leave
                // a collector behind on an observer that no longer exists.
                stack.observer.state
                    .onEach { cnn.value = it }
                    .launchIn(stack.scope)
                // The run header waits for the attach to RESOLVE, because the execution provider
                // it names is the one the runtime SELECTED — a request is not a delivery, and a
                // quiet fall-through from the NPU to the CPU costs ten times the latency at the
                // same fps. A sticky failure resolves too, and "loaded: null" is itself the answer.
                stack.scope.launch {
                    // …but not forever. A header that never arrives is the worse failure of the
                    // two: the file would then carry rows and no config at all, which is exactly
                    // the state this phase exists to end. Past the wait the model block simply
                    // reports what the probe holds, nulls included.
                    withTimeoutOrNull(ATTACH_HEADER_WAIT_MS) { stack.observer.state.first { it !is CnnState.Attaching } }
                    diagnostics.runStart(
                        // The config the ENGINE was seeded with, not the stored one. The header's
                        // whole job is to say what ran, and `boardSize` is the field where the two
                        // diverge — the stored 1600 against a measured 504 is the divergence that
                        // stopped detection for an evening while the file reported 1600 and agreed
                        // with nothing. See [onMeasuredBoard].
                        runStartOf(
                            settings.appSettings.value,
                            onMeasuredBoard(settings.config.value, geometry),
                            modelSpec,
                            cnnProbe.info(),
                            version,
                        ),
                    )
                }
            }
        }

    /**
     * Arms BOTH halves of the debug payload — the engine's assembly and the crop tap. 07a's
     * persisted switch only ever ARMS from here; disarming belongs to the screen that armed it.
     */
    private fun setDebugEnabled(on: Boolean) {
        debugOn = on
        stacks.current?.let {
            it.cropTap.enabled = on
            it.host.submit(EngineAction.SetDebugEnabled(on))
        }
    }

    private fun onEvent(event: TrackerEvent) {
        // An alarmed engine blocks every commit, so a notification re-posted only on a committed
        // move freezes at the moment things went wrong and never mentions it — while the app is in
        // the background, which is precisely when it is the only channel left. `StatusPublisher`
        // documents the note as "the only alarm signal that reaches the user with the app in the
        // background"; that was true of the resolver and never of this call.
        moves +=
            when (event) {
                is TrackerEvent.MoveCommitted -> 1
                is TrackerEvent.SequenceCommitted -> event.ucis.size
                is TrackerEvent.Alarm, is TrackerEvent.AlarmCleared -> 0
                else -> return
            }
        notification.post(publisher.status.value?.state, moves, cameraRunning.value)
    }

    /**
     * @param relockOptics whether to let focus/exposure/white balance re-converge afterwards. False
     * only for the re-measure sequence, which converged them BEFORE it measured this quad —
     * re-arming there would release the very lock the quad was measured under.
     */
    override fun applyCalibration(
        geom: BoardGeometry,
        pts: FloatArray,
        profileName: String,
    ) {
        geometry = geom.withCropSizeOf(modelSpec)
        corners = pts
        // ONE owner for the board size. The calibration profile measures it; `TrackerConfig` is
        // where the engine reads it, and nothing used to carry it across — they agreed only because
        // both defaulted to 1600. `FrameLoop` now refuses a plane that disagrees with its boxes, so
        // this is what keeps that check satisfied rather than merely loud.
        val config = settings.config.value
        if (config.boardSize != geom.boardSize) settings.update(config.copy(boardSize = geom.boardSize))
        val requested = camera.requestedSize
        val delivered = camera.deliveredSize ?: DeliveredSize(requested.width, requested.height, 0)
        // `geometry`, not `geom`: the pipeline gets the geometry the crops are actually cut with.
        stacks.current?.coordinator?.applyCalibration(geometry, pts, profileName, delivered)
        // Nothing optical happens here any more. A recalibration used to re-arm the frozen
        // exposure, white balance and focus, on the reasoning that the setup had just moved; with
        // no freeze to re-arm (`OpticsLock`) the camera is either on its own automatic or on the
        // values the user pinned, and neither is this function's business.
    }
}

/**
 * The stored config, with the board size the calibration profile actually measured.
 *
 * The profile owns that number; the config only carries it so the engine can derive `detSize`, and
 * `FrameLoop` refuses a detection plane whose size disagrees with its square boxes. Until now only
 * [TrackerService.applyCalibration] kept the two in step, so three ordinary things left them apart:
 * "Reset all to Python defaults", a `CONFIG_SCHEMA_VERSION` bump (which restores the defaults by
 * design), and — before the settings screen stopped offering it — the board-size slider. The stored
 * default is 1600 and the profile clamps to 320..1280, so after any of them the engine indexed
 * squares for a plane that never arrives. It is not loud: `TrackerCamera.deliver` catches the
 * refusal per frame, so what a user sees is a tracker that has stopped noticing moves. Applying it
 * at the one funnel every config change passes through is what makes the profile's ownership real
 * rather than merely documented.
 */
private fun onMeasuredBoard(
    stored: TrackerConfig,
    geometry: BoardGeometry,
): TrackerConfig = if (stored.boardSize == geometry.boardSize) stored else stored.copy(boardSize = geometry.boardSize)

/**
 * The model's own declaration of the crop size it takes, through the one Kotlin reader
 * (`ModelSpec.parse`, specs/22): `infer_size` when the run has one, else `out_size`.
 *
 * Read from the ASSET rather than taken from the attached classifier, because the crops have to be
 * the right size before the first observation runs and because an attach that fails must still leave
 * a calibratable tracker. Staging is idempotent and length-guarded, so the copy the classifier does
 * moments later costs two file-length checks; it happens off the main thread because on a fresh
 * install it is the one that really copies the graph.
 *
 * An unreadable config yields null and the geometry keeps its defaults. That is not silent:
 * `openClassifier` fails on the very same file, and the observer publishes a `CnnState.Failed` the
 * status line and the debug screen render verbatim.
 */
private suspend fun declaredModelSpec(
    context: Context,
    app: AppSettings,
): ModelSpec? =
    withContext(Dispatchers.IO) {
        runCatching {
            ModelSpec.parse(CnnModelAssets.fromAssets(context, app.modelDir, app.modelAsset).stage().configJson)
        }.getOrNull()
    }
