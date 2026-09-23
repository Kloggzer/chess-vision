package com.chesslab.tracker.record

import com.chesslab.tracker.io.Jsonl
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File
import java.io.RandomAccessFile
import java.time.Instant
import java.util.Locale

private val JSON = Json { encodeDefaults = true }

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
    /** Written even when 1: a consumer reading only `video_file` gets the FIRST minute and no hint of the rest. */
    val segments: Int = 1,
    /** The one part nothing downstream can measure; 0 means the encoder was armed at the commit. */
    val preRollNs: Long = 0L,
    /** The recordings on disk measure 8,1 to 19,6 Mbit/s. 0 means written before this, not zero. */
    val bitRateRequested: Int = 0,
    val bitRate: Int = 0,
)

/** A seam so the recorder's rules are testable on the desktop JVM. Returns 0 when nothing could be written. */
fun interface FrameWriter {
    fun write(dest: File): Long
}

/** Key names are `collect.py::SessionWriter.capture`'s. */
@Serializable
private data class LogEntry(
    val frame: String,
    val ply: Int,
    val fen: String,
    val ts: String,
    @SerialName("move_san") val moveSan: String?,
    // Verified live at capture: `slice` warps exactly these instead of re-detecting.
    val corners: List<List<Double>>,
)

/** Raw frame + FEN + corners, what `chesslab slice` consumes. Warps and crops are derived: storing them would be
 *  dead weight where bytes are the reason the feature is opt-in. */
class SessionRecorder(
    val dir: File,
    private val meta: SessionMeta,
    private val now: () -> String = { Instant.now().toString() },
) {
    private val framesDir = File(dir, "frames")
    private val logFile = File(dir, "log.jsonl")
    private val entries = mutableListOf<LogEntry>()
    private var video: SessionVideoMeta? = null

    /** Was darueber steht, ist ein abgerissener Satz. */
    private var logLength = 0L

    val sessionId: String get() = meta.sessionId
    val count: Int get() = entries.size

    /** Accumulated, never restated by walking the directory. */
    var bytes: Long = 0L
        private set

    init {
        framesDir.mkdirs()
        logFile.writeText("")
        writeSessionYaml()
    }

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
            // A frame no log line references is a file `slice` trips over, and its index would be reused.
            dest.delete()
            return null
        }
        // Die Logzeile IST der Commit: geht sie nicht durch, ist das JPEG verwaist.
        val entry = LogEntry(rel, ply, fen, now(), moveSan, cornerPairs(corners))
        val logged =
            runCatching {
                cutTornTail()
                Jsonl.appendEncoded(logFile, JSON.encodeToString(LogEntry.serializer(), entry))
                logLength = logFile.length()
            }.isSuccess
        if (!logged) {
            dest.delete()
            return null
        }
        bytes += written
        entries += entry
        return rel
    }

    /** Frame file and log line go together. */
    fun undoLast(): Boolean {
        val last = entries.removeLastOrNull() ?: return false
        val file = File(dir, last.frame)
        bytes -= file.length()
        file.delete()
        Jsonl.replaceEncoded(logFile, entries.map { JSON.encodeToString(LogEntry.serializer(), it) })
        logLength = logFile.length()
        return true
    }

    /** Ein halber Satz vom gescheiterten Anhang muss weg, sonst klebt der naechste daran. Kuerzen braucht keinen
     *  Platz, auch auf voller Platte. */
    private fun cutTornTail() {
        if (logFile.length() > logLength) RandomAccessFile(logFile, "rw").use { it.setLength(logLength) }
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
                // -1: 0 would claim these frames came from the rig's first camera.
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
