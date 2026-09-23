package com.chesslab.tracker.sync

import com.chesslab.tracker.io.writeAtomic
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File

/** Its presence keeps the next run from resending. */
const val TRANSFER_MARK = "transfer.json"

/** "No file changed for two minutes" is the cheapest honest proof nobody is writing: a background worker cannot
 *  ask the live tracker. */
const val QUIET_MS = 2 * 60 * 1000L

private val JSON =
    Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

/** [path] is relative to `filesDir`, which IS the wire format. */
data class UploadFile(
    val path: String,
    val bytes: Long,
    val source: File,
)

data class UploadPlan(
    val sessionId: String,
    val files: List<UploadFile>,
) {
    val bytes: Long get() = files.sumOf { it.bytes }
}

/** Read by the UI, never by the server. */
@Serializable
data class TransferMark(
    val server: String,
    val at: Long,
    val bytes: Long,
    val files: Int,
    val status: String,
)

fun readMark(sessionDir: File): TransferMark? {
    val file = File(sessionDir, TRANSFER_MARK)
    if (!file.isFile) return null
    return runCatching { JSON.decodeFromString(TransferMark.serializer(), file.readText()) }.getOrNull()
}

fun writeMark(
    sessionDir: File,
    mark: TransferMark,
) = writeAtomic(File(sessionDir, TRANSFER_MARK), JSON.encodeToString(TransferMark.serializer(), mark))

/** Oldest first: the user walks away from the newest mid-upload, and a starved backlog costs the storage cap. */
fun pendingSessions(
    sessionsDir: File,
    now: Long,
): List<File> = unsentSessions(sessionsDir).filterNot { isEmptyRecording(it) }.filter { now - newestMs(it) >= QUIET_MS }

/** No video, no frames, no log rows — sending one creates a `data/recordings/` entry without a crop. An EMPTY
 *  FILE is different and still sent: a 0-byte `log.jsonl` sits beside a video labeled from the game record. */
fun isEmptyRecording(dir: File): Boolean {
    val video = File(dir, "video.mp4")
    if (video.isFile && video.length() > 0L) return false
    if ((File(dir, "frames").list()?.size ?: 0) > 0) return false
    return (File(dir, "log.jsonl").takeIf { it.isFile }?.length() ?: 0L) == 0L
}

fun emptyRecordings(sessionsDir: File): List<File> = unsentSessions(sessionsDir).filter { isEmptyRecording(it) }

/** Residue of KILLED processes and older builds. Never touches a marked session or one younger than [QUIET_MS]
 *  (a live recorder). Returns the names: silent cleanup is how data loss goes unexplained. */
fun sweepEmptyRecordings(
    sessionsDir: File,
    now: Long,
): List<String> =
    emptyRecordings(sessionsDir)
        .filter { now - newestMs(it) >= QUIET_MS }
        .filter { it.deleteRecursively() }
        .map { it.name }

const val DAY_MS = 24 * 60 * 60 * 1000L

/** `landed` is on the PC, so after [retentionMs] it leaves the phone. `held` stays — which copy is right is a
 *  human's call. 0 keeps everything. */
fun sweepSentRecordings(
    sessionsDir: File,
    now: Long,
    retentionMs: Long,
): List<String> {
    if (retentionMs <= 0L) return emptyList()
    return (sessionsDir.listFiles { f: File -> f.isDirectory }?.toList() ?: emptyList())
        .filter { dir -> readMark(dir)?.let { it.status == "landed" && now - it.at >= retentionMs } == true }
        .filter { it.deleteRecursively() }
        .map { it.name }
        .sorted()
}

fun unsentSessions(sessionsDir: File): List<File> =
    (sessionsDir.listFiles { f: File -> f.isDirectory }?.toList() ?: emptyList())
        .filter { readMark(it) == null }
        .sortedBy { it.name }

private fun newestMs(dir: File): Long = dir.walkBottomUp().maxOfOrNull { it.lastModified() } ?: 0L

/** Plus every game record that names it: `training-video-pack` needs the move list. An open game transfers
 *  anyway — withholding the recording is how a gigabyte gets lost to a storage cap. */
fun planFor(
    sessionDir: File,
    gamesDir: File,
): UploadPlan? {
    val sessionId = sessionDir.name
    val sessionFiles =
        sessionDir
            .walkTopDown()
            .filter { it.isFile && it.name != TRANSFER_MARK }
            .map { UploadFile("sessions/$sessionId/${it.relativeTo(sessionDir).invariantPath()}", it.length(), it) }
            .toList()
    if (sessionFiles.isEmpty()) return null

    val gameStems =
        (gamesDir.listFiles { f: File -> f.isFile && f.name.endsWith(".json") }?.toList() ?: emptyList())
            .filter { file ->
                file.readText().let {
                    it.contains("\"sessionId\":\"$sessionId\"") ||
                        it.contains("\"sessionId\": \"$sessionId\"")
                }
            }.map { it.name.removeSuffix(".json") }
    val gameFiles =
        gameStems
            .flatMap { stem -> listOf(File(gamesDir, "$stem.json"), File(gamesDir, "$stem.pgn")) }
            .filter { it.isFile }
            .map { UploadFile("games/${it.name}", it.length(), it) }

    return UploadPlan(sessionId, sessionFiles + gameFiles)
}

/** A `\` in the wire format would still be a wrong path. */
private fun File.invariantPath(): String = path.replace(File.separatorChar, '/')
