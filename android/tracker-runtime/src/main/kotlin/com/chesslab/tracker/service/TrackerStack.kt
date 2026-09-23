package com.chesslab.tracker.service

import com.chesslab.cnn.CnnConfig
import com.chesslab.cnn.CnnRecovery
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.EngineAction
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.CropClahe
import com.chesslab.geometry.allSquares
import com.chesslab.tracker.camera.ExposureGovernor
import com.chesslab.tracker.camera.FocusGovernor
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.cnn.CnnObserver
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.log.NoTrackerLogs
import com.chesslab.tracker.log.TrackerLogs
import com.chesslab.tracker.pipeline.CropFrameStore
import com.chesslab.tracker.pipeline.FramePipeline
import com.chesslab.tracker.pipeline.FrameSizeGuard
import com.chesslab.tracker.pipeline.FrameStages
import com.chesslab.tracker.pipeline.StageTimings
import com.chesslab.tracker.settings.SettingsRepository
import com.chesslab.tracker.settings.withLiveKnobsOf
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import org.opencv.core.Mat
import java.util.Locale
import java.util.concurrent.atomic.AtomicLong

/** The stack owns the crop store and preview buses it passes in, rather than letting the host invent its own. */
typealias StagesFactory<T> = (BoardGeometry, TrackerConfig, CropFrameStore, (Mat) -> Unit, (Mat) -> Unit) -> FrameStages<T>

/** A restart applies the construction-time knobs and is not a reset: `docs/tracker-runtime-service.md`. */
@Suppress("LongParameterList")
class TrackerSeed<T>(
    val config: TrackerConfig,
    /** The LIVE holder — calibration outlives a restart, and live-align reads it per tick. */
    val geometry: () -> BoardGeometry,
    /** Null only before the first calibration or marker detection. */
    val corners: FloatArray?,
    val startFen: String,
    /** The session-lived writer: a restart that forgot it would write its rows to nobody. */
    val onDecision: (DebugDecision) -> Unit,
    /** Decision rows cannot answer "why did that move take a while"; see `TrackerEngine`'s `stateSink`. */
    val onState: (String, String, Double) -> Unit = { _, _, _ -> },
    /** The stack owns the CHANNEL NAMES — what `adb logcat -s` is pointed at, so behaviour, not decoration. */
    val logs: TrackerLogs = NoTrackerLogs,
    /** The one thing about a frame this stack cannot know by itself. */
    val stages: StagesFactory<T>,
    val runGridOcclusion: Boolean = true,
    /** From the run's `config.json`, not a setting. */
    val cropClahe: CropClahe? = null,
    /** The wall clock for a camera; the VIDEO's clock for a replay. */
    val nowMs: () -> Long = System::currentTimeMillis,
    /** `null` is a dedicated thread (the phone); a direct dispatcher lands a replay's snapshots on video time. */
    val observerDispatcher: CoroutineDispatcher? = null,
    /** Desktop-only; independent square crops retain encounter order. */
    val parallelCrops: Boolean = false,
    /** Nur das Handy setzt das: ein Replay stellt keine Kamera. */
    val exposure: ExposureGovernor = ExposureGovernor.NONE,
    val focus: FocusGovernor = FocusGovernor.NONE,
    /** Absence keeps the phone and ordinary replay path unchanged. */
    val cachedVisual: ((Long) -> CropFrameStore.CachedVisual?)? = null,
    val observationSink: ((CnnSnapshot) -> Unit)? = null,
    val priorLambda: Double = 4.0,
    /** False exists only to reproduce the historical prior in replays. */
    val priorSafety: Boolean = true,
    val cachedAlignment: ((Long) -> FloatArray?)? = null,
    val alignmentSink: ((Long, FloatArray) -> Unit)? = null,
    val cachedMarkerDetections: ((Long) -> Map<Int, DoubleArray>)? = null,
)

