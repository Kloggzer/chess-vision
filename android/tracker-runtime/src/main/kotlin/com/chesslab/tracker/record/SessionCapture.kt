package com.chesslab.tracker.record

import kotlinx.serialization.Serializable
import java.io.File

private const val KB: Long = 1024L

/**
 * Bytes under `filesDir/sessions` at which recording stops. 8 GB since 2026-09-13.
 *
 * It was 1 GB while [videoBytesOf] counted only the first segment, so a recording really ran to
 * ~10 GB. Counting correctly at 1 GB would have cut a game off after 4,4 minutes and a capture
 * after 2,0 — the repair alone would have been a regression. 8 GB is 35,6 resp. 15,9 minutes.
 */
const val DEFAULT_CAP_BYTES: Long = 8L * KB * KB * KB

/**
 * Off by default — recording writes QHD video plus full-resolution reference JPEGs, and that
 * storage cost is the whole reason this is a choice and not a behaviour.
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

    /** A frame size is enough to open the video bundle; labeled stills still require [grab]. */
    fun sessionFrame(): CaptureFrame? = grab()

    /** Non-null while the profile and the delivered frame size disagree — see [RecordingGates]. */
    fun geometryNote(): String?
}

private data class Pending(
    val ply: Int,
    val fen: String,
    val san: String?,
)

