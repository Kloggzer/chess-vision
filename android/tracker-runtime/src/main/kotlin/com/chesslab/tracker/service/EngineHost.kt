package com.chesslab.tracker.service

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.EngineAction
import com.chesslab.engine.api.EngineOps
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.FrameReads
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.engine.perf.UNKNOWN_INPUT
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.engine.toLogLine
import com.chesslab.tracker.log.NoopTrackerLog
import com.chesslab.tracker.log.TrackerLog
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.BlockingQueue
import java.util.concurrent.atomic.AtomicLong

/** Deep enough for a burst of taps; shallow enough that a stalled drain is visible. */
private const val ACTION_CAPACITY = 32

/** Anything queued behind two observations is already stale. */
private const val SNAPSHOT_CAPACITY = 4

class EngineHooks(
    /** Committed or rejected — what `replay … score` reads. */
    val onDecision: (DebugDecision) -> Unit,
    val onState: (String, String, Double) -> Unit = { _, _, _ -> },
    /** Runs in the same action as the engine's own. */
    val onConfigApplied: (TrackerConfig) -> Unit,
)

/** `TrackerEngine` is named in exactly this file, so "one engine owner" is a grep. [onConfigApplied] runs on the
 *  owning thread in the same action as `updateConfig`: no frame observes half a config change. */
class TrackerEngineOps(
    private val engine: TrackerEngine,
    private val onConfigApplied: (TrackerConfig) -> Unit,
    /** Wieder angehaengt, wenn ein Retry-Attach doch greift. */
    private val cnn: CnnEvaluator? = null,
) : EngineOps {
    override fun onFrame(input: FrameInput): List<TrackerEvent> = engine.onFrame(input)

    override fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent> = engine.onCnnSnapshot(snap)

    override fun status(): TrackerStatus = engine.status()

    override fun fen(): String = engine.fen()

    /** `evaluationDue` sorts the readings out afterwards. */
    override fun wantsCnnRead(): Boolean = true

    override fun verifyWaiting(): Boolean = engine.verifyWaiting()

    override fun apply(action: EngineAction): List<TrackerEvent> =
        when (action) {
            is EngineAction.Undo -> engine.undo()
            is EngineAction.SetFen -> engine.setFen(action.fen)
            is EngineAction.CaptureBaseline -> engine.captureBaseline()
            is EngineAction.RectificationChanged -> engine.rectificationChanged()
            is EngineAction.ChoosePromotion -> engine.choosePromotion(action.piece)
            is EngineAction.AcceptCnnPosition -> engine.acceptCnnPosition()
            is EngineAction.ResyncToBoard -> engine.resyncToBoard()
            is EngineAction.SetDebugEnabled -> {
                engine.setDebugEnabled(action.on)
                emptyList()
            }
            is EngineAction.CnnAvailability -> {
                engine.attachCnn(if (action.on) cnn else null)
                emptyList()
            }
            is EngineAction.UpdateConfig -> {
                engine.updateConfig(action.config)
                onConfigApplied(action.config)
                emptyList()
            }
        }
}

/** The owning thread is whichever touches the engine first. The `check` is the point: a second thread corrupts
 *  the lock-free state machine quietly, and the symptom surfaces frames later. */
class EngineHost(
    private val ops: EngineOps,
) {
    private val actions: BlockingQueue<EngineAction> = ArrayBlockingQueue(ACTION_CAPACITY)
    private val snapshots: BlockingQueue<CnnSnapshot> = ArrayBlockingQueue(SNAPSHOT_CAPACITY)

    @Volatile
    private var owner: Thread? = null

    private val droppedActions = AtomicLong()
    private val droppedSnapshots = AtomicLong()

    val actionsDropped: Long get() = droppedActions.get()

    /** Each one an observation the engine never saw. */
    val snapshotsDropped: Long get() = droppedSnapshots.get()

    /** Never blocks: a full queue drops its OLDEST entry. */
    fun submit(action: EngineAction) {
        if (offerDroppingOldest(actions, action)) droppedActions.incrementAndGet()
    }

    /** A stale observation is worthless anyway. */
    fun submit(snap: CnnSnapshot) {
        if (offerDroppingOldest(snapshots, snap)) droppedSnapshots.incrementAndGet()
    }

    /** The order is behaviour: a user correction and a CNN verdict are visible to the very next frame. */
    fun tick(input: FrameInput?): List<TrackerEvent> =
        WorkProfiler.span(WorkOperation.ENGINE_TICK, input?.seq ?: UNKNOWN_INPUT) {
            claim()
            val events = mutableListOf<TrackerEvent>()
            while (true) {
                val action = actions.poll() ?: break
                events += WorkProfiler.span(WorkOperation.ENGINE_ACTION) { ops.apply(action) }
            }
            while (true) {
                val snapshot = snapshots.poll() ?: break
                events += WorkProfiler.span(WorkOperation.ENGINE_CNN_SNAPSHOT, snapshot.seq) { ops.onCnnSnapshot(snapshot) }
            }
            if (input != null) {
                events += WorkProfiler.span(WorkOperation.ENGINE_FRAME, input.seq) { ops.onFrame(input) }
            }
            events
        }

    fun status(): TrackerStatus {
        claim()
        return ops.status()
    }

    /** Needed EVERY frame as the observer's discard-on-change guard; a whole `TrackerStatus` for it was four maps
     *  and four sorted sets per frame. */

    fun fen(): String {
        claim()
        return ops.fen()
    }

    /** NOT `claim()`ed: asked from the per-frame call that owns the engine; a wrong answer costs one inference. */
    fun wantsCnnRead(): Boolean = ops.wantsCnnRead()

    fun verifyWaiting(): Boolean = ops.verifyWaiting()

    /** Constant for the life of this host. */
    val reads: FrameReads get() = ops.reads

    private fun claim() {
        val current = Thread.currentThread()
        val existing = owner
        if (existing == null) {
            owner = current
        } else {
            check(existing === current) { "engine touched from '${current.name}', owned by '${existing.name}'" }
        }
    }
}

/** No other file names `TrackerEngine`. `attachCnn` also arms `cnnRun`: without it the engine commits straight
 *  from the diff. A restart builds a NEW host, which re-latches onto its first thread; [startFen] carries the game. */
fun engineHost(
    config: TrackerConfig,
    cnn: CnnEvaluator?,
    startFen: String,
    hooks: EngineHooks,
    log: TrackerLog = NoopTrackerLog,
): EngineHost {
    val onDecision = hooks.onDecision
    val onState = hooks.onState
    val onConfigApplied = hooks.onConfigApplied
    // Not gated on debug: at most one row per decision, and the session that needs it is never pre-armed. The
    // prose is rendered HERE, so a second consumer need not re-parse a sentence.
    val engine =
        TrackerEngine(
            config,
            startFen,
            decisionSink = {
                log.info(it.toLogLine())
                onDecision(it)
            },
            // Its channel is not `chesslabDecision` — that name is move provenance and nothing else, by contract.
            stateSink = onState,
        )
    engine.attachCnn(cnn)
    return EngineHost(TrackerEngineOps(engine, onConfigApplied, cnn))
}

private fun <T> offerDroppingOldest(
    queue: BlockingQueue<T>,
    item: T,
): Boolean {
    var dropped = false
    while (!queue.offer(item)) {
        if (queue.poll() == null) return dropped
        dropped = true
    }
    return dropped
}
