package com.chesslab.tracker.service

import com.chesslab.cnn.CnnConfig
import com.chesslab.cnn.CnnRecovery
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
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
import java.util.concurrent.atomic.AtomicLong

/**
 * How this host turns its frames into stages. The phone binds CameraX; a video source binds a Mat
 * straight through. The stack owns the crop store and the preview buses it passes in, so it hands
 * them over rather than letting the host invent its own.
 */
typealias StagesFactory<T> = (BoardGeometry, TrackerConfig, CropFrameStore, (Mat) -> Unit, (Mat) -> Unit) -> FrameStages<T>

/**
 * What a rebuilt tracker must NOT forget.
 *
 * A restart exists to apply the 34 construction-time knobs; it is not a reset. The position, the
 * calibration and the corner alignment are the user's, not the config's, so they are handed to the
 * new stack. Move HISTORY is not carried: `TrackerEngine` is seeded with a FEN, so undo starts
 * empty after a restart (STATUS D07x-3).
 *
 * `LongParameterList` is suppressed because this IS the holder object detekt's rule exists to
 * ask for — the thing that keeps `TrackerStack`'s own parameter list short. Counting its fields
 * against the same threshold penalises the fix for the problem.
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
     * Where the rebuilt engine's decision rows go — the session-lived diagnostics writer, which
     * outlives every stack. It is handed over for the same reason the position is: a restart that
     * forgot it would leave the new engine writing its rows to nobody, and the session where that
     * matters is always the one nobody noticed the gap in.
     */
    val onDecision: (DebugDecision) -> Unit,
    /**
     * How the stack reaches a log. Seeded rather than constructed for the same reason [onDecision]
     * is: the host owns the platform, the stack owns the CHANNEL NAMES — and those names are what
     * `adb logcat -s` is pointed at, so they are behaviour, not decoration.
     */
    val logs: TrackerLogs = NoTrackerLogs,
    /** See [StagesFactory]: the one thing about a frame this stack cannot know by itself. */
    val stages: StagesFactory<T>,
    /**
     * What the engine calls now. The wall clock for a camera; the VIDEO's clock for a replay,
     * where wall time has nothing to do with when a frame was taken — see `TrackerCoordinator`.
     */
    val nowMs: () -> Long = System::currentTimeMillis,
    /**
     * Where the observer's inference runs. `null` — the default, and what the phone uses — is a
     * dedicated thread: live frames must keep flowing while the model thinks. A REPLAY passes a
     * direct dispatcher instead, so the observation completes inline before the next frame is
     * decoded: when a snapshot lands relative to the frames then depends on nothing but the video,
     * which is what makes two runs of the same file the same run. The cadence knob for that mode
     * is `observerIntervalS` — synchronous at 0 would mean inference on every frame.
     */
    val observerDispatcher: CoroutineDispatcher? = null,
)

/**
 * Everything a tracker restart tears down and rebuilds — and, by omission, everything it does not.
 *
 * NOT here, on purpose: the [com.chesslab.tracker.camera.TrackerCamera] (exactly ONE
 * `ProcessCameraProvider` binding may exist app-wide — MEMORY `android-single-camera-owner`; a
 * restart retargets it instead), the [CameraFrameBus<*>], the [StatusPublisher] and the
 * [SettingsRepository]. The last three because the UI already collects their `StateFlow`s: a
 * swapped flow instance is a screen that silently stops updating, which is the failure mode this
 * whole pack exists to avoid.
 */
