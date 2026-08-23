package com.chesslab.tracker.cnn

import com.chesslab.cnn.SquareClassifier
import com.chesslab.cnn.observationFromProbs
import com.chesslab.cnn.possibleLabels
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.tracker.log.NoopTrackerLog
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExecutorCoroutineDispatcher
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.util.concurrent.Executors

/** Python's 1 s guard after a failed observation (`_observe_snapshot`), so interval 0 cannot spin. */
private const val BACKOFF_MS = 1000L
private const val MS_PER_S = 1000.0

/**
 * One observation's input. Built on the observer thread by the adapter 06c wires over 05b's
 * `CropFrameStore`, so neither the cropping nor the full-resolution warp lands on the analyzer
 * thread's 15 fps budget.
 *
 * `warped`/`gray` are the SAME frame's warps at `detSize` — the recovery and verify commits
 * anchor on the frame the CNN actually looked at (entry.md invariants 1 and 5).
 */
class CnnFrame(
    val crops: List<BgrImage>,
    val seq: Long,
    val tsMs: Long,
    val warped: BgrImage?,
    val gray: GrayImage?,
    /** Grid-groove hand map of the same frame, cut with the crops (`gridOccludedSquares`). */
    val gridOccluded: Long = 0L,
    /** Offline replay may supply the byte-identical result of an earlier visual pass. */
    val cachedObservation: CnnObservation? = null,
)

fun interface CnnFrameSource {
    /** @return null when no crop frame is pending. Called on the observer thread only. */
    fun take(): CnnFrame?
}

/** A loaded classifier plus the execution provider it actually got — both go into [CnnState.Ready]. */
class Attached(
    val classifier: SquareClassifier,
    val backend: String,
    val model: String,
)

/**
 * Port of `tracker.py::_observer_due` / `_cnn_worker` / `_observe_snapshot`: a single thread
 * that runs at most ONE observation at a time and hands the result to the engine through a
 * callback (06c marshals it onto the engine's single owning thread — the engine is driven by
 * exactly one thread).
 */
