package com.chesslab.tracker.service

import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import android.util.Log
import android.widget.Toast
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import com.chesslab.engine.api.EngineAction
import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.CropClahe
import com.chesslab.tracker.BuildConfig
import com.chesslab.tracker.R
import com.chesslab.tracker.camera.BoardExposureGovernor
import com.chesslab.tracker.camera.BoardFocusGovernor
import com.chesslab.tracker.camera.CameraLookPort
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.camera.ExposureNotice
import com.chesslab.tracker.camera.FocusNotice
import com.chesslab.tracker.camera.FocusTuner
import com.chesslab.tracker.camera.TrackerCamera
import com.chesslab.tracker.camera.cameraRequestFor
import com.chesslab.tracker.capture.CaptureRecorderHost
import com.chesslab.tracker.capture.LiveCaptureRecorder
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.cnn.cnnAssetsFrom
import com.chesslab.tracker.diagnostics.DiagnosticsLog
import com.chesslab.tracker.diagnostics.androidHostIdentity
import com.chesslab.tracker.diagnostics.diagnosticsDir
import com.chesslab.tracker.diagnostics.runStartOf
import com.chesslab.tracker.games.GameSessionController
import com.chesslab.tracker.geometry.ProfileLoad
import com.chesslab.tracker.geometry.calibrationStore
import com.chesslab.tracker.geometry.cropLine
import com.chesslab.tracker.geometry.withCropOf
import com.chesslab.tracker.log.AndroidTrackerLog
import com.chesslab.tracker.log.androidTrackerLogs
import com.chesslab.tracker.pipeline.CameraRate
import com.chesslab.tracker.pipeline.PERF_TAG
import com.chesslab.tracker.pipeline.StageTimings
import com.chesslab.tracker.pipeline.cameraStages
import com.chesslab.tracker.record.BuildStamp
import com.chesslab.tracker.record.LiveCaptureSource
import com.chesslab.tracker.record.RecordingBundleHost
import com.chesslab.tracker.record.RecordingHooks
import com.chesslab.tracker.record.RecordingSettings
import com.chesslab.tracker.record.SessionSettingsHost
import com.chesslab.tracker.record.SessionStore
import com.chesslab.tracker.record.TimelineFrame
import com.chesslab.tracker.runtime.AppPaths
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.FrameRateMode
import com.chesslab.tracker.settings.SettingsHost
import com.chesslab.tracker.settings.SettingsRepository
import com.chesslab.tracker.settings.cameraLook
import com.chesslab.tracker.speech.MoveAnnouncer
import com.chesslab.tracker.speech.androidSpeechEngine
import com.chesslab.tracker.sync.SETTLE_MINUTES
import com.chesslab.tracker.sync.syncNow
import com.chesslab.tracker.ui.debug.DebugSessionHost
import com.chesslab.tracker.ui.debug.debugSession
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.games.RecordingSettingsHost
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.io.File

private const val PREVIEW_MAX_SIDE = 640

