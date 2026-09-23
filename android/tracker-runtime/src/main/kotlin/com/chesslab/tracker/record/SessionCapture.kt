package com.chesslab.tracker.record

import kotlinx.serialization.Serializable
import java.io.File
import java.io.IOException

private const val KB: Long = 1024L

/** 8 GB: it was 1 GB while [videoBytesOf] counted only the first segment, so a recording really ran to ~10 GB.
 *  Counting correctly at 1 GB would have cut a game off after 4,4 minutes. */
const val DEFAULT_CAP_BYTES: Long = 8L * KB * KB * KB

/** Off by default — QHD video plus full-resolution JPEGs is the storage cost that makes this a choice. */
@Serializable
data class RecordingPrefs(
    val enabled: Boolean = false,
    val inventoryFilter: Boolean = true,
    val capBytes: Long = DEFAULT_CAP_BYTES,
)

class CaptureFrame(
    val width: Int,
    val height: Int,
    val corners: FloatArray,
    val writer: FrameWriter,
)

interface CaptureSource {
    fun grab(): CaptureFrame?

    /** A frame size is enough to open the video bundle; labeled stills still require [grab]. */
    fun sessionFrame(): CaptureFrame? = grab()

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

/** The photo for a committed move is deferred: right after a move the hands are over the board. Taken at once
 *  only when the board is clean, else at the next quiet re-anchor. */
class SessionCaptureController(
    private val source: CaptureSource,
    private val open: (CaptureFrame) -> SessionRecorder?,
    private val gates: RecordingGates,
    private val prefs: () -> RecordingPrefs,
    // A cached supplier: the sessions directory is never walked on the capture path.
    private val existingBytes: () -> Long,
    private val hooks: RecordingHooks = RecordingHooks(),
) {
    private var pending: Pending? = null

    /** Until the first commit nothing exists on disk: setup, calibration and tests used to leave a full recording
     *  each (4.7 GB deleted by hand). A run that never commits leaves nothing. */
    private var committed = false

    var recorder: SessionRecorder? = null
        private set

    var stoppedReason: String? = null
        private set

    var failedWrites: Int = 0
        private set

    /** A new commit while the deferred photo is pending loses the earlier ply's frame; counted so the loss is
     *  visible. Reset by [stop]. */
    var supersededFrames: Int = 0
        private set

    /** Most severe first: halted, then data lost, then a skip by design. */
    val reason: String?
        get() =
            stoppedReason
                ?: writeFailure()
                ?: supersededFrameMessage()
                ?: gates.reason
                ?: hooks.reason().takeIf { prefs().enabled }

    fun syncEnabled(): Boolean {
        val before = recorder
        if (prefs().enabled) {
            if (recorder == null) start() else capReached()
        } else {
            stop()
        }
        return before !== recorder
    }

    /** Only once a ply has committed: the pre-roll ring puts the last 20 s in the file retroactively, so the eager
     *  open only made moveless junk sessions. Geometry is not required: the video must cover broken geometry too. */
    fun start(): SessionRecorder? {
        val active = recorder
        if (active != null) return active
        val recordingOff = !prefs().enabled || stoppedReason != null
        if (!committed || recordingOff || capReached()) return null
        return source.sessionFrame()?.let(::startRecorder)
    }

    fun queue(
        ply: Int,
        fen: String,
        san: String?,
        clean: Boolean,
    ) {
        if (recorder == null && !prefs().enabled) return
        // The session opens HERE, before the photo gates: they block the still, never the video bundle.
        committed = true
        if (recorder == null) start()
        gates.inventoryFilter = prefs().inventoryFilter
        // Count BEFORE the gate: it judges the NEW ply's FEN, but clears the EARLIER ply's photo.
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

    /** Both gates run AGAIN here, as in Python. */
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
        // BEFORE the recorder opens: a start the cap refused left an empty directory counting against the cap.
        val active = if (capReached()) null else (recorder ?: startRecorder(frame))
        if (active == null) return null
        pending = null
        val written = active.capture(frame.writer, due.ply, due.fen, due.san, frame.corners)
        if (written == null) failedWrites++
        return written
    }

    fun undo() {
        pending = null
        recorder?.undoLast()
    }

    fun stop(): SessionResult? {
        committed = false
        // VOR dem fruehen Ausstieg: `queue()` zaehlt auch ohne offenen Recorder hoch.
        failedWrites = 0
        supersededFrames = 0
        // Sonst rastete der Riegel bis zum Prozessneustart ein, auch nach dem Loeschen von Aufnahmen.
        stoppedReason = null
        val active = recorder ?: return null
        recorder = null
        pending = null
        return active.finish().also(hooks.finished)
    }

    /** That must halt RECORDING, not the event collector that called it. */
    private fun startRecorder(frame: CaptureFrame): SessionRecorder? {
        if (!prefs().enabled || stoppedReason != null) return null
        try {
            open(frame)?.also {
                recorder = it
                hooks.opened(it)
            }
        } catch (e: IOException) {
            stoppedReason = "recording could not start: ${e.message}"
        }
        return recorder
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

/** Every segment: `SessionVideoMeta.segments` is written only when the encoder FINISHES, so the cap read a running
 *  recording's first minute as the whole file (factor 10). Consecutive names; never a `listFiles()`. */
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
