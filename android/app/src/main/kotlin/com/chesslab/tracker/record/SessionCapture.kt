package com.chesslab.tracker.record

import kotlinx.serialization.Serializable

private const val KB: Long = 1024L

/** Bytes under `filesDir/sessions` at which recording stops. Default 1 GB. */
const val DEFAULT_CAP_BYTES: Long = KB * KB * KB

/**
 * Off by default — recording writes full-resolution JPEGs of every committed move, and that cost
 * is the whole reason this is a choice and not a behaviour.
 */
@Serializable
data class RecordingPrefs(
    val enabled: Boolean = false,
    val inventoryFilter: Boolean = true,
    val capBytes: Long = DEFAULT_CAP_BYTES,
)

/** The raw frame the recorder would write. */
class CaptureFrame(
    val width: Int,
    val height: Int,
    // [a8, h8, h1, a1] in source pixels (entry.md invariant 11).
    val corners: FloatArray,
    val writer: FrameWriter,
)

interface CaptureSource {
    /** `null` = no frame or no corners yet, exactly Python's `_last_frame is None` guard. */
    fun grab(): CaptureFrame?

    /** Non-null while the profile and the delivered frame size disagree — see [RecordingGates]. */
    fun geometryNote(): String?
}

private data class Pending(
    val ply: Int,
    val fen: String,
    val san: String?,
)

/**
 * `_queue_session_capture` / `_flush_session_capture`.
 *
 * The photo for a committed move is deferred: right after a move the hands are usually still over
 * the board, and a frame with a hand in it is a frame whose 64 crops are labeled as pieces that
 * cannot be seen. It is taken immediately only when the board is already clean, otherwise at the
 * next quiet re-anchor — the tracker's own proof that nothing is moving.
 */
class SessionCaptureController(
    private val source: CaptureSource,
    private val open: (CaptureFrame) -> SessionRecorder?,
    private val gates: RecordingGates,
    private val prefs: () -> RecordingPrefs,
    // Bytes already on disk from EARLIER sessions. A supplier, and deliberately a cached one: the
    // sessions directory is never walked on the capture path.
    private val existingBytes: () -> Long,
) {
    private var pending: Pending? = null

    var recorder: SessionRecorder? = null
        private set

    /** Non-null once the size cap stopped recording. Nothing is overwritten or wrapped. */
    var stoppedReason: String? = null
        private set

    /** Frames the writer could not produce in the RUNNING session. Reset by [stop]. */
    var failedWrites: Int = 0
        private set

    /**
     * Why nothing is being written, most severe first: recording halted, then data actually lost,
     * then a skip that is by design (geometry suspended, inventory violation).
     */
    val reason: String? get() = stoppedReason ?: writeFailure() ?: gates.reason

    /**
     * A move was committed. [clean] is the board's state as the tracker sees it: no occlusion-
     * vetoed and no tainted squares.
     */
    fun queue(
        ply: Int,
        fen: String,
        san: String?,
        clean: Boolean,
    ) {
        // Python: nothing is queued while neither a recorder nor auto-record exists.
        if (recorder == null && !prefs().enabled) return
        gates.inventoryFilter = prefs().inventoryFilter
        if (gates.blocks(fen, source.geometryNote())) {
            pending = null
            return
        }
        pending = Pending(ply, fen, san)
        if (clean) flush()
    }

    /** The deferred photo is due — the quiet re-anchor. Both gates run AGAIN here, as in Python. */
    fun flush(): String? {
        val due = pending ?: return null
        gates.inventoryFilter = prefs().inventoryFilter
        if (gates.blocks(due.fen, source.geometryNote())) {
            pending = null
            return null
        }
        return capture(due)
    }

    private fun capture(due: Pending): String? {
        val frame = source.grab() ?: return null
        // BEFORE the recorder is opened: `SessionRecorder.<init>` writes `frames/`, `log.jsonl`
        // and `session.yaml`, so a start the cap then refused left an empty session directory on
        // disk — which then counted against the cap for the next one.
        val active = if (capReached()) null else (recorder ?: startRecorder(frame))
        if (active == null) return null
        pending = null
        val written = active.capture(frame.writer, due.ply, due.fen, due.san, frame.corners)
        // Python logs here (`tracker.py:2878`); this was the one failure that left no trace at all.
        if (written == null) failedWrites++
        return written
    }

    /** A taken-back move must not survive as labeled data (`tracker.py:2782`). */
    fun undo() {
        pending = null
        recorder?.undoLast()
    }

    fun stop(): SessionResult? {
        val active = recorder ?: return null
        recorder = null
        pending = null
        failedWrites = 0
        return active.finish()
    }

    private fun startRecorder(frame: CaptureFrame): SessionRecorder? {
        if (!prefs().enabled || stoppedReason != null) return null
        return open(frame)?.also { recorder = it }
    }

    private fun capReached(): Boolean {
        val cap = prefs().capBytes
        if (cap <= 0L || existingBytes() + (recorder?.bytes ?: 0L) < cap) return false
        stoppedReason = "recording stopped: ${cap / (KB * KB)} MB limit reached"
        recorder?.finish()
        recorder = null
        pending = null
        return true
    }

    private fun writeFailure(): String? = if (failedWrites == 0) null else "frame could not be written — $failedWrites lost"
}
