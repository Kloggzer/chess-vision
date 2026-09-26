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
import com.chesslab.engine.api.atFrameRate
import com.chesslab.geometry.BoardGeometry
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
import com.chesslab.tracker.cnn.cropClaheFor
import com.chesslab.tracker.cnn.withCoverageGateOf
import com.chesslab.tracker.diagnostics.DiagnosticsLog
import com.chesslab.tracker.diagnostics.androidHostIdentity
import com.chesslab.tracker.diagnostics.diagnosticsDir
import com.chesslab.tracker.diagnostics.runStartOf
import com.chesslab.tracker.games.GameSessionController
import com.chesslab.tracker.geometry.CalibrationStoreHost
import com.chesslab.tracker.geometry.ProfileLoad
import com.chesslab.tracker.geometry.cropLine
import com.chesslab.tracker.geometry.withCropOf
import com.chesslab.tracker.hints.HintHost
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
import com.chesslab.tracker.settings.withLiveKnobsOf
import com.chesslab.tracker.speech.MoveAnnouncer
import com.chesslab.tracker.speech.SpeakerHost
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

private const val PREVIEW_MAX_SIDE = 640
private const val TAG = "chesslabTracker"

private const val CAPTURE_DEFAULT_PROFILE = "default"
private const val SOURCE_PROFILE_TAG = "chesslabSourceProfile"
private const val SOURCE_PROFILE_DRAIN_MS = 250L

/** An attach is a synchronous ONNX session open, normally a second or two. */
private const val ATTACH_HEADER_WAIT_MS = 30_000L