/** `GameSessionWiring.DEFAULT_PROFILE`, which is private in `:tracker-runtime` and stays there. */
private const val CAPTURE_DEFAULT_PROFILE = "default"
private const val SOURCE_PROFILE_TAG = "chesslabSourceProfile"
private const val SOURCE_PROFILE_DRAIN_MS = 250L

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
    private lateinit var frames: CameraFrameBus<Bitmap>
    private lateinit var binder: TrackerBinder
    private lateinit var notification: TrackerNotification
    private lateinit var speech: MoveAnnouncer
    private lateinit var games: GameSessionController
    private lateinit var diagnostics: DiagnosticsLog
    private lateinit var recordingSettings: RecordingSettings
    private lateinit var recording: RecordingBundleHost
    private lateinit var sourceWorkProfile: SourceWorkProfileController

    /** Read once: `PackageManager` is a binder call and the answer cannot change under us. */
    private val host by lazy { androidHostIdentity(this) }

    private val calibration by lazy { calibrationStore(this) }

    private val cameraRate = CameraRate()
    private val timings = StageTimings(logLine = AndroidTrackerLog(PERF_TAG)::debug)
    private val cnnProbe = CnnRuntimeProbe()

    /** The classifier opens the model [chooseModel] read the spec from — never a newer setting. */
    private val attachCnn: () -> Attached = {
        val app = modelChoice ?: settings.appSettings.value
        openClassifier(cnnAssetsFrom(this, app.modelDir, app.modelAsset), app, cnnProbe)
    }

    // The factory is inline because it has exactly one call site and `StackSwitch` already says
    // what it is for; the lambda is lazy, so the `lateinit` session parts are wired by then.
    private val stacks =
        StackSwitch {
            val gridArm = modelSpec?.coverageOutput != true
            TrackerStack(
                TrackerSeed(
                    engineConfig(settings.config.value, geometry, modelSpec, settings.appSettings.value.frameRate),
                    ::geometry,
                    corners,
                    publisher.lastFen ?: STARTPOS,
                    {
                        diagnostics.offer(it)
                        recording.decision(it)
                    },
                    { from, to, tsS ->
                        diagnostics.state(from, to, tsS)
                        recording.state(from, to, tsS)
                    },
                    androidTrackerLogs,
                    { geo, cfg, store, frames, boards -> cameraStages(geo, cfg, store, frames, boards, gridArm = gridArm) },
                    runGridOcclusion = gridArm,
                    // Aus der `config.json` des Modells, nicht aus einer Einstellung: ein mit
                    // CLAHE trainiertes Modell ohne CLAHE zu bedienen ist eine stille
                    // Train/Serve-Luecke, und die faellt niemandem auf.
                    cropClahe =
                        modelSpec?.takeIf { it.claheClip > 0.0 }?.let {
                            CropClahe(it.claheClip, it.claheTile, it.claheMinMean, it.claheMaxMean)
                        },
                    // Read here, once, like every other AppSettings value: a change restarts the
                    // stack, which is what `StackSwitch` exists for.
                    engine = settings.appSettings.value.engine,
                    nowMs = phoneEngineClock,
                    // Die Belichtungskorrektur nach dem BRETT. Der Startpunkt ist, was auf dem
                    // Schieber steht — die Regelung uebersteuert eine Einstellung des Nutzers
                    // nicht, sie fuehrt sie weiter.
                    exposure = BoardExposureGovernor(camera.look, onBrighten = ::announceBrightening),
                    focus = focus,
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

    override val cameraLook: CameraLookPort get() = focus

    override val focusTuner: FocusTuner get() = focus

    /**
     * Ein Feld hier und nicht im Stapel: ein Tracker-Neustart baut den Stapel neu, das gemessene
     * Optimum und seine Aufsicht ueberleben ihn.
     */
    private val focus by lazy {
        BoardFocusGovernor(
            camera.look,
            onSoft = ::announceSoftFocus,
            onSample = { Log.i("chesslabFocus", "sample focus=${it.focus} sharpness=${it.sharpness}") },
        )
    }

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
     * contributes the crop.
     *
     * **Assignment applies the model's crop** — the setter, not the three call sites, so forgetting
     * it is not expressible. That matters because forgetting is invisible: the crops keep coming,
     * cut from a slightly different box than the model was trained on. The stored profile carries a
     * crop of its own (`CropParams`) and the live path must not use it: the size that has to be
     * right is the one the ONNX graph takes (`preprocessInto` requires the crops to already BE that
     * size), and the pads that have to be right are the ones the model was trained on (specs/45).
     */
    @Volatile
    private var geometry = BoardGeometry()
        set(value) {
            field = value.withCropOf(modelSpec)
        }

    /**
     * What the model declares it takes (`infer_size` since specs/22, `pad_side`/`pad_up` since
     * specs/45), or null while nothing could be read.
     *
     * Null keeps [BoardGeometry]'s defaults — calibration runs long before a classifier attaches
     * and must never depend on one.
     */
    @Volatile
    private var modelSpec: ModelSpec? = null
    private var modelChoice: AppSettings? = null

    /** Spec and classifier are two reads of the same file; one snapshot keeps them the same model. */
    private suspend fun chooseModel() {
        val app = settings.appSettings.value
        modelChoice = app
        modelSpec = declaredModelSpec(this, app)
    }

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
     *
     * The game is saved HERE and not only in `onDestroy` for the same reason: a stop from the shade
     * with the app in the background leaves the composition bound until it next resumes, and a game
     * that only reaches disk on `onDestroy` is a game a process kill takes with it.
     */
    private fun endService() {
        camera.stop()
        cameraRunning.value = false
        games.endAndSave()
        // Clearing the run switch is what makes the composition let go: while it is bound with
        // `BIND_AUTO_CREATE` the `stopSelf` below only queues the death.
        TrackerRun.onStopped()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        TrackerRun.onStopped()
        // The repository outlives us; the lambda it holds captures this service, so leaving it in
        // place is a leak of everything the service owns.
        settings.submit = {}
        DebugSessionHost.publish(null)
        sourceWorkProfile.close()
        TrackerRestartHost.publish(null)
        GameSessionHost.publish(null)
        CaptureRecorderHost.publish(null)
        // The service IS the session: stopping it ends the game rather than losing it. A game with
        // no moves saves nothing, so a start/stop cycle still leaves the library alone.
        games.endAndSave()
        // The PRODUCER first, and `close` waits for the analyzer to leave: everything below releases
        // memory the callback reads — the pipeline's Mats, the recording's timeline.
        speech.close()
        camera.close()
        recording.close()
        stacks.close()
        frames.close()
        // After the stack, so the last rows of the session it just tore down are still accepted.
        diagnostics.close()
        super.onDestroy()
    }

    /** The long-lived half. Nothing here is rebuilt by a restart — see the class doc. */
    @Suppress("LongMethod")
    private fun wireSession() {
        publisher = StatusPublisher(lifecycleScope, timings, cameraRate)
        // Before the stack, which is wired to its sink at construction. Session-lived on purpose:
        // a tracker restart is a new run header in the same file, not a new file.
        diagnostics = DiagnosticsLog(diagnosticsDir(filesDir), lifecycleScope)
        // The process's repository, not one of ours: it is read and written by the settings screen
        // with no tracker running, and two over the same DataStore would be two truths.
        settings = SettingsHost.get(this)
        sourceWorkProfile =
            SourceWorkProfileController(
                available = BuildConfig.DEBUG,
                header = ::sourceWorkProfileHeader,
            )
        settings.submit = {
            // The config the ENGINE gets, never the stored one — see [onMeasuredBoard].
            val cfg = engineConfig(settings.config.value, geometry, modelSpec, settings.appSettings.value.frameRate)
            stacks.current?.host?.submit(EngineAction.UpdateConfig(cfg))
        }
        camera =
            TrackerCamera(
                this,
                cameraRequestFor(settings.appSettings.value.resolutionMode, settings.appSettings.value.frameRate),
                { image, delivered ->
                    binder.deliveredSize = delivered
                    publisher.cameraHealth = camera.cameraState.value
                    // Here, not in the coordinator: this is the last point that sees EVERY delivered
                    // frame, including the ones dropped below while a restart swaps the stack.
                    publisher.onCameraFrame()
                    // Dropped, not queued, while a restart swaps the stack: `StackSwitch` detaches
                    // before it closes, so this is the window in which there is nothing to run.
                    stacks.current?.coordinator?.onFrame(image, delivered)
                    recording.frame(
                        TimelineFrame(
                            image.imageInfo.timestamp,
                            SystemClock.elapsedRealtimeNanos(),
                            System.currentTimeMillis(),
                            delivered.width,
                            delivered.height,
                            delivered.rotationDegrees,
                            publisher.lastFen,
                            publisher.status.value?.state,
                            publisher.corners,
                            publisher.status.value?.motion,
                        ),
                    )
                },
                onVideoAvailability = { size, error -> recording.videoAvailability(size, error) },
            )
        frames =
            CameraFrameBus<Bitmap>(
                camera.cameraState,
                lifecycleScope,
                { bgrToBitmap(it, PREVIEW_MAX_SIDE) },
                AndroidTrackerLog("chesslabFrames"),
            )
        binder =
            TrackerBinder(publisher, frames, settings, cnn, { stacks.current?.host?.submit(it) }, this, torch)
        DebugSessionHost.publish(
            debugSession(
                status = publisher.status,
                cnnState = cnn,
                settings = settings,
                onDebugEnabled = ::setDebugEnabled,
                workProfilingAvailable = sourceWorkProfile.available,
                workProfilingEnabled = sourceWorkProfile.enabled,
                onWorkProfilingEnabled = ::setSourceWorkProfilingEnabled,
                workProfileReport = sourceWorkProfile::report,
                crops = { stacks.current?.cropTap?.latest },
                runtime = cnnProbe::info,
                retry = { stacks.current?.let { it.observer.retryAttach(attachCnn) } },
            ),
        )
        TrackerRestartHost.publish(binder)
        // 08c: speech collects the same events off `Dispatchers.Default`; it opens no speech engine
        // until an announcement is actually due, so it costs nothing while disabled.
        // `chesslabSpeech`: one line when a commit is handed to the speaker, one when that
        // utterance becomes audible. The two ends of the leg the replay cannot see.
        val speechLog = androidTrackerLogs("chesslabSpeech")
        speech =
            MoveAnnouncer(
                lifecycleScope,
                androidSpeechEngine(this) { speechLog.info("audible after $it ms") },
                settings,
            ) { san, queuedMs -> speechLog.info("queued $san in $queuedMs ms") }
                .also { it.attach(publisher.events) }
        cnnProbe.observations = { stacks.current?.observations ?: 0L }
        // Pulled like the other two: the geometry moves on every calibration and the panel must
        // show the box the crops are being cut with NOW, not the one they were cut with at wiring.
        cnnProbe.crop = { cropLine(modelSpec, geometry) }
        // 08a's recorder, in the SESSION half: it must outlive both the UI and a tracker restart.
        recordingSettings = RecordingSettingsHost.get(this)
        recording = RecordingBundleHost(camera, recordingSettings, File(filesDir, "sessions"), lifecycleScope)
        // `settings.json` beside the recording: the config and model the session ACTUALLY ran.
        // 2026-08-13-19-34-23 could not answer "was handTolerantCells on?" — the phone wrote
        // neither its TrackerConfig nor its model choice anywhere (TODO 2026-08-14).
        val sessionSettings =
            SessionSettingsHost(
                BuildStamp(BuildConfig.VERSION_NAME, BuildConfig.VERSION_CODE.toLong()),
                { settings.appSettings.value },
                // The config the ENGINE runs, measured boardSize included — the stored knobs
                // alone would claim config.py's 1600 while the profile served something else.
                { engineConfig(settings.config.value, geometry, modelSpec, settings.appSettings.value.frameRate) },
            )
        settings.config
            .onEach { sessionSettings.configChanged(onMeasuredBoard(it, geometry)) }
            .launchIn(lifecycleScope)
        games =
            wireGameSession(
                AppPaths(filesDir),
                recordingSettings,
                lifecycleScope,
                frames,
                publisher,
                calibration,
                // The end of a recording is the moment the PC can have it — see `SyncWorker`.
                RecordingHooks({
                    recording.opened(it)
                    sessionSettings.opened(it.dir)
                }, {
                    sessionSettings.finished()
                    recording.finished()
                    syncNow(this, SETTLE_MINUTES)
                }, { camera.videoFailure }),
            )
        GameSessionHost.publish(games)
        // Targeted capture drives the SAME recorder without a game (plan/04-capture). The profile
        // name is collected here because `CalibrationStore.profile` is a cold Flow and
        // `wireGameSession` keeps its own copy inside `:tracker-runtime`.
        val captureProfile = MutableStateFlow(CAPTURE_DEFAULT_PROFILE)
        calibration.profile
            .onEach { captureProfile.value = (it as? ProfileLoad.Ok)?.profile?.name ?: CAPTURE_DEFAULT_PROFILE }
            .launchIn(lifecycleScope)
        CaptureRecorderHost.publish(
            LiveCaptureRecorder(
                LiveCaptureSource(frames::latestCalibrationFrame, { publisher.status.value?.corners }, { null }),
                SessionStore(File(filesDir, "sessions")),
                captureProfile::value,
                recording,
                { recordingSettings.prefs.value },
            ),
        )
    }

    /** Persisted truth first, then the stack, then the camera — a frame with no stack is wasted. */
    private suspend fun start() {
        settings.awaitLoaded()
        camera.setVideoEnabled(recordingSettings.load().enabled)
        // The saved picture, straight onto the camera. The port holds it as a WANT even before a
        // device is bound and re-asserts it on every rebind, so this is the only place the stored
        // value has to be handed over.
        camera.look.setLook(settings.appSettings.value.cameraLook())
        // Before the geometry, because the geometry follows it.
        chooseModel()
        geometry = adoptStoredOrientation(calibration, settings)
        swapStack()
        // Before the bind, so the FIRST binding already asks for the persisted mode instead of
        // binding at the default and immediately rebinding.
        camera.retarget(cameraRequestFor(settings.appSettings.value.resolutionMode, settings.appSettings.value.frameRate))
        camera.bind(this)
        publisher.events.onEach(::onEvent).launchIn(lifecycleScope)
        recordingSettings.prefs
            .onEach {
                camera.setVideoEnabled(it.enabled)
                // Arm the pre-roll encoder as soon as recording is wanted; the ring must already
                // be rolling when the first move commits. No-op while disabled or camera-less.
                recording.armVideo()
            }.launchIn(lifecycleScope)
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
            // `modelDir`/`modelAsset` are restart-required knobs, so the crop the model declares is
            // re-read here for the same reason the camera request is: the next stack must crop for
            // the next model. Switching from the 96 px model to the 80 px one and keeping 96 px
            // crops would kill the first observation of the new stack.
            chooseModel()
            geometry = calibration.applyOrientation(settings.appSettings.value.orientation.whitePov)
            swapStack()
            camera.retarget(cameraRequestFor(settings.appSettings.value.resolutionMode, settings.appSettings.value.frameRate))
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
                            engineConfig(settings.config.value, geometry, modelSpec, settings.appSettings.value.frameRate),
                            modelSpec,
                            // The pads the crops are REALLY cut at, so a legacy model shows up as a
                            // profile value nobody chose rather than as an absent field (specs/45).
                            cropLine(modelSpec, geometry),
                            cnnProbe.info(),
                            host,
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

    private fun sourceWorkProfileHeader(): String =
        buildString {
            appendLine("chesslab Android source-work profile")
            appendLine("app: ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE}) debug=${BuildConfig.DEBUG}")
            appendLine("device: ${Build.MANUFACTURER} ${Build.MODEL} (${Build.DEVICE})")
            appendLine("Android: ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
            append("ABIs: ${Build.SUPPORTED_ABIS.joinToString()}")
        }

    /** Stop is also an adb-friendly export path; each row remains below logcat's line limit. */
    private fun setSourceWorkProfilingEnabled(on: Boolean) {
        sourceWorkProfile.setEnabled(on)
        if (!on) {
            lifecycleScope.launch {
                // Let analyzer/observer spans that entered before the tap close into the retained
                // probe before emitting the adb export.
                delay(SOURCE_PROFILE_DRAIN_MS)
                sourceWorkProfile.report()?.lineSequence()?.forEach { Log.i(SOURCE_PROFILE_TAG, it) }
            }
        }
    }

    private fun onEvent(event: TrackerEvent) {
        recording.event(event)
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

    override fun applyCalibration(
        geom: BoardGeometry,
        pts: FloatArray,
        profileName: String,
    ) {
        geometry = geom
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

    /**
     * Dass die Regelung aufhellt, gehoert auf den Schirm: sie veraendert das Bild, aus dem der
     * Tracker liest, und wer am Brett sitzt soll nicht raten, warum es heller geworden ist.
     */
    private fun announceBrightening(notice: ExposureNotice) {
        say(getString(R.string.tracking_exposure_brightening, "%+.1f".format(notice.evAboveBase)))
    }

    /**
     * Ein weich gewordenes Bild ist die Fehlerquelle, die diese Aufnahmen unbrauchbar gemacht hat —
     * still weiterlaufen heisst, es hinterher am Datensatz zu merken.
     */
    private fun announceSoftFocus(notice: FocusNotice) {
        val share = (100.0 * notice.sharpness / notice.reference.coerceAtLeast(1f)).toInt()
        say(getString(R.string.tracking_focus_soft, share))
    }

    private fun say(text: String) {
        lifecycleScope.launch(Dispatchers.Main) {
            Toast.makeText(this@TrackerService, text, Toast.LENGTH_LONG).show()
        }
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

/** The three corrections between the STORED knobs and what the engine runs. One place, four callers. */
private fun engineConfig(
    stored: TrackerConfig,
    geometry: BoardGeometry,
    spec: ModelSpec?,
    rate: FrameRateMode,
): TrackerConfig = onMeasuredBoard(stored, geometry).withCoverageGateOf(spec).withMotionThrFor(rate)

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
            ModelSpec.parse(cnnAssetsFrom(context, app.modelDir, app.modelAsset).stage().configJson)
        }.getOrNull()
    }

/**
 * Die Verdeckungsschwelle des MODELLS, wenn es eine nennt — sie folgt aus dessen Guete und ist
 * deshalb keine Engine-Konstante (`docs/occlusion-gate.md`).
 */
private fun TrackerConfig.withCoverageGateOf(spec: ModelSpec?): TrackerConfig = spec?.coverageGate?.let { copy(pOccludedThr = it) } ?: this

/**
 * `motionThr` scaled to the frame rate: it is a percent of pixels changed against the PREVIOUS
 * frame, so it silently means "motion per frame period".
 *
 * 273/55/102 at 15 fps against the baseline's 303/25/6, and 312/16/30 once scaled; 30 fps scales
 * by one, so every number measured there stands (`docs/battery.md`).
 */
private fun TrackerConfig.withMotionThrFor(rate: FrameRateMode): TrackerConfig =
    if (rate == REFERENCE_RATE) this else copy(motionThr = motionThr * REFERENCE_RATE.fps / rate.fps)

/** The rate every `motionThr` on record was measured at. Scaling is relative to it. */
private val REFERENCE_RATE = FrameRateMode.FPS30
