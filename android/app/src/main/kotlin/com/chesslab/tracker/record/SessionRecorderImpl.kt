package com.chesslab.tracker.record

import com.chesslab.engine.api.Decision
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.geometry.BoardCorners
import com.chesslab.tracker.service.SessionRecorder
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.opencv.core.Mat
import org.opencv.imgcodecs.Imgcodecs
import java.io.File
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/**
 * Implements [SessionRecorder] with deferred clean-frame capture, matching the
 * Python `_queue_session_capture` / `_flush_session_capture` pattern
 * (tracker.py:1964-1999).
 *
 * Output layout (compatible with `chesslab slice`):
 * ```
 * sessions/<yyyyMMdd-HHmmss>/
 *   frames/0000.jpg …
 *   log.jsonl
 * ```
 *
 * JSONL schema per record:
 * `{frame, ply, fen, move_san, ts, corners: [[x,y]×4], decision: {...}, feedback: "good"|"bad"}`
 *
 * - JPEG quality 92, full camera frame.
 * - Deferred capture: a committed move queues a pending capture; the next clean
 *   frame (no occlusion) flushes it.
 * - Undo flips the last record's feedback to "bad" (hard negative).
 *
 * Recording is best-effort — errors are caught and never propagate to the
 * caller (the tracker must not break on I/O failures).
 *
 * Thread-safe: all public methods may be called from the tracker's frame thread.
 */