/** Everything a restart tears down and rebuilds; what stays outside: `docs/tracker-runtime-service.md`. */
class TrackerStack<T>(
    seed: TrackerSeed<T>,
    settings: SettingsRepository,
    publisher: StatusPublisher,
    frames: CameraFrameBus<*>,
    private val timings: StageTimings,
    parent: CoroutineScope,
    openClassifier: () -> Attached,
) : AutoCloseable {
    /** Cancelled with the stack: no collector outlives its stack. */
    val scope = CoroutineScope(parent.coroutineContext + SupervisorJob())

    private val cropStore = CropFrameStore(seed.cachedVisual)
    private val guard = FrameSizeGuard()
    private val pipeline =
        FramePipeline(
            seed.config,
            seed.stages(seed.geometry(), seed.config, cropStore, frames::offer, frames::offerBoard),
            cropStore,
            guard,
            timings,
        )

    val host =
        engineHost(
            seed.config,
            CnnRecovery(cnnConfig(seed.config)),
            seed.startFen,
            EngineHooks(seed.onDecision, stateSink(seed)) { pipeline.onConfigChanged(it) },
            // Its own channel: `adb logcat -s chesslabDecision` is move-by-move provenance with nothing else in it.
            log = seed.logs("chesslabDecision"),
        )

    /** Their OWN channel (`chesslabState` is then the timeline alone) plus the host's structured sink. */
    private fun stateSink(seed: TrackerSeed<T>): (String, String, Double) -> Unit {
        val log = seed.logs("chesslabState")
        return { from, to, tsS ->
            log.info("%s -> %s at %.2fs".format(from, to, tsS))
            seed.onState(from, to, tsS)
        }
    }

    /** Sie stirbt mit dem Stack. Sie meldet sich beim Anlegen: eine still ausbleibende Stufe kostet nur Punkte. */
    private val clahe =
        seed.cropClahe?.also {
            seed.logs("chesslabCnn").info("crop CLAHE aktiv: $it")
        }

    /** Inert until the debug switch arms it; the service re-arms it after a restart. */
    val cropTap =
        DebugCropTap(
            cropFrameSource(cropStore, seed.parallelCrops, seed.runGridOcclusion, clahe),
        )

    private val observed = AtomicLong()
    private val observationSink = seed.observationSink

    /** A restart legitimately restarts the count. */
    val observations: Long get() = observed.get()

    /** The 2026-08-08 cadence regression (67 -> 26 plies) was invisible because every one of these dropped silently. */
    fun dropLine(): String =
        "dropped[markers=${pipeline.skippedWaitingMarkers} dark=${pipeline.skippedDark} " +
            "obsOff=${observer.gateOff} obsBusy=${observer.gateBusy} obsPaused=${observer.gatePaused} " +
            "obsInterval=${observer.gateInterval} " +
            "obsUnwanted=${observer.gateUnwanted} " +
            "cropOverwritten=${cropStore.overwritten} snapQueue=${host.snapshotsDropped} actionQueue=${host.actionsDropped}]"

    private val obsLog = seed.logs("chesslabObs")
    private val occludedThr = seed.config.pOccludedThr

    /** The number Hebel 2 gates on: a missed move whose window holds `occl=0` lines wasted a clean look. */
    private fun submitObserved(snap: CnnSnapshot) {
        observationSink?.invoke(snap)
        observed.incrementAndGet()
        val occluded = allSquares().count { snap.obs.pOccluded(it) > occludedThr }
        // Coverage models report zero here: running both arms wastes a full-board pass.
        val grid = "0x%016x".format(snap.gridOccluded)
        obsLog.info(
            "obs frame=${snap.seq} t=${"%.2f".format(Locale.US, snap.tsMs / MS_PER_S_D)} occl=$occluded grid=$grid",
        )
        host.submit(snap)
    }

    val observer =
        if (seed.observerDispatcher == null) {
            CnnObserver(
                source = cropTap,
                fen = { publisher.lastFen },
                onSnapshot = ::submitObserved,
                priorLambda = seed.priorLambda,
                priorSafety = seed.priorSafety,
                log = seed.logs("chesslabCnn"),
                // The ENGINE's clock: a second clock made the same file commit 23 plies on one run and 25 on the next.
                nowMs = seed.nowMs,
            )
        } else {
            CnnObserver(
                source = cropTap,
                fen = { publisher.lastFen },
                onSnapshot = ::submitObserved,
                priorLambda = seed.priorLambda,
                priorSafety = seed.priorSafety,
                log = seed.logs("chesslabCnn"),
                nowMs = seed.nowMs,
                dispatcher = seed.observerDispatcher,
            )
        }

    init {
        // The pull half of the CNN path: the observer asks before it spends an inference.
        observer.demandFrom(host::wantsCnnRead)
        // Set here: the pipeline is built before the engine that answers for it.
        pipeline.reads = host.reads
    }

    val coordinator =
        TrackerCoordinator(
            pipeline,
            host,
            publisher,
            frames,
            observer,
            // Inline is determinism AND what keeps the desktop single-threaded through OpenCV.
            LiveAlign(
                scope,
                seed.geometry,
                // THIS RUN's config: these are restart-only, and the repository served its DEFAULT otherwise.
                { seed.config.withLiveKnobsOf(settings.config.value) },
                { pipeline.corners = it },
                seed.logs("chesslabTracker"),
                dispatcher = seed.observerDispatcher ?: Dispatchers.Default,
                cachedCorners = seed.cachedAlignment,
                cornerSink = seed.alignmentSink,
                cachedMarkers = seed.cachedMarkerDetections,
                onRectificationChanged = { host.submit(EngineAction.RectificationChanged) },
                calibrated = seed.corners,
            ),
            timings,
            seed.nowMs,
            seed.exposure,
            seed.focus,
            seed.logs("chesslabNote")::info,
        )

    init {
        pipeline.corners = seed.corners
        timings.extras = ::dropLine
        // NOTHING re-applies them: a collector once re-enabled a replay's `set:cnnVerify=false` a tick after start.
        observer.setIntervalS(seed.config.observerIntervalS)
        observer.setEnabled(seed.config.cnnVerify)
        wireCnnAvailability(observer, host, scope)
        // Asynchronous and LOUD on failure: a silent one let the tracker run diff-only for a whole session.
        observer.attach(openClassifier)
        observer.state.onEach { publisher.cnnState = it }.launchIn(scope)
    }

    /** Observer first: it holds the only thread and native session, and must stop before the pipeline it crops from. */
    override fun close() {
        // The timings object outlives the stack on the phone; a closed stack must not write onto the next one's line.
        timings.extras = null
        timings.onFeedStopped()
        scope.cancel()
        observer.close()
        pipeline.close()
        clahe?.close()
    }
}