data class RecordingHooks(
    val opened: (SessionRecorder) -> Unit = {},
    val finished: (SessionResult) -> Unit = {},
    val reason: () -> String? = { null },
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
    private val hooks: RecordingHooks = RecordingHooks(),
) {
    private var pending: Pending? = null

    /**
     * Whether the running game has committed a ply — the gate in front of the session DIRECTORY.
     *
     * Until the first commit, nothing exists on disk: no `session.yaml`, no timeline, no video
     * (the encoder buffers in memory, `PreRollRing`). Board setup, ArUco taping, calibration and
     * empty-board tests all run the tracker without committing, and they used to leave a full
     * recording each — nine of eleven transferred recordings on 2026-08-13/14, 4.7 GB deleted by
     * hand. A run that never commits leaves nothing to delete.
     */
    private var committed = false

    var recorder: SessionRecorder? = null
        private set

    /** Non-null once the size cap stopped recording. Nothing is overwritten or wrapped. */
    var stoppedReason: String? = null
        private set

    /** Frames the writer could not produce in the RUNNING session. Reset by [stop]. */
    var failedWrites: Int = 0
        private set

    /**
     * Move photos lost to supersession when the board never went quiet between commits.
     *
     * The photo for a committed move is deferred until the board is quiet; if a new move commits
     * while the deferred photo is still pending, the earlier ply's frame is lost without trace
     * (caught on 2026-08-14: ply Nc6 of session 20260814-204855 and ply Nf3 of session
     * 20260814-210104 committed but had no row in log.jsonl). This counter surfaces the loss so
     * the user sees that something went wrong, not silent data corruption.
     *
     * Reset by [stop].
     */
    var supersededFrames: Int = 0
        private set

    /**
     * Why nothing is being written, most severe first: recording halted, then data actually lost,
     * then a skip that is by design (geometry suspended, inventory violation).
     */
    val reason: String?
        get() =
            stoppedReason
                ?: writeFailure()
                ?: supersededFrameMessage()
                ?: gates.reason
                ?: hooks.reason().takeIf { prefs().enabled }

    /** Apply a live preference change at a frame/status boundary. Returns true on lifecycle change. */
    fun syncEnabled(): Boolean {
        val before = recorder
        if (prefs().enabled) {
            if (recorder == null) start() else capReached()
        } else {
            stop()
        }
        return before !== recorder
    }

    /**
     * Open the session — but only once a ply has committed ([committed]).
     *
     * This used to open "as soon as tracking has a frame", because the VIDEO could not wait for
     * the first move: the lead-in is where a bad first move, focus settling and the initial
     * anchor are debugged. The pre-roll ring made that reasoning obsolete — the encoder now runs
     * from tracking start and the last 20 s land in the file retroactively — so the eager open
     * only manufactured the moveless junk sessions the gate above describes. Geometry is still
     * not required here: [CaptureSource.sessionFrame] supplies only the source dimensions, and
     * the video must also capture the periods in which geometry is broken.
     */
    fun start(): SessionRecorder? {
        val active = recorder
        if (active != null) return active
        val recordingOff = !prefs().enabled || stoppedReason != null
        if (!committed || recordingOff || capReached()) return null
        return source.sessionFrame()?.let(::startRecorder)
    }

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
        // The first committed ply is what turns a run into a recording. The session opens HERE,
        // before the photo gates: a geometry mismatch or an inventory violation blocks the still,
        // never the video bundle the commit has just earned.
        committed = true
        if (recorder == null) start()
        gates.inventoryFilter = prefs().inventoryFilter
        // Count BEFORE the gate: the gate judges the NEW ply's FEN, but what it clears is the
        // EARLIER ply's deferred photo, taken under its own FEN and never gated. Counting after
        // it left that loss invisible — the very case this counter exists for.
        val oldPending = pending
        if (oldPending != null && oldPending.ply != ply) {
            supersededFrames++
        }
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
        // Python logs here (`tracker.py`); this was the one failure that left no trace at all.
        if (written == null) failedWrites++
        return written
    }

    /** A taken-back move must not survive as labeled data (`tracker.py`). */
    fun undo() {
        pending = null
        recorder?.undoLast()
    }

    fun stop(): SessionResult? {
        // The next game earns its own directory with its own first commit.
        committed = false
        // VOR dem fruehen Ausstieg: `queue()` zaehlt auch ohne offenen Recorder hoch, und die
        // Zahlen wanderten dann als "Zug-Foto verloren" in eine Partie, die nichts verloren hat.
        failedWrites = 0
        supersededFrames = 0
        // Der Riegel rastete dauerhaft ein: bis zum Prozessneustart nahm die App nichts mehr auf,
        // auch nachdem der Nutzer Aufnahmen geloescht hatte — das einzige Mittel, das er hat.
        // `capReached()` misst beim naechsten Versuch neu und setzt ihn sofort wieder, wenn noetig.
        stoppedReason = null
        val active = recorder ?: return null
        recorder = null
        pending = null
        return active.finish().also(hooks.finished)
    }

    private fun startRecorder(frame: CaptureFrame): SessionRecorder? {
        if (!prefs().enabled || stoppedReason != null) return null
        return open(frame)?.also {
            recorder = it
            hooks.opened(it)
        }
    }

    private fun capReached(): Boolean {
        val cap = prefs().capBytes
        val active = recorder
        val videoBytes = active?.let { videoBytesOf(it.dir) } ?: 0L
        if (cap <= 0L || existingBytes() + (active?.bytes ?: 0L) + videoBytes < cap) return false
        stoppedReason = "recording stopped: ${cap / (KB * KB)} MB limit reached"
        recorder?.finish()?.also(hooks.finished)
        recorder = null
        pending = null
        return true
    }

    private fun supersededFrameMessage(): String? =
        if (supersededFrames == 0) {
            null
        } else {
            "$supersededFrames move photo(s) lost — board never went quiet between commits"
        }

    private fun writeFailure(): String? = if (failedWrites == 0) null else "frame could not be written — $failedWrites lost"
}

/**
 * Every segment, not just `video.mp4`. Naming follows `CameraVideo.segmentFile`.
 *
 * `SessionVideoMeta.segments` is only written when the encoder FINISHES, so a running recording
 * still reads 1 and the cap counted its first minute as the whole file — factor 10 on
 * `2026-09-11-20-00-52`. Consecutive names, stopping at the first gap: never a `listFiles()` here.
 */
private fun videoBytesOf(dir: File): Long {
    var total = 0L
    var index = 0
    while (true) {
        val length = File(dir, if (index == 0) VIDEO_FILE else VIDEO_SEGMENT.format(index)).length()
        if (length <= 0L) return total
        total += length
        index++
    }
}

private const val VIDEO_FILE = "video.mp4"
private const val VIDEO_SEGMENT = "video-%03d.mp4"
