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

/**
 * How this host turns its frames into stages. The stack owns the crop store and preview buses it
 * passes in, rather than letting the host invent its own.
 */
typealias StagesFactory<T> = (BoardGeometry, TrackerConfig, CropFrameStore, (Mat) -> Unit, (Mat) -> Unit) -> FrameStages<T>

/**
 * What a rebuilt tracker must NOT forget: a restart applies the 34 construction-time knobs and is
 * not a reset. What it carries, what it drops, and why detekt is suppressed: `docs/tracker-runtime-service.md`.
 */
@Suppress("LongParameterList")
class TrackerSeed<T>(
    val config: TrackerConfig,
    /** The LIVE geometry holder — calibration outlives a restart, and live-align reads it per tick. */
    val geometry: () -> BoardGeometry,
    /** Last accepted corners; null only before the first calibration or marker detection. */
    val corners: FloatArray?,
    val startFen: String,
    /**
     * Where the rebuilt engine's decision rows go — the session-lived writer, which outlives every
     * stack. A restart that forgot it would write its rows to nobody (`docs/tracker-runtime-service.md`).
     */
    val onDecision: (DebugDecision) -> Unit,
    /**
     * Where the frame loop's STATE transitions go — see `TrackerEngine`'s `stateSink` for why the
     * decision rows cannot answer "why did that move take a while".
     */
    val onState: (String, String, Double) -> Unit = { _, _, _ -> },
    /**
     * How the stack reaches a log. The host owns the platform, the stack owns the CHANNEL NAMES —
     * and those are what `adb logcat -s` is pointed at, so they are behaviour, not decoration.
     */
    val logs: TrackerLogs = NoTrackerLogs,
    /** See [StagesFactory]: the one thing about a frame this stack cannot know by itself. */
    val stages: StagesFactory<T>,
    /** False only when the successfully parsed model spec supplies its own coverage output. */
    val runGridOcclusion: Boolean = true,
    /**
     * Lokaler Kontrast je Crop, wenn das Modell ihn deklariert (`ModelSpec.claheClip`). Aus der
     * `config.json` des Laufs, nicht aus einer Einstellung (`docs/tracker-runtime-service.md`).
     */
    val cropClahe: CropClahe? = null,
    /**
     * What the engine calls now. The wall clock for a camera; the VIDEO's clock for a replay,
     * where wall time has nothing to do with when a frame was taken — see `TrackerCoordinator`.
     */
    val nowMs: () -> Long = System::currentTimeMillis,
    /**
     * Where the observer's inference runs: `null` is a dedicated thread (the phone), a direct
     * dispatcher makes a replay's snapshots land on video time (`docs/tracker-runtime-service.md`).
     */
    val observerDispatcher: CoroutineDispatcher? = null,
    /** Desktop-only acceleration: independent square crops retain encounter order. */
    val parallelCrops: Boolean = false,
    /**
     * Belichtung nach dem BRETT statt nach dem Rahmen — nur das Handy setzt das. Vorgabe
     * [ExposureGovernor.NONE]: ein Replay stellt keine Kamera.
     */
    val exposure: ExposureGovernor = ExposureGovernor.NONE,
    /** Der Fokus-Sweep und die Schaerfe-Aufsicht — wie [exposure] nur am Geraet gesetzt. */
    val focus: FocusGovernor = FocusGovernor.NONE,
    /** Offline two-pass source; absence keeps the phone and ordinary replay path unchanged. */
    val cachedVisual: ((Long) -> CropFrameStore.CachedVisual?)? = null,
    /** Records emitted observations during the visual-cache build pass. */
    val observationSink: ((CnnSnapshot) -> Unit)? = null,
    /** Legal-placement prior selected by the confirmed-move video replay A/B. */
    val priorLambda: Double = 4.0,
    /** New raw/invalid safety; false exists only to reproduce the historical prior in replays. */
    val priorSafety: Boolean = true,
    /** Offline replay of the corners LiveAlign applied after a particular processed frame. */
    val cachedAlignment: ((Long) -> FloatArray?)? = null,
    /** Records successful LiveAlign corner updates during the visual-cache build pass. */
    val alignmentSink: ((Long, FloatArray) -> Unit)? = null,
    /** Offline cold path: raw marker detections precomputed independently per alignment frame. */
    val cachedMarkerDetections: ((Long) -> Map<Int, DoubleArray>)? = null,
)

/**
 * Everything a tracker restart tears down and rebuilds — and, by omission, everything it does not.
 * What stays outside and why a swapped `StateFlow` is the failure mode: `docs/tracker-runtime-service.md`.
 */