class SessionRecorderImpl(
    private val dir: File,
) : SessionRecorder {
    private val framesDir = File(dir, "frames").apply { mkdirs() }
    private val logFile = File(dir, "log.jsonl")
    private val json = Json { prettyPrint = false }

    /** In-memory copies of the full log for fast undo rewrites. */
    private val records = mutableListOf<MoveRecord>()

    @Volatile private var pendingCapture: PendingCapture? = null

    @Volatile private var lastFrame: Mat? = null

    @Volatile private var lastCorners: BoardCorners? = null

    @Volatile private var lastFrameWidth = 0

    @Volatile private var lastFrameHeight = 0

    private var frameIdx = 0
    private var started = false

    init {
        dir.mkdirs()
        framesDir.mkdirs()
    }

    // ── SessionRecorder interface ──────────────────────────────────────────

    override fun onRawFrame(
        mat: Mat,
        corners: BoardCorners?,
        frameWidth: Int,
        frameHeight: Int,
    ) {
        synchronized(this) {
            lastFrame?.release()
            lastFrame = mat.clone()
            lastCorners = corners
            lastFrameWidth = frameWidth
            lastFrameHeight = frameHeight
        }
    }

    override fun onFrame(
        boardFenBefore: String,
        timestampNs: Long,
    ) {
        // Not used — the MoveCommitted event carries everything we need.
    }

    override fun onEvent(event: TrackerEvent) {
        when (event) {
            is TrackerEvent.MoveCommitted -> onMoveCommitted(event.fen, event.san, event.decision)
            is TrackerEvent.FeedbackRecorded -> onUndo(event.san)
            else -> {}
        }
    }

    override fun onCleanFrame() {
        flushIfClean()
    }

    // ── Internal logic ─────────────────────────────────────────────────────

    private fun onMoveCommitted(
        fenAfter: String,
        san: String,
        decision: Decision,
    ) {
        synchronized(this) {
            pendingCapture =
                PendingCapture(
                    ply = records.size + 1,
                    fen = fenAfter,
                    san = san,
                    decision = decision,
                )
            if (!started) {
                dir.mkdirs()
                started = true
            }
        }
    }

    private fun onUndo(san: String) {
        synchronized(this) {
            if (records.isEmpty()) return
            val idx = records.indexOfLast { it.san == san }
            if (idx < 0) return
            val updated = records[idx].copy(feedback = MoveRecord.FEEDBACK_BAD)
            records[idx] = updated
            writeLog()
        }
    }

    /**
     * Flush the pending capture to disk if the board is clean.
     */
    @Suppress("TooGenericExceptionCaught", "SwallowedException")
    fun flushIfClean() {
        val pending: PendingCapture
        val frame: Mat
        val corners: BoardCorners?
        synchronized(this) {
            pending = pendingCapture ?: return
            frame = lastFrame ?: return
            corners = lastCorners
        }

        try {
            val fname = "frames/${"%04d".format(frameIdx)}.jpg"
            val file = File(dir, fname)
            file.parentFile?.mkdirs()
            Imgcodecs.imwrite(file.absolutePath, frame)

            val ts = System.currentTimeMillis()
            val tsStr =
                Instant
                    .ofEpochMilli(ts)
                    .atOffset(ZoneOffset.UTC)
                    .format(DateTimeFormatter.ISO_INSTANT)

            val entry = buildLogEntry(pending, fname, corners, tsStr)
            val line = json.encodeToString(entry) + "\n"

            synchronized(this) {
                logFile.appendText(line)
                records.add(
                    MoveRecord(
                        ply = pending.ply,
                        san = pending.san,
                        fen = pending.fen,
                        corners = corners,
                        decision = pending.decision,
                        feedback = MoveRecord.FEEDBACK_GOOD,
                        ts = ts,
                        frameFile = fname,
                    ),
                )
                frameIdx++
                pendingCapture = null
            }
        } catch (e: Exception) {
            // Recording is best-effort — never break tracking (tracker.py:1998).
        }
    }

    /** Build one log entry. */
    private fun buildLogEntry(
        pending: PendingCapture,
        fname: String,
        corners: BoardCorners?,
        tsStr: String,
    ): LogEntry =
        LogEntry(
            frame = fname,
            ply = pending.ply,
            fen = pending.fen,
            moveSan = pending.san,
            ts = tsStr,
            corners = corners?.toList()?.map { listOf(it.x.toDouble(), it.y.toDouble()) },
            decision = pending.decision?.let { DecisionEntry.fromDecision(it) },
            feedback = MoveRecord.FEEDBACK_GOOD,
        )

    /** Build a log entry for an already-recorded [MoveRecord] (used in writeLog). */
    private fun buildLogEntry(r: MoveRecord): LogEntry =
        LogEntry(
            frame = r.frameFile,
            ply = r.ply,
            fen = r.fen,
            moveSan = r.san,
            ts =
                if (r.ts > 0) {
                    Instant.ofEpochMilli(r.ts).atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT)
                } else {
                    ""
                },
            corners = r.corners?.toList()?.map { listOf(it.x.toDouble(), it.y.toDouble()) },
            decision = r.decision?.let { DecisionEntry.fromDecision(it) },
            feedback = r.feedback,
        )

    /** Rewrite the entire log.jsonl from the in-memory [records] list. */
    @Suppress("TooGenericExceptionCaught", "SwallowedException")
    private fun writeLog() {
        try {
            logFile.bufferedWriter().use { w ->
                for (r in records) {
                    val entry = buildLogEntry(r)
                    w.write(json.encodeToString(entry))
                    w.newLine()
                }
            }
        } catch (e: Exception) {
            // Best-effort.
        }
    }

    /** @return the number of flushed (captured) move records. */
    fun count(): Int = synchronized(this) { records.size }

    /** @return the session directory. */
    fun sessionDir(): File = dir

    /** @return the log.jsonl file. */
    fun logFile(): File = logFile

    /** @return the session ID (directory name). */
    fun sessionId(): String = dir.name

    /** Release OpenCV resources. Safe to call multiple times. */
    fun close() {
        synchronized(this) {
            lastFrame?.release()
            lastFrame = null
        }
    }

    private data class PendingCapture(
        val ply: Int,
        val fen: String,
        val san: String,
        val decision: Decision,
    )
}

// ── Serializable JSON entry types ───────────────────────────────────────

@Serializable
internal data class DecisionEntry(
    val decider: String,
    val reason: String,
    val best: Double,
    val second: Double,
    val margin: Double,
    val changed: List<String>,
    @SerialName("shadow_veto") val shadowVeto: List<String>,
    val occluded: List<String>,
    @SerialName("prior_used") val priorUsed: Boolean,
) {
    companion object {
        fun fromDecision(d: Decision): DecisionEntry =
            DecisionEntry(
                decider = d.decider,
                reason = d.reason,
                best = d.best,
                second = d.second,
                margin = d.margin,
                changed = d.changed,
                shadowVeto = d.shadowVeto,
                occluded = d.occluded,
                priorUsed = d.priorUsed,
            )
    }
}

@Serializable
internal data class LogEntry(
    val frame: String,
    val ply: Int,
    val fen: String,
    @SerialName("move_san") val moveSan: String,
    val ts: String,
    val corners: List<List<Double>>? = null,
    val decision: DecisionEntry? = null,
    val feedback: String,
)
