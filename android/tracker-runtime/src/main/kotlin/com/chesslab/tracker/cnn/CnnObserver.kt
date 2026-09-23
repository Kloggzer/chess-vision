package com.chesslab.tracker.cnn

import com.chesslab.cnn.SquareClassifier
import com.chesslab.cnn.observationFromProbs
import com.chesslab.cnn.possibleLabels
import com.chesslab.cnn.priorOnTempered
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
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/** Python's 1 s guard after a failed observation, so interval 0 cannot spin. */
private const val BACKOFF_MS = 1000L

/** Long enough for a running inference, short enough that a stuck thread cannot hang the restart. */
private const val CLOSE_TIMEOUT_MS = 5000L
private const val MS_PER_S = 1000.0

/** Built on the observer thread, so neither cropping nor the full-resolution warp lands on the analyzer's
 *  budget. `warped`/`gray` are the SAME frame's warps: recovery and verify anchor on what the CNN saw. */
class CnnFrame(
    val crops: List<BgrImage>,
    val seq: Long,
    val tsMs: Long,
    val warped: BgrImage?,
    val gray: GrayImage?,
    val gridOccluded: Long = 0L,
    /** Offline replay may supply the byte-identical result of an earlier visual pass. */
    val cachedObservation: CnnObservation? = null,
    val gridOccludedAsync: CompletableFuture<Long>? = null,
) {
    fun gridOccludedSquares(): Long = gridOccludedAsync?.join() ?: gridOccluded
}

fun interface CnnFrameSource {
    /** Called on the observer thread only. */
    fun take(): CnnFrame?
}

/** A loaded classifier plus the execution provider it actually got. */
class Attached(
    val classifier: SquareClassifier,
    val backend: String,
    val model: String,
    val spec: ModelSpec? = null,
)

/** At most ONE observation at a time; the result goes through a callback marshalled onto the engine's single
 *  owning thread. */