private const val MS_PER_S_D = 1000.0

/** Nur ein gescheiterter Attach nimmt den Evaluator zurueck — [CnnState.Attaching] darf es NICHT, sonst committen
 *  die ersten Frames jeder Sitzung diff-only statt zu verifizieren. */
fun wireCnnAvailability(
    observer: CnnObserver,
    host: EngineHost,
    scope: CoroutineScope,
) {
    observer.state
        .onEach {
            when (it) {
                is CnnState.Failed -> host.submit(EngineAction.CnnAvailability(false))
                is CnnState.Ready -> host.submit(EngineAction.CnnAvailability(true))
                else -> Unit
            }
        }.launchIn(scope)
}

/** The order IS the contract — **detach, close, build**; on a phone the wrong order is an OOM. */
class StackSwitch<T : AutoCloseable>(
    private val build: () -> T,
) {
    @Volatile
    var current: T? = null
        private set

    fun restart() {
        val old = current
        current = null
        old?.close()
        current = build()
    }

    fun close() {
        val old = current
        current = null
        old?.close()
    }
}

object TrackerRestartHost {
    private val current = MutableStateFlow<TrackerRestart?>(null)

    val restart: StateFlow<TrackerRestart?> = current

    fun publish(restart: TrackerRestart?) {
        current.value = restart
    }
}

fun interface TrackerRestart {
    fun restartTracker()
}

/** Rebuilt with the stack. Sichtbar, weil der Fuzzer denselben Evaluator anhaengt — eine Kopie liefe still auseinander. */
fun cnnConfig(config: TrackerConfig) =
    CnnConfig(
        confThr = config.cnnConfThr,
        minAgreement = config.cnnMinAgreement,
        marginSquares = config.cnnMarginSquares,
        plyCostSquares = config.cnnPlyCostSquares,
        minConfidentBoard = config.minConfidentBoard,
        minConfidentRecovery = config.minConfidentRecovery,
        recoveryMaxPlies = config.recoveryMaxPlies,
        colorAxis = config.cnnColorAxis,
    )