class TrackerStack<T>(
    seed: TrackerSeed<T>,
    settings: SettingsRepository,
    publisher: StatusPublisher,
    frames: CameraFrameBus<*>,
    timings: StageTimings,
    parent: CoroutineScope,
    openClassifier: () -> Attached,
) : AutoCloseable {
    /** A child of the service scope, cancelled with the stack: no collector outlives its stack. */
    val scope = CoroutineScope(parent.coroutineContext + SupervisorJob())

    private val cropStore = CropFrameStore()
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
            seed.onDecision,
            // Its own channel, not `chesslabTracker`: `adb logcat -s chesslabDecision` then gives the
            // move-by-move provenance with nothing else in it, which is the form these lines get read in.
            log = seed.logs("chesslabDecision"),
        ) { pipeline.onConfigChanged(it) }

    /** 07b's crop tap. Inert until the debug switch arms it; the service re-arms it after a restart. */
    val cropTap = DebugCropTap(cropFrameSource(cropStore, seed.geometry))

    private val observed = AtomicLong()

    /** Successful glances of THIS stack — a restart legitimately restarts the count. */
    val observations: Long get() = observed.get()

    val observer =
        if (seed.observerDispatcher == null) {
            CnnObserver(
                source = cropTap,
                fen = { publisher.lastFen },
                onSnapshot = {
                    observed.incrementAndGet()
                    host.submit(it)
                },
                log = seed.logs("chesslabCnn"),
                // The ENGINE's clock, not the wall clock. On the phone the two are the same thing;
                // in a replay the engine runs on the video's virtual clock, and an observer pacing
                // itself on the wall clock is a second clock in one machine — its cadence then
                // depends on how fast THIS host decodes, which is how the same file produced 23
                // committed plies on one run and 25 on the next. ONE clock; this is that clock.
                nowMs = seed.nowMs,
            )
        } else {
            CnnObserver(
                source = cropTap,
                fen = { publisher.lastFen },
                onSnapshot = {
                    observed.incrementAndGet()
                    host.submit(it)
                },
                log = seed.logs("chesslabCnn"),
                nowMs = seed.nowMs,
                dispatcher = seed.observerDispatcher,
            )
        }

    val coordinator =
        TrackerCoordinator(
            pipeline,
            host,
            publisher,
            frames,
            observer,
            // The align detection shares the observer's dispatcher choice: inline for replays,
            // its own worker live. Inline is not only determinism (an align lands at a video
            // time, not a wall time) — it is what makes the desktop SINGLE-THREADED through
            // OpenCV: with the drive thread's stages and ArUco running concurrently, the 4.10
            // Windows build's `detectMarkers` committed a single ~53 GB native buffer on a
            // motion-blur frame (specs/52 STATUS, 2026-08-08), and `Core.setNumThreads(1)`
            // alone only made the balloon rarer, not impossible.
            LiveAlign(
                scope,
                seed.geometry,
                settings.config::value,
                { pipeline.corners = it },
                seed.logs("chesslabTracker"),
                dispatcher = seed.observerDispatcher ?: Dispatchers.Default,
            ),
            timings,
            seed.nowMs,
        )

    init {
        pipeline.corners = seed.corners
        // The seed's own values FIRST, synchronously: until the settings flow below delivers, the
        // observer would run with its constructor defaults — and WHEN that coroutine fires is wall
        // clock, so a cold first replay observed on a different cadence than a warm one and
        // diverged at ply 0. The flow still owns every LATER change.
        observer.setIntervalS(seed.config.observerIntervalS)
        observer.setEnabled(seed.config.cnnVerify)
        // Attaching is asynchronous and LOUD on failure: a silent one once let the tracker run
        // diff-only for a whole session (MEMORY android-live-bringup-2607).
        observer.attach(openClassifier)
        observer.state.onEach { publisher.cnnState = it }.launchIn(scope)
        settings.config
            .onEach {
                observer.setIntervalS(it.observerIntervalS)
                observer.setEnabled(it.cnnVerify)
            }.launchIn(scope)
    }

    /**
     * Reverse construction order, and the observer first.
     *
     * It is the only member holding a thread and a native session, and it must stop before the
     * pipeline it crops from: an observation that survived into a closed pipeline would read
     * released OpenCV memory. The engine host needs no close — it is queues and plain objects,
     * and the whole point of rebuilding it is that its thread claim goes with it.
     */
    override fun close() {
        scope.cancel()
        observer.close()
        pipeline.close()
    }
}

/**
 * Owns the one live [TrackerStack] and performs the swap. Generic over [T] only so the ORDER can
 * be asserted against a fake on the desktop JVM — the real stack needs OpenCV and ONNX natives.
 *
 * The order IS the contract: **detach, close, build**. Detaching first is what makes a frame
 * arriving mid-restart a dropped frame instead of a call into a closed pipeline; closing before
 * building is what keeps a restart from holding two ONNX sessions, two observer threads and two
 * sets of full-resolution warps at once — on a phone that is an OOM, not an inefficiency.
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
 * Where the settings screen reaches the restart.
 *
 * [TrackerBinder] is the real API, but the only composable holding a binder is
 * `ui/TrackerServiceBinding.kt`, which this change does not own — so the service publishes the
 * action the same way it publishes the settings repository (STATUS D07a-2).
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
        minConfidentBoard = config.minConfidentBoard,
        minConfidentRecovery = config.minConfidentRecovery,
        recoveryMaxPlies = config.recoveryMaxPlies,
    )