/** Constructs, wires and closes — no tracker logic. Two lifetimes: the **session** (camera, buses,
 *  settings, recording) lasts as long as the service; the **stack** (pipeline, engine, observer) is
 *  rebuilt by [restartTracker] to apply the construction-time knobs. */
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

    private val host by lazy { androidHostIdentity(this) }

    private val calibration by lazy { CalibrationStoreHost.of(this) }

    private val cameraRate = CameraRate()

    private val rateRetune = RateRetune()

    /** Der ROHE Stand SAMT Bildrate, mit dem der laufende Stack gebaut wurde ([liveConfig]). */
    private var runSeed: RunSeed? = null
    private val timings = StageTimings(logLine = AndroidTrackerLog(PERF_TAG)::debug)
    private val cnnProbe = CnnRuntimeProbe()

    /** Opens the model [chooseModel] read the spec from — never a newer setting. */
    private val attachCnn: () -> Attached = {
        val app = modelChoice ?: settings.appSettings.value
        openClassifier(cnnAssetsFrom(this, app.modelDir, app.modelAsset), app, cnnProbe)
    }

    private val stacks =
        StackSwitch {
            val gridArm = gridArmFor(modelSpec)
            runSeed = RunSeed(settings.config.value, settings.appSettings.value.frameRate)
            TrackerStack(
                TrackerSeed(
                    engineConfig(settings.config.value, geometry, modelSpec, settings.appSettings.value.frameRate, cameraRate.fps),
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
                    cropClahe = cropClaheFor(modelSpec),
                    nowMs = phoneEngineClock,
                    // Der Startpunkt ist, was auf dem Schieber steht: die Regelung fuehrt eine Nutzereinstellung weiter.
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

    private val cnn = MutableStateFlow<CnnState>(CnnState.Off)

    private val cameraRunning = MutableStateFlow(true)

    override val cameraOn: StateFlow<Boolean> = cameraRunning.asStateFlow()

    override val cameraLook: CameraLookPort get() = focus

    override val focusTuner: FocusTuner get() = focus

    /** Hier und nicht im Stapel: das gemessene Optimum und seine Aufsicht ueberleben einen Neustart. */
    private val focus by lazy {
        BoardFocusGovernor(
            camera.look,
            onSoft = ::announceSoftFocus,
            onSample = { Log.i("chesslabFocus", "sample focus=${it.focus} sharpness=${it.sharpness}") },
        )
    }

    private val torch by lazy {
        TorchSwitch(
            lamp = camera.torch,
            scope = lifecycleScope,
            baseline = { stacks.current?.host?.submit(EngineAction.CaptureBaseline) },
        )
    }

    /** Assignment applies the model's crop — in the setter, so forgetting it is not expressible, and it would
     *  be invisible: crops keep coming, from a box the model was not trained on. The profile's own
     *  `CropParams` must not be used live: the ONNX graph's size and the trained pads are what count. */
    @Volatile
    private var geometry = BoardGeometry()
        set(value) {
            field = value.withCropOf(modelSpec)
        }

    /** Null keeps [BoardGeometry]'s defaults: calibration runs long before a classifier attaches. */
    @Volatile
    private var modelSpec: ModelSpec? = null

    // Beide Haelften des Schnappschusses kreuzen den Thread: ohne `@Volatile` faellt `attachCnn`
    // auf die AKTUELLEN Einstellungen zurueck und oeffnet ein anderes Modell als die `modelSpec`
    // daneben, mit der die Crops geschnitten werden (`ModelSnapshotVisibilityTest`).
    @Volatile
    private var modelChoice: AppSettings? = null

    /** Spec and classifier are two reads of one file; one snapshot keeps them the same model. */
    private suspend fun chooseModel() {
        val app = settings.appSettings.value
        modelChoice = app
        modelSpec = declaredModelSpec(this, app)
    }

    @Volatile
    private var corners: FloatArray? = null

    @Volatile
    private var debugOn = false

    private var moves = 0

    override fun onCreate() {
        super.onCreate()
        notification = TrackerNotification(this)
        // Foreground FIRST: Android 14 throws `ForegroundServiceStartNotAllowedException` otherwise.
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

    /** `START_NOT_STICKY`: a killed tracker must not re-open the camera with nobody watching. */
    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int {
        super.onStartCommand(intent, flags, startId)
        if (intent?.action == ACTION_STOP_TRACKING) endService()
        return START_NOT_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        endService()
        super.onTaskRemoved(rootIntent)
    }

    /** Only the device is handed back; stack, engine and game stay, so a resume continues the same game. */
    override fun setCameraOn(on: Boolean) {
        if (cameraRunning.value == on) return
        cameraRunning.value = on
        if (on) {
            // Foreground again first: the shade's Stop may have dropped us out of it, and Android 14 denies a
            // background service the camera. Resume is always a tap in a visible app, so this start is allowed.
            startForeground(NOTIFICATION_ID, notification.build("waiting", moves), ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA)
            camera.resume()
            // `onCameraStopped` hat den EMA verworfen; ohne das bliebe `motionThr` fuer immer auf
            // die eingestellte Rate geeicht statt auf die wirklich gelieferte.
            rateRetune.rearm()
        } else {
            camera.stop()
            publisher.onCameraStopped()
        }
        notification.post(publisher.status.value?.state, moves, on)
    }

    /** Camera FIRST: a bound client keeps the service alive past `stopSelf`, and the indicator stayed lit.
     *  The game is saved HERE too: a background stop keeps the composition bound, and a process kill
     *  would take a game that only reaches disk on `onDestroy`. */
    private fun endService() {
        camera.stop()
        cameraRunning.value = false
        games.endAndSave()
        // While bound with `BIND_AUTO_CREATE`, `stopSelf` only queues the death: this lets the composition go.
        TrackerRun.onStopped()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        TrackerRun.onStopped()
        // The repository outlives us, and its lambda captures this service: leaving it in place leaks everything.
        settings.submit = {}
        DebugSessionHost.publish(null)
        sourceWorkProfile.close()
        TrackerRestartHost.publish(null)
        GameSessionHost.publish(null)
        CaptureRecorderHost.publish(null)
        SpeakerHost.publish(null)
        // Das Kontingent haengt an `games.endAndSave()` — eine Grenze, nicht zwei. A game with no moves saves
        // nothing, so a start/stop cycle leaves the library alone.
        games.endAndSave()
        // The PRODUCER first, and `close` waits for the analyzer: everything below frees memory the callback reads.
        speech.close()
        camera.close()
        recording.close()
        stacks.close()
        frames.close()
        // After the stack, so the last rows of the session it just tore down are still accepted.
        diagnostics.close()
        super.onDestroy()
    }

    @Suppress("LongMethod")
    private fun wireSession() {
        publisher = StatusPublisher(lifecycleScope, timings, cameraRate)
        // Session-lived: a tracker restart is a new run header in the same file, not a new file.
        diagnostics = DiagnosticsLog(diagnosticsDir(filesDir), lifecycleScope)
        // The process's repository: two over the same DataStore would be two truths.
        settings = SettingsHost.get(this)
        sourceWorkProfile =
            SourceWorkProfileController(
                available = BuildConfig.DEBUG,
                header = ::sourceWorkProfileHeader,
            )
        settings.submit = { stored ->
            // Der Bezug ist der Stand des LAUFS: restart-pflichtige Felder wirkten sonst halb, und die Ableitungen
            // sind nicht idempotent.
            val cfg = liveConfig(runSeed, stored, settings.appSettings.value.frameRate, geometry, modelSpec, cameraRate.fps)
            stacks.current?.host?.submit(EngineAction.UpdateConfig(cfg))
        }
        camera =
            TrackerCamera(
                this,
                cameraRequestFor(settings.appSettings.value.resolutionMode, settings.appSettings.value.frameRate),
                { image, delivered ->
                    binder.deliveredSize = delivered
                    publisher.cameraHealth = camera.cameraState.value
                    // The last point that sees EVERY delivered frame, including those dropped during a stack swap.
                    publisher.onCameraFrame()
                    // `motionThr` ist ein Anteil gegen das VORHERIGE Bild: er skaliert mit der ECHTEN Periode (gemessen 7,5 statt 15).
                    if (rateRetune.onFrame(settings.appSettings.value.frameRate, cameraRate.fps)) {
                        settings.submit(settings.config.value)
                    }
                    // Dropped, not queued: `StackSwitch` detaches before it closes, so there is nothing to run.
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
        // `chesslabSpeech`: one line when a commit reaches the speaker, one when it becomes audible — the leg the
        // replay cannot see. No speech engine opens until an announcement is due.
        val speechLog = androidTrackerLogs("chesslabSpeech")
        // DIESELBE Stimme wie der Zugansager: ein zweiter `SpeechEngine` waere ein zweiter Audio-Fokus-Nehmer.
        val speaker = androidSpeechEngine(this) { speechLog.info("audible after $it ms") }
        SpeakerHost.publish(speaker)
        speech =
            MoveAnnouncer(lifecycleScope, speaker, settings) { san, queuedMs ->
                speechLog.info("queued $san in $queuedMs ms")
            }.also { it.attach(publisher.events) }
        cnnProbe.observations = { stacks.current?.observations ?: 0L }
        // Pulled: the geometry moves on every calibration, and the panel must show the box used NOW.
        cnnProbe.crop = { cropLine(modelSpec, geometry) }
        // SESSION half: the recorder must outlive both the UI and a tracker restart.
        recordingSettings = RecordingSettingsHost.get(this)
        recording = RecordingBundleHost(camera, recordingSettings, AppPaths(filesDir).sessions, lifecycleScope)
        // `settings.json` beside the recording: the config and model the session ACTUALLY ran.
        val sessionSettings =
            SessionSettingsHost(
                BuildStamp(BuildConfig.VERSION_NAME, BuildConfig.VERSION_CODE.toLong()),
                { settings.appSettings.value },
                // The ENGINE's config, measured boardSize included — the stored knobs would claim 1600.
                { engineConfig(settings.config.value, geometry, modelSpec, settings.appSettings.value.frameRate, cameraRate.fps) },
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
                RecordingHooks({
                    recording.opened(it)
                    sessionSettings.opened(it.dir)
                }, {
                    sessionSettings.finished()
                    recording.finished()
                    syncNow(this, SETTLE_MINUTES)
                }, { camera.videoFailure ?: recording.timelineFailure }),
                // Derselbe Ledger wie `HintController`: eine Partie OHNE Vermerk behauptet nicht, es sei nichts gewesen.
                hints = HintHost.ledger,
                // Ein Matt beendet die Partie ohne Schirm; das Kontingent blieb sonst stehen.
                alsoEnds = listOf(HintHost.controller),
            )
        GameSessionHost.publish(games)
        // `CalibrationStore.profile` is a cold Flow and `wireGameSession` keeps its own copy, so it is collected here.
        val captureProfile = MutableStateFlow(CAPTURE_DEFAULT_PROFILE)
        calibration.profile
            .onEach { captureProfile.value = (it as? ProfileLoad.Ok)?.profile?.name ?: CAPTURE_DEFAULT_PROFILE }
            .launchIn(lifecycleScope)
        CaptureRecorderHost.publish(
            LiveCaptureRecorder(
                LiveCaptureSource(frames::latestCalibrationFrame, { publisher.status.value?.corners }, { null }),
                SessionStore(AppPaths(filesDir).sessions),
                captureProfile::value,
                recording,
                camera,
                { recordingSettings.prefs.value },
            ),
        )
    }

    private suspend fun start() {
        settings.awaitLoaded()
        camera.setVideoEnabled(recordingSettings.load().enabled)
        // The port holds it as a WANT before any bind and re-asserts it on every rebind: hand it over once, here.
        camera.look.setLook(settings.appSettings.value.cameraLook())
        chooseModel()
        geometry = adoptStoredOrientation(calibration, settings)
        swapStack()
        // Before the bind, so the FIRST binding asks for the persisted mode instead of rebinding at once.
        camera.retarget(cameraRequestFor(settings.appSettings.value.resolutionMode, settings.appSettings.value.frameRate))
        camera.bind(this)
        publisher.events.onEach(::onEvent).launchIn(lifecycleScope)
        recordingSettings.prefs
            .onEach {
                camera.setVideoEnabled(it.enabled)
                recording.armVideo()
            }.launchIn(lifecycleScope)
        settings.debugEnabled.onEach { if (it) setDebugEnabled(true) }.launchIn(lifecycleScope)
    }

    /** Order: orientation to the profile, the stack swapped on the analyzer thread, the camera retargeted
     *  LAST (main thread) so no frame enters a half-built stack. The camera object is never replaced. */
    override fun restartTracker() {
        lifecycleScope.launch {
            // Model knobs are restart-required: the next stack must crop for the next model, and 96 px crops fed to
            // the 80 px model would kill its first observation.
            chooseModel()
            geometry = calibration.applyOrientation(settings.appSettings.value.orientation.whitePov)
            swapStack()
            camera.retarget(cameraRequestFor(settings.appSettings.value.resolutionMode, settings.appSettings.value.frameRate))
        }
    }

    /** On the ANALYZER thread, serialized against delivery: the rebuilt [EngineHost] latches its owning thread
     *  on its first tick — this same thread — so the ownership `check` is re-established, not defeated. */
    private fun swapStack() =
        camera.runOnAnalyzer {
            rateRetune.rearm()
            stacks.restart()
            stacks.current?.let { stack ->
                stack.cropTap.enabled = debugOn
                stack.host.submit(EngineAction.SetDebugEnabled(debugOn))
                // In the STACK's scope: in the service scope every restart left a collector on a dead observer.
                stack.observer.state
                    .onEach { cnn.value = it }
                    .launchIn(stack.scope)
                // Waits for the attach to RESOLVE: the header names the provider the runtime SELECTED, and a silent NPU
                // to CPU fall-through costs ten times the latency. A sticky failure resolves too.
                stack.scope.launch {
                    // …but not forever: a header that never arrives leaves rows with no config at all.
                    withTimeoutOrNull(ATTACH_HEADER_WAIT_MS) { stack.observer.state.first { it !is CnnState.Attaching } }
                    diagnostics.runStart(
                        // The SEEDED config, not the stored one: stored 1600 against a measured 504 stopped detection for an
                        // evening while the file agreed with nothing ([onMeasuredBoard]).
                        runStartOf(
                            settings.appSettings.value,
                            engineConfig(settings.config.value, geometry, modelSpec, settings.appSettings.value.frameRate, cameraRate.fps),
                            modelSpec,
                            cropLine(modelSpec, geometry),
                            cnnProbe.info(),
                            host,
                        ),
                    )
                }
            }
        }

    /** Arms BOTH halves of the debug payload. Only ever ARMS from here; disarming is the arming screen's. */
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

    private fun setSourceWorkProfilingEnabled(on: Boolean) {
        sourceWorkProfile.setEnabled(on)
        if (!on) {
            lifecycleScope.launch {
                delay(SOURCE_PROFILE_DRAIN_MS)
                sourceWorkProfile.report()?.lineSequence()?.forEach { Log.i(SOURCE_PROFILE_TAG, it) }
            }
        }
    }

    private fun onEvent(event: TrackerEvent) {
        recording.event(event)
        // An alarmed engine blocks every commit, so re-posting only on commits froze the notification at the
        // moment things went wrong — in the background, where it is the only channel left.
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
        // ONE owner for the board size: profile and `TrackerConfig` agreed only because both defaulted to 1600,
        // and `FrameLoop` now refuses a plane that disagrees with its boxes.
        val config = settings.config.value
        if (config.boardSize != geom.boardSize) settings.update(config.copy(boardSize = geom.boardSize))
        val requested = camera.requestedSize
        val delivered = camera.deliveredSize ?: DeliveredSize(requested.width, requested.height, 0)
        stacks.current?.coordinator?.applyCalibration(geometry, pts, profileName, delivered)
    }

    private fun announceBrightening(notice: ExposureNotice) {
        say(getString(R.string.tracking_exposure_brightening, "%+.1f".format(notice.evAboveBase)))
    }

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

/** The profile owns the board size; `FrameLoop` refuses a plane that disagrees with its boxes. Reset to
 *  defaults or a schema bump restored 1600 while the profile clamps to 320..1280, and the tracker quietly
 *  stopped noticing moves. Applied at the one funnel every config change passes through. */
private fun onMeasuredBoard(
    stored: TrackerConfig,
    geometry: BoardGeometry,
): TrackerConfig = if (stored.boardSize == geometry.boardSize) stored else stored.copy(boardSize = geometry.boardSize)

/** Der Arm hinter dem 67/67-Meilenstein: ein `== true` statt `!= true` schaltet den Phantom-Veto auf JEDEM
 *  ausgelieferten Modell ab, und nichts anderes merkt es. */
internal fun gridArmFor(spec: ModelSpec?): Boolean = spec?.coverageOutput != true

internal fun engineConfig(
    stored: TrackerConfig,
    geometry: BoardGeometry,
    spec: ModelSpec?,
    rate: FrameRateMode,
    deliveredFps: Double? = null,
): TrackerConfig =
    onMeasuredBoard(stored, geometry)
        .withCoverageGateOf(spec) { Log.w(TAG, it) }
        .copy(taintIdentityThr = TAINT_IDENTITY_THR)
        .atFrameRate(effectiveFrameRate(rate, deliveredFps))

/** Die BILDRATE gehoert dazu: sie ist restart-pflichtig und skaliert `motionThr` ueber `atFrameRate`. */
internal data class RunSeed(
    val config: TrackerConfig,
    val rate: FrameRateMode,
)

/** Der Stand des Laufs plus die zwoelf Live-Knoepfe. Die Rate kommt aus [run], nicht [storedRate]: sonst
 *  verschob eine umgestellte, nicht neu gestartete Rate `motionThr` auf eine, die die Kamera nicht liefert. */
internal fun liveConfig(
    run: RunSeed?,
    stored: TrackerConfig,
    storedRate: FrameRateMode,
    geometry: BoardGeometry,
    spec: ModelSpec?,
    deliveredFps: Double? = null,
): TrackerConfig {
    val seed = run ?: RunSeed(stored, storedRate)
    return engineConfig(seed.config.withLiveKnobsOf(stored), geometry, spec, seed.rate, deliveredFps)
}

/** Je Lauf einmal: `CameraRate` faellt beim Anhalten der Kamera auf 0, und ein Neustart baut mit einer
 *  anderen eingestellten Rate (gemessen 7,5 statt 15). */
internal class RateRetune {
    // Zwei Threads auf derselben Zahl: der Analyzer zaehlt, der Kamera-Schalter bewaffnet neu.
    @Volatile
    private var frames = 0L

    fun onFrame(
        rate: FrameRateMode,
        delivered: Double,
    ): Boolean {
        frames += 1
        return retuneDue(frames, rate, delivered)
    }

    fun rearm() {
        frames = 0L
    }
}

// Gemessen 2026-09-19: ohne das galt `Rxc8` als Hand und kostete 19,5 s. 0,5 loest es, 0,7 nicht
// mehr. Hier und nicht in `TrackerConfig`, weil die Vorgabe dort jede Python-Paritaet umwirft.
private const val TAINT_IDENTITY_THR: Double = 0.5

/** Unter diesem Anteil der eingestellten Rate gilt der Sensor als der Engpass, nicht als Jitter. */
private const val RATE_SLACK = 0.85

private const val RATE_WARMUP_FRAMES = 60L

// Genau EINMAL nach der Aufwaermzeit: bei jedem Bild zu stimmen liesse `motionThr` wandern.
internal fun retuneDue(
    frames: Long,
    rate: FrameRateMode,
    delivered: Double,
): Boolean = frames == RATE_WARMUP_FRAMES && effectiveFrameRate(rate, delivered) != rate.fps.toDouble()

// Die gelieferte Rate, sobald der Sensor die eingestellte deutlich verfehlt (7,5 statt 15). Nach OBEN
// nie — die Obergrenze kappt `pinFrameRate`.
internal fun effectiveFrameRate(
    rate: FrameRateMode,
    delivered: Double?,
): Double {
    val asked = rate.fps.toDouble()
    if (delivered == null || !delivered.isFinite() || delivered <= 0.0) return asked
    return if (delivered < asked * RATE_SLACK) delivered else asked
}

/** From the ASSET, not the attached classifier: the crops must be sized before the first observation, and
 *  a failed attach must leave a calibratable tracker. Unreadable -> null, not silent: `openClassifier`
 *  fails on the same file and publishes `CnnState.Failed`. */
private suspend fun declaredModelSpec(
    context: Context,
    app: AppSettings,
): ModelSpec? =
    withContext(Dispatchers.IO) {
        runCatching {
            ModelSpec.parse(cnnAssetsFrom(context, app.modelDir, app.modelAsset).stage().configJson)
        }.getOrNull()
    }
