package com.chesslab.tracker.service

import android.util.Log
import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.engine.toLogLine
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.BlockingQueue

/**
 * Its own tag, not `chesslabTracker`: `adb logcat -s chesslabDecision` then gives the move-by-move
 * provenance with nothing else in it, which is the form these lines get read in.
 */
private const val DECISION_TAG = "chesslabDecision"

/** Deep enough to survive a burst of taps; shallow enough that a stalled drain is visible. */
private const val ACTION_CAPACITY = 32

/** One observation every few seconds — anything queued behind two is already stale. */
private const val SNAPSHOT_CAPACITY = 4

/**
 * The engine, behind a seam. `TrackerEngine` is named in exactly this file, so "one engine owner"
 * is a grep and not a convention, and the host's ordering can be tested against a fake.
 */
interface EngineOps {
    fun onFrame(input: FrameInput): List<TrackerEvent>

    fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent>

    fun apply(action: EngineAction): List<TrackerEvent>

    fun status(): TrackerStatus

    /** The game FEN without the rest of [status] — see [EngineHost.fen]. */
    fun fen(): String
}

/**
 * The real engine plus the `:app`-side half of `app.py::_apply_live_tuning`.
 *
 * [onConfigApplied] is the frame pipeline's `onConfigChanged`, which resets the motion ROI and
 * rebuilds CLAHE. It runs here, on the owning thread, in the same action as the engine's own
 * `updateConfig`, so a frame can never observe half a config change.
 */
class TrackerEngineOps(
    private val engine: TrackerEngine,
    private val onConfigApplied: (TrackerConfig) -> Unit,
) : EngineOps {
    override fun onFrame(input: FrameInput): List<TrackerEvent> = engine.onFrame(input)

    override fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent> = engine.onCnnSnapshot(snap)

    override fun status(): TrackerStatus = engine.status()

    override fun fen(): String = engine.fen()

    override fun apply(action: EngineAction): List<TrackerEvent> =
        when (action) {
            is EngineAction.Undo -> engine.undo()
            is EngineAction.ResetToStart -> engine.resetToStart()
            is EngineAction.SetFen -> engine.setFen(action.fen)
            is EngineAction.CaptureBaseline -> engine.captureBaseline()
            is EngineAction.ChoosePromotion -> engine.choosePromotion(action.piece)
            is EngineAction.AcceptCnnPosition -> engine.acceptCnnPosition()
            is EngineAction.SetDebugEnabled -> {
                engine.setDebugEnabled(action.on)
                emptyList()
            }
            is EngineAction.UpdateConfig -> {
                engine.updateConfig(action.config)
                onConfigApplied(action.config)
                emptyList()
            }
        }
}

/**
 * Single-thread ownership of the engine.
 *
 * The owning thread is whichever one touches the engine first — the camera creates the analyzer
 * thread itself, so it cannot be named at construction — and every later touch must be the same
 * one. The `check` is the point of this class: without it a second thread corrupts a lock-free
 * state machine quietly, and the symptom surfaces frames later as an impossible detection.
 */
class EngineHost(
    private val ops: EngineOps,
) {
    private val actions: BlockingQueue<EngineAction> = ArrayBlockingQueue(ACTION_CAPACITY)
    private val snapshots: BlockingQueue<CnnSnapshot> = ArrayBlockingQueue(SNAPSHOT_CAPACITY)

    @Volatile
    private var owner: Thread? = null

    /** From any thread. Never blocks: a full queue drops its OLDEST entry, it does not wait. */
    fun submit(action: EngineAction) = offerDroppingOldest(actions, action)

    /** From the CNN observer thread. Same contract — a stale observation is worthless anyway. */
    fun submit(snap: CnnSnapshot) = offerDroppingOldest(snapshots, snap)

    /**
     * One tick: queued actions, then queued observations, then the frame.
     *
     * The order is behaviour, not tidiness — Python drains both under `self.lock` at the top of
     * the detection section, so a user correction and a CNN verdict are visible to the very frame
     * that follows them, never landing in the middle of a detection.
     */
    fun tick(input: FrameInput?): List<TrackerEvent> {
        claim()
        val events = mutableListOf<TrackerEvent>()
        while (true) events += ops.apply(actions.poll() ?: break)
        while (true) events += ops.onCnnSnapshot(snapshots.poll() ?: break)
        if (input != null) events += ops.onFrame(input)
        return events
    }

    fun status(): TrackerStatus {
        claim()
        return ops.status()
    }

    /**
     * The game FEN alone.
     *
     * The CNN observer needs it on EVERY frame as its discard-on-change guard, which is the one
     * part of [status] that cannot be sampled — and building the whole `TrackerStatus` for it was
     * four 64-entry maps and four sorted square-name sets per frame.
     */
    fun fen(): String {
        claim()
        return ops.fen()
    }

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

/**
 * Builds the app's ONE LIVE engine, arms it with the CNN evaluator and locks it behind a host.
 *
 * It happens here so no other file names `TrackerEngine` at all: a reference is all it takes for
 * some future screen to call it from the main thread. `attachCnn` is part of construction because
 * it also arms `cnnRun` — an engine without it commits straight from the diff and never queues a
 * candidate for verification.
 *
 * A tracker restart builds a NEW host, and that is deliberate: [EngineHost.owner] starts unset, so
 * the rebuilt engine re-latches onto whichever thread drives it first instead of inheriting a
 * claim from the stack that is being thrown away. Nothing here claims the engine, so construction
 * itself may happen anywhere. [startFen] is how the game survives the restart.
 */
fun engineHost(
    config: TrackerConfig,
    cnn: CnnEvaluator?,
    startFen: String,
    onDecision: (DebugDecision) -> Unit,
    onConfigApplied: (TrackerConfig) -> Unit,
): EngineHost {
    // Not gated on the debug switch. A decision row is written at most once per committed or
    // rejected move — not per frame — and the one session where it is needed is always the one
    // nobody armed a debug flag for beforehand.
    //
    // Two consumers, one sink. The engine hands out the row as structure; the prose is rendered
    // HERE, so a second consumer does not have to re-parse a sentence to count rejections. logcat
    // stays because it is what makes a live look possible over adb, with nothing to export first.
    val engine =
        TrackerEngine(config, startFen) {
            Log.i(DECISION_TAG, it.toLogLine())
            onDecision(it)
        }
    engine.attachCnn(cnn)
    return EngineHost(TrackerEngineOps(engine, onConfigApplied))
}

private fun <T> offerDroppingOldest(
    queue: BlockingQueue<T>,
    item: T,
) {
    while (!queue.offer(item)) {
        if (queue.poll() == null) return
    }
}