class CnnObserver(
    private val source: CnnFrameSource,
    private val fen: () -> String?,
    private val onSnapshot: (CnnSnapshot) -> Unit,
    /** Weight of the legal-placement prior on the identity softmax; 0.0 keeps the pixels alone. */
    private val priorLambda: Double = 0.0,
    private val log: CnnLog = NoopTrackerLog,
    private val nowMs: () -> Long = System::currentTimeMillis,
    private val dispatcher: CoroutineDispatcher =
        Executors.newSingleThreadExecutor { Thread(it, "chesslab-cnn") }.asCoroutineDispatcher(),
) : AutoCloseable {
    private val holder = CnnStateHolder(log)
    private val scope = CoroutineScope(dispatcher + SupervisorJob())

    val state: StateFlow<CnnState> get() = holder.state

    @Volatile
    private var classifier: SquareClassifier? = null

    @Volatile
    private var busy = false

    @Volatile
    private var startedMs = 0L

    @Volatile
    private var intervalMs = 0L

    @Volatile
    private var enabled = true

    /** Observer thread only — [logObservation] is the sole reader and writer. */
    private var lastObservationLogMs = 0L

    /**
     * Why an observation did not produce a snapshot.
     *
     * `observations = 0` has three causes that look identical from outside: the observer was
     * never asked, it was asked and had no classifier, or it was asked and the crop store never
     * handed it pixels. The third is normal ONCE per request and pathological if it is all that
     * ever happens.
     */
    val counters: String
        get() =
            "attempts=$attempts noClassifier=$noClassifier noCrops=$noCrops emitted=$emitted " +
                "gateOff=$gateOff gateBusy=$gateBusy gateInterval=$gateInterval"

    private var attempts = 0L
    private var noClassifier = 0L
    private var noCrops = 0L
    private var emitted = 0L

    /**
     * Frames the observer declined, by gate — the largest UNCOUNTED drop in the CNN path until
     * 2026-08-08, and the invisible variable behind the 67-vs-26-plies cadence regression: the
     * throttle refused frames and nothing anywhere said so. Analyzer thread only, like [attempts].
     */
    var gateOff = 0L
        private set
    var gateBusy = 0L
        private set
    var gateInterval = 0L
        private set

    /** `_observer_due`. Also drives 05b's `CropFrameStore.wantsFrame()` — no crop warp while busy. */
    fun wantsFrame(): Boolean = enabled && state.value is CnnState.Ready && !busy && nowMs() - startedMs >= intervalMs

    /** Called per frame from the analyzer thread; returns immediately. */
    fun onFrameAvailable() {
        if (!wantsFrame()) {
            when {
                !enabled || state.value !is CnnState.Ready -> gateOff += 1
                busy -> gateBusy += 1
                else -> gateInterval += 1
            }
            return
        }
        // Captured HERE, not inside the coroutine: a FEN that changes mid-inference must not
        // overwrite the snapshot's discard-on-change guard.
        val startFen = fen()
        busy = true
        startedMs = nowMs()
        scope.launch { observe(startFen) }
    }

    fun attach(open: () -> Attached) {
        if (!holder.beginAttach()) return
        scope.launch { load(open) }
    }

    /** The explicit way out of the sticky [CnnState.Failed] — 07b's debug screen calls it. */
    fun retryAttach(open: () -> Attached) {
        if (!holder.retry()) return
        scope.launch { load(open) }
    }

    fun setEnabled(on: Boolean) {
        enabled = on
        if (!on) holder.off()
    }

    fun setIntervalS(seconds: Double) {
        intervalMs = (seconds * MS_PER_S).toLong()
    }

    /**
     * Closes the session and gives the observer thread back.
     *
     * Both halves matter for a tracker restart, which closes an observer while the app keeps
     * running: the session is freed ON the observer thread (closing an ORT session under a live
     * `classify` is a native use-after-free, and `scope.cancel` cannot interrupt one that is
     * already inside the runtime), and the executor is shut down afterwards, or every restart
     * would leak a thread and a few hundred MB of arena.
     */
    override fun close() {
        scope.cancel()
        val cnn = classifier
        classifier = null
        enabled = false
        CoroutineScope(dispatcher).launch {
            cnn?.close()
            (dispatcher as? ExecutorCoroutineDispatcher)?.close()
        }
    }

    private fun load(open: () -> Attached) {
        runCatching(open)
            .onSuccess {
                classifier = it.classifier
                holder.ready(it.backend, it.model, it.classifier.classes.size)
            }.onFailure { holder.failed(it.message.orEmpty(), it) }
    }

    private fun observe(startFen: String?) {
        runCatching { runObservation(startFen) }
            .onFailure {
                log.warn("CNN observation failed", it)
                startedMs = nowMs() + BACKOFF_MS
            }
        busy = false
    }

    /**
     * One line per second, so a real steady-state number exists in logcat.
     *
     * Every on-device CNN timing on record was a cold warm-up batch with ORT profiling armed —
     * including the 97 ms that the CPU-vs-NPU comparison was built on. This is the warm number,
     * and it INCLUDES preprocessing, which is the half that does not get faster when the graph
     * moves to the NPU.
     */
    private fun logObservation(
        cnn: SquareClassifier,
        inferMs: Double,
        crops: Int,
    ) {
        val now = nowMs()
        if (now - lastObservationLogMs < BACKOFF_MS) return
        lastObservationLogMs = now
        // The split is the point. Preprocessing is 64 crops resized and normalised into 3.1 M
        // floats on THIS thread and does not get faster when the graph moves to the NPU, so a
        // single total cannot say whether an accelerator helped.
        val session = (cnn as? OnnxSquareClassifier)?.lastRunMs ?: 0.0
        val prep = inferMs - session
        log.info("CNN observation ${inferMs.toLong()} ms for $crops crops = ${prep.toLong()} prep + ${session.toLong()} session")
    }

    /** Null at lambda 0 (so no board is built) and on a cold start, where there is no prior to have. */
    private fun possibleFor(fen: String?): Map<String, Set<String>>? {
        if (priorLambda <= 0.0 || fen == null) return null
        return runCatching { possibleLabels(fen) }.getOrNull()
    }

    private fun runObservation(startFen: String?) {
        attempts += 1
        val cnn =
            classifier ?: run {
                noClassifier += 1
                return
            }
        val frame =
            source.take() ?: run {
                // NOT a failure: `cropFrameSource` answers the first ask with null and requests a
                // warp, so the next attempt is the one that gets pixels. Counted because a run
                // where this is the ONLY thing that ever happens looks identical from outside to
                // a run where the observer never started.
                noCrops += 1
                return
            }
        WorkProfiler.span(WorkOperation.CNN_OBSERVATION, frame.seq) {
            val started = nowMs()
            val obs =
                frame.cachedObservation
                    ?: observationFromProbs(cnn.classify(frame.crops), cnn.classes, possibleFor(startFen), priorLambda)
            val inferMs = (nowMs() - started).toDouble()
            logObservation(cnn, inferMs, frame.crops.size)
            emitted += 1
            onSnapshot(
                CnnSnapshot(
                    obs = obs,
                    seq = frame.seq,
                    tsMs = frame.tsMs,
                    inferMs = inferMs,
                    warped = frame.warped,
                    gray = frame.gray,
                    fen = startFen,
                    gridOccluded = frame.gridOccluded,
                ),
            )
        }
    }
}
