package com.chesslab.tracker.record

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File
import java.time.Instant
import java.util.Locale

private val JSON = Json { encodeDefaults = true }

/** What `session.yaml` says. Grouped because the recorder's constructor is otherwise 8 wide. */
data class SessionMeta(
    val sessionId: String,
    val profile: String,
    val frameWidth: Int,
    val frameHeight: Int,
    val notes: String = "move-tracker recording",
    val mode: String = "track",
)

data class SessionResult(
    val sessionId: String,
    val frames: Int,
    val bytes: Long,
)

data class SessionVideoMeta(
    val width: Int,
    val height: Int,
    val durationNs: Long,
    val bytes: Long,
    val error: String? = null,
    /**
     * How many files the recording is spread over: `video.mp4`, then `video-001.mp4`, …
     *
     * A consumer that reads only `video_file` gets the FIRST minute of a long recording and no
     * hint that the rest exists, so the count is written even when it is 1 — an absent field is a
     * pre-segment session, a present one states the truth.
     */
    val segments: Int = 1,
    /**
     * Footage ahead of the first committed move, in nanoseconds.
     *
     * The pre-roll is the one part of a recording nothing downstream can measure: a slicer sees
     * frames, not the commit they preceded. Written so a session states its own answer — 0 means
     * the encoder was armed at the commit and the reach-and-think is gone.
     */
    val preRollNs: Long = 0L,
    /**
     * bit/s asked for, and what the encoder agreed to.
     *
     * Nothing wrote these down, and the recordings on disk measure 8,1 to 19,6 Mbit/s — a factor of
     * 2,4 nobody saw. 0 means a recording from before this was written, not a recording at zero.
     */
    val bitRateRequested: Int = 0,
    val bitRate: Int = 0,
)

/**
 * Writes the frame. A seam because encoding a camera frame is OpenCV/Android work and the
 * recorder's rules — which capture is written, which is skipped, which is taken back — must be
 * testable on the desktop JVM.
 *
 * Returns the bytes written, or 0 when nothing could be written.
 */
fun interface FrameWriter {
    fun write(dest: File): Long
}

/** One `log.jsonl` line. Key names are `collect.py::SessionWriter.capture`'s, not this app's. */
@Serializable
private data class LogEntry(
    val frame: String,
    val ply: Int,
    val fen: String,
    val ts: String,
    @SerialName("move_san") val moveSan: String?,
    // Board corners [a8, h8, h1, a1] in FRAME pixels (entry.md invariant 11), verified live at
    // capture time — `slice` warps exactly these instead of re-detecting.
    val corners: List<List<Double>>,
)

/**
 * The on-device port of `collect.py::SessionWriter` — a correctly tracked game is free labeled
 * training data, and this is the form `chesslab slice` consumes: raw frame + FEN + corners.
 *
 * Frames are the RAW camera frame. The warp and the CNN crops are derived data that `slice`
 * recomputes from the corners, so storing them would be dead weight in the one place on the phone
 * where bytes are the reason the feature is opt-in.
 */
class SessionRecorder(
    val dir: File,
    private val meta: SessionMeta,
    private val now: () -> String = { Instant.now().toString() },
) {
    private val framesDir = File(dir, "frames")
    private val logFile = File(dir, "log.jsonl")
    private val entries = mutableListOf<LogEntry>()
    private var video: SessionVideoMeta? = null

    val sessionId: String get() = meta.sessionId
    val count: Int get() = entries.size

    /** Bytes this session has written. Accumulated, never restated by walking the directory. */
    var bytes: Long = 0L
        private set

    init {
        framesDir.mkdirs()
        logFile.writeText("")
        writeSessionYaml()
    }

    /** Returns the relative frame path, or `null` when the frame could not be written. */
    fun capture(
        writer: FrameWriter,
        ply: Int,
        fen: String,
        moveSan: String?,
        corners: FloatArray,
    ): String? {
        val rel = "frames/%04d.jpg".format(Locale.ROOT, entries.size)
        val dest = File(dir, rel)
        val written = runCatching { writer.write(dest) }.getOrDefault(0L)
        if (written <= 0L) {
            // A half-written frame that no log line references is not data, it is a file `slice`
            // trips over — and the next capture would reuse this index and read as a success.
            dest.delete()
            return null
        }
        bytes += written
        val entry = LogEntry(rel, ply, fen, now(), moveSan, cornerPairs(corners))
        entries += entry
        logFile.appendText(JSON.encodeToString(LogEntry.serializer(), entry) + "\n")
        return rel
    }

    /**
     * `SessionWriter.undo` — frame file and log line go together. A wrong move must not survive as
     * labeled data, and a log line without its frame is a broken session for `slice`.
     */
    fun undoLast(): Boolean {
        val last = entries.removeLastOrNull() ?: return false
        val file = File(dir, last.frame)
        bytes -= file.length()
        file.delete()
        logFile.writeText(entries.joinToString("") { JSON.encodeToString(LogEntry.serializer(), it) + "\n" })
        return true
    }

    fun finish(): SessionResult {
        writeSessionYaml()
        return SessionResult(meta.sessionId, entries.size, bytes)
    }

    @Synchronized
    fun updateVideo(value: SessionVideoMeta) {
        video = value
        writeSessionYaml()
    }

    private fun writeSessionYaml() {
        val yaml =
            buildString {
                appendLine("session_id: ${meta.sessionId}")
                appendLine("profile: ${meta.profile}")
                appendLine("mode: ${meta.mode}")
                appendLine("created_at: '${now()}'")
                // -1 = not a desktop capture device. The phone has no `camera_index`, and 0 would
                // claim these frames came from the rig's first camera.
                appendLine("camera_index: -1")
                appendLine("frame_size: [${meta.frameWidth}, ${meta.frameHeight}]")
                video?.let {
                    appendLine("video_file: video.mp4")
                    appendLine("video_segments: ${it.segments}")
                    appendLine("video_size: [${it.width}, ${it.height}]")
                    appendLine("video_duration_ns: ${it.durationNs}")
                    appendLine("video_bytes: ${it.bytes}")
                    appendLine("video_pre_roll_ns: ${it.preRollNs}")
                    if (it.bitRateRequested > 0) appendLine("video_bit_rate_requested: ${it.bitRateRequested}")
                    if (it.bitRate > 0) appendLine("video_bit_rate: ${it.bitRate}")
                    it.error?.let { error -> appendLine("video_error: '${error.replace("'", "''")}'") }
                }
                appendLine("notes: '${meta.notes.replace("'", "''")}'")
            }
        File(dir, "session.yaml").writeText(yaml)
    }
}

private fun cornerPairs(corners: FloatArray): List<List<Double>> = corners.toList().chunked(2).map { pair -> pair.map { it.toDouble() } }