class CnnObserver(
    private val source: CnnFrameSource,
    private val fen: () -> String?,
    private val onSnapshot: (CnnSnapshot) -> Unit,
    private val priorLambda: Double = 0.0,
    /** False reproduces the historical conditioned-everywhere implementation for replay A/Bs. */
    private val priorSafety: Boolean = true,
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
    private var attachedSpec: ModelSpec? = null

    @Volatile
    private var busy = false

    @Volatile
    private var startedMs = 0L

    /** Nach einem Fehlschlag eine Sekunde, und zwar NUR sie: in `startedMs` addierte sie sich zum Intervall. */
    private var pausedUntilMs = 0L

    @Volatile
    private var intervalMs = 0L

    @Volatile
    private var enabled = true

    @Volatile
    private var closed = false

    private var lastObservationLogMs = 0L

    /** `observations = 0` has three causes that look alike: never asked, no classifier, or no pixels. The third is
     *  normal ONCE per request and pathological if it is all that ever happens. */
    val counters: String
        get() =
            "attempts=$attempts noClassifier=$noClassifier noCrops=$noCrops emitted=$emitted " +
                "priorFailed=$priorFailed " +
                "gateOff=$gateOff gateBusy=$gateBusy gatePaused=$gatePaused " +
                "gateInterval=$gateInterval gateUnwanted=$gateUnwanted"

    private var attempts = 0L
    private var noClassifier = 0L
    private var noCrops = 0L
    private var emitted = 0L

    /** Observations that WANTED a prior and ran without one. */
    private var priorFailed = 0L

    private var lastPriorFailure: String? = null

    /** Frames the observer declined, by gate: an uncounted throttle hid the 67-vs-26-plies cadence regression. */
    var gateOff = 0L
        private set
    var gateBusy = 0L
        private set

    var gatePaused = 0L
        private set

    var gateInterval = 0L
        private set

    var gateUnwanted = 0L
        private set

    /** [demand] is the engine's answer to "would a reading tell you anything": a blind engine says no and saves
     *  a whole inference. */
    fun wantsFrame(): Boolean =
        enabled &&
            state.value is CnnState.Ready &&
            !busy &&
            nowMs() >= pausedUntilMs &&
            nowMs() - startedMs >= intervalMs &&
            demand()

    fun onFrameAvailable() {
        if (!wantsFrame()) {
            // Dieselbe Reihenfolge wie `wantsFrame` (Intervall VOR `demand()`): umgekehrt buchte die Drossel ihre
            // Ablehnungen auf `gateUnwanted`, und `gateInterval` meldete 0.
            when {
                !enabled || state.value !is CnnState.Ready -> gateOff += 1
                busy -> gateBusy += 1
                nowMs() < pausedUntilMs -> gatePaused += 1
                nowMs() - startedMs < intervalMs -> gateInterval += 1
                else -> gateUnwanted += 1
            }
            return
        }
        // Captured HERE: a FEN change mid-inference must not overwrite the discard-on-change guard.
        val startFen = fen()
        busy = true
        startedMs = nowMs()
        scope.launch { observe(startFen) }
    }

    /** Disabled means disabled: no ONNX open, no warm-up, no [CnnState.Ready]. */
    fun attach(open: () -> Attached) {
        if (!enabled || !holder.beginAttach()) return
        scope.launch { load(open) }
    }

    /** The explicit way out of the sticky [CnnState.Failed]. */
    fun retryAttach(open: () -> Attached) {
        if (!holder.retry()) return
        scope.launch { load(open) }
    }

    /** A property rather than a constructor argument: the observer is built before the thing it asks. */
    private var demand: () -> Boolean = { true }

    fun demandFrom(source: () -> Boolean) {
        demand = source
    }

    fun setEnabled(on: Boolean) {
        enabled = on
        if (!on) holder.off()
    }

    fun setIntervalS(seconds: Double) {
        intervalMs = (seconds * MS_PER_S).toLong()
    }

    /** BLOCKS until the session is closed ON the observer thread: closing ORT under a live `classify` is a native
     *  use-after-free. Bounded, because a close that never returns is worse than a leaked arena. */
    override fun close() {
        scope.cancel()
        closed = true
        val cnn = classifier
        classifier = null
        enabled = false
        val done = CountDownLatch(1)
        CoroutineScope(dispatcher).launch {
            try {
                cnn?.close()
            } finally {
                done.countDown()
                (dispatcher as? ExecutorCoroutineDispatcher)?.close()
            }
        }
        if (!done.await(CLOSE_TIMEOUT_MS, TimeUnit.MILLISECONDS)) {
            log.warn("CNN close timed out after $CLOSE_TIMEOUT_MS ms — the observer thread is still busy", null)
        }
    }

    private fun load(open: () -> Attached) {
        runCatching(open)
            .onSuccess {
                // [close] ran while the model was still opening: this classifier is nobody's but ours.
                if (closed || !enabled) {
                    runCatching { it.classifier.close() }
                    return
                }
                // `retryAttach` kommt auch aus `Ready`: sonst blieb je Aufruf eine native Sitzung samt Arena stehen.
                classifier?.let { old -> runCatching { old.close() } }
                classifier = it.classifier
                attachedSpec = it.spec
                holder.ready(it.backend, it.model, it.classifier.classes.size)
            }.onFailure { holder.failed(it.message.orEmpty(), it) }
    }

    /** Im Raum der getemperten Zeilen. */
    private fun priorFor(spec: ModelSpec?): Double = priorOnTempered(spec?.priorLambda ?: priorLambda, spec?.temperature ?: 1.0)

    private fun observe(startFen: String?) {
        runCatching { runObservation(startFen) }
            .onFailure {
                log.warn("CNN observation failed", it)
                pausedUntilMs = nowMs() + BACKOFF_MS
            }
        busy = false
    }

    /** One line per second: the warm number, INCLUDING preprocessing. Every on-device timing on record was a
     *  cold warm-up batch with ORT profiling armed. */
    private fun logObservation(
        cnn: SquareClassifier,
        inferMs: Double,
        crops: Int,
    ) {
        val now = nowMs()
        if (now - lastObservationLogMs < BACKOFF_MS) return
        lastObservationLogMs = now
        // The split is the point: preprocessing does not get faster when the graph moves to the NPU.
        val session = (cnn as? OnnxSquareClassifier)?.lastRunMs ?: 0.0
        val prep = inferMs - session
        log.info("CNN observation ${inferMs.toLong()} ms for $crops crops = ${prep.toLong()} prep + ${session.toLong()} session")
    }

    private fun possibleFor(fen: String?): Map<String, Set<String>>? {
        if (priorFor(attachedSpec) <= 0.0 || fen == null) return null
        // Ein Fehlschlag sieht am Snapshot aus wie "Prior nicht gewollt": gezaehlt, einmal je Ursache gemeldet.
        return runCatching { possibleLabels(fen) }.getOrElse {
            priorFailed += 1
            if (it.message != lastPriorFailure) {
                lastPriorFailure = it.message
                log.warn("CNN prior unavailable for \"$fen\" — inference continues WITHOUT it", it)
            }
            null
        }
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
                // NOT a failure: the first ask answers null and requests a warp.
                noCrops += 1
                return
            }
        WorkProfiler.span(WorkOperation.CNN_OBSERVATION, frame.seq) {
            val started = nowMs()
            val observed =
                frame.cachedObservation
                    ?: observationFromProbs(
                        cnn.classify(frame.crops),
                        cnn.classes,
                        possibleFor(startFen),
                        priorFor(attachedSpec),
                    )
            val obs = if (priorSafety) observed else observed.withoutPriorSafety()
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
                    gridOccluded = frame.gridOccludedSquares(),
                ),
            )
        }
    }
}