class TrackerStack<T>(
    seed: TrackerSeed<T>,
    settings: SettingsRepository,
    publisher: StatusPublisher,
    frames: CameraFrameBus<*>,
    private val timings: StageTimings,
    parent: CoroutineScope,
    openClassifier: () -> Attached,
) : AutoCloseable {
    /** A child of the service scope, cancelled with the stack: no collector outlives its stack. */
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
            // Its own channel, not `chesslabTracker`: `adb logcat -s chesslabDecision` then gives the
            // move-by-move provenance with nothing else in it, which is the form these lines get read in.
            log = seed.logs("chesslabDecision"),
        )

    /**
     * The frame loop's state transitions: a line on their OWN channel (`adb logcat -s chesslabState`
     * is then the timeline with nothing else in it) and the host's structured sink beside it.
     */
    private fun stateSink(seed: TrackerSeed<T>): (String, String, Double) -> Unit {
        val log = seed.logs("chesslabState")
        return { from, to, tsS ->
            log.info("%s -> %s at %.2fs".format(from, to, tsS))
            seed.onState(from, to, tsS)
        }
    }

    /**
     * Gehoert dem Stack, weil sie mit ihm stirbt — [close] gibt ihre Mats zurueck. Sie sagt beim
     * Anlegen Bescheid: eine still ausbleibende Stufe faellt nur als "ein paar Punkte weniger" auf.
     */
    private val clahe =
        seed.cropClahe?.also {
            seed.logs("chesslabCnn").info("crop CLAHE aktiv: $it")
        }

    /** 07b's crop tap. Inert until the debug switch arms it; the service re-arms it after a restart. */
    val cropTap =
        DebugCropTap(
            cropFrameSource(cropStore, seed.parallelCrops, seed.runGridOcclusion, clahe),
        )

    private val observed = AtomicLong()
    private val observationSink = seed.observationSink

    /** Successful glances of THIS stack — a restart legitimately restarts the count. */
    val observations: Long get() = observed.get()

    /**
     * Everything this stack DID NOT process, by reason, in one line — the cadence regression of
     * 2026-08-08 (67 -> 26 plies) was invisible because every one of these paths dropped silently.
     */
    fun dropLine(): String =
        "dropped[markers=${pipeline.skippedWaitingMarkers} dark=${pipeline.skippedDark} " +
            "obsOff=${observer.gateOff} obsBusy=${observer.gateBusy} obsPaused=${observer.gatePaused} " +
            "obsInterval=${observer.gateInterval} " +
            "obsUnwanted=${observer.gateUnwanted} " +
            "cropOverwritten=${cropStore.overwritten} snapQueue=${host.snapshotsDropped} actionQueue=${host.actionsDropped}]"

    /** The ledger channel: one line per emitted observation, `adb logcat -s chesslabObs`-able. */
    private val obsLog = seed.logs("chesslabObs")
    private val occludedThr = seed.config.pOccludedThr

    /**
     * The observation LEDGER, one line per emitted snapshot. It is the number Hebel 2 gates on: a
     * missed move whose window holds `occl=0` lines wasted a clean look (`docs/tracker-runtime-service.md`).
     */
    private fun submitObserved(snap: CnnSnapshot) {
        observationSink?.invoke(snap)
        observed.incrementAndGet()
        val occluded = allSquares().count { snap.obs.pOccluded(it) > occludedThr }
        // `grid` remains the model-free fallback for models without a coverage output. Coverage
        // models deliberately report zero here because running both arms wastes a full-board pass.
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
                // The ENGINE's clock, not the wall clock: a second clock in one machine made the
                // same file commit 23 plies on one run and 25 on the next (`docs/tracker-runtime-service.md`).
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
        // The same bargain one layer down, and the reason it is set here rather than passed in:
        // the pipeline is built before the engine that answers for it.
        pipeline.reads = host.reads
    }

    val coordinator =
        TrackerCoordinator(
            pipeline,
            host,
            publisher,
            frames,
            observer,
            // The align detection shares the observer's dispatcher choice — inline is determinism
            // AND what keeps the desktop single-threaded through OpenCV (`docs/tracker-runtime-service.md`).
            LiveAlign(
                scope,
                seed.geometry,
                // THIS RUN's config: these three are restart-only, so the repository served its
                // DEFAULT to any host whose repository is not the run's (`docs/tracker-runtime-service.md`).
                { seed.config.withLiveKnobsOf(settings.config.value) },
                { pipeline.corners = it },
                seed.logs("chesslabTracker"),
                dispatcher = seed.observerDispatcher ?: Dispatchers.Default,
                cachedCorners = seed.cachedAlignment,
                cornerSink = seed.alignmentSink,
                cachedMarkers = seed.cachedMarkerDetections,
                onRectificationChanged = { host.submit(EngineAction.RectificationChanged) },
            ),
            timings,
            seed.nowMs,
            seed.exposure,
            seed.focus,
            seed.logs("chesslabNote")::info,
        )

    init {
        pipeline.corners = seed.corners
        // The perf line is the one log line both hosts share; from here on it carries the drops.
        timings.extras = ::dropLine
        // The seed's values, and NOTHING re-applies them: a collector once re-enabled a replay's
        // `set:cnnVerify=false` a tick after start (882 observations, `gateOff=0`).
        observer.setIntervalS(seed.config.observerIntervalS)
        observer.setEnabled(seed.config.cnnVerify)
        // Attaching is asynchronous and LOUD on failure: a silent one once let the tracker run
        // diff-only for a whole session (MEMORY android-live-bringup-2607).
        observer.attach(openClassifier)
        observer.state.onEach { publisher.cnnState = it }.launchIn(scope)
    }

    /**
     * Reverse construction order, observer first: it holds the only thread and native session, and
     * must stop before the pipeline it crops from (`docs/tracker-runtime-service.md`).
     */
    override fun close() {
        // The timings object outlives the stack on the phone (the service owns it across
        // restarts); a closed stack's counters must not keep writing onto the next one's line.
        timings.extras = null
        scope.cancel()
        observer.close()
        pipeline.close()
        clahe?.close()
    }
}

private const val MS_PER_S_D = 1000.0

/**
 * Owns the one live [TrackerStack] and performs the swap. The order IS the contract — **detach,
 * close, build**, and on a phone the wrong order is an OOM (`docs/tracker-runtime-service.md`).
 */
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

/**
 * Where the settings screen reaches the restart. [TrackerBinder] is the real API, but the service
 * publishes the action the way it publishes the settings repository (STATUS D07a-2).
 */
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

/** The CNN-facing slice of [TrackerConfig]. Rebuilt with the stack, so a retuned threshold lands. */
private fun cnnConfig(config: TrackerConfig) =
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
