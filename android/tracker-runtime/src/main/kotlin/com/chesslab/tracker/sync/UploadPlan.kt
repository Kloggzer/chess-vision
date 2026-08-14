package com.chesslab.tracker.sync

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File

/** The marker a transferred session carries. Its presence is what keeps the next run from resending. */
const val TRANSFER_MARK = "transfer.json"

/**
 * A session younger than this is assumed to be still recording.
 *
 * The recorder writes a frame per committed move and closes the directory only when the game ends,
 * so "no file has changed for two minutes" is the cheapest honest proof that nobody is writing —
 * and the alternative, asking the live tracker, is unavailable to a background worker that runs
 * when the app is gone.
 */
const val QUIET_MS = 2 * 60 * 1000L

private val JSON =
    Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

/** One file of the bundle. [path] is relative to the phone's `filesDir`, which IS the wire format. */
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

/** What the phone wrote down about a completed transfer — read by the UI, never by the server. */
@Serializable
data class TransferMark(
    val server: String,
    val at: Long,
    val bytes: Long,
    val files: Int,
    /** `landed` or `held`, straight from the server's answer. */
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
) = File(sessionDir, TRANSFER_MARK).writeText(JSON.encodeToString(TransferMark.serializer(), mark))

/**
 * The sessions worth sending, oldest first.
 *
 * Oldest first on purpose: the session the user just played is the one they are most likely to walk
 * away from mid-upload, and a resumed transfer costs nothing while a starved backlog costs the
 * phone's storage cap.
 */
fun pendingSessions(
    sessionsDir: File,
    now: Long,
): List<File> = unsentSessions(sessionsDir).filterNot { isEmptyRecording(it) }.filter { now - newestMs(it) >= QUIET_MS }

/**
 * A recording with nothing to label: no video, no reference frames, no log rows.
 *
 * Four of the phone's 33 sessions were this on 2026-08-13 — a tracker that ran and committed
 * nothing, leaving a diagnostics timeline and no data. Sending them would cost the network nothing
 * and the user something: a `data/realgames/` entry that looks like a recording and holds no crop.
 *
 * An EMPTY FILE is a different thing and is still sent — `20260813-122407` carries a 0-byte
 * `log.jsonl` beside a 1.9 GB video whose labels come from the game record.
 */
fun isEmptyRecording(dir: File): Boolean {
    val video = File(dir, "video.mp4")
    if (video.isFile && video.length() > 0L) return false
    if ((File(dir, "frames").list()?.size ?: 0) > 0) return false
    return (File(dir, "log.jsonl").takeIf { it.isFile }?.length() ?: 0L) == 0L
}

/** Unsent recordings that carry nothing to label — counted for the UI, never transferred. */
fun emptyRecordings(sessionsDir: File): List<File> = unsentSessions(sessionsDir).filter { isEmptyRecording(it) }

/**
 * The app-start janitor: deletes leftover zero-commit sessions.
 *
 * With the pre-roll in place a moveless run creates no session directory at all, so what this
 * finds is the residue of KILLED processes and of builds before 2026-08-14 — exactly the
 * directories [isEmptyRecording] already describes: no video, no frames, no log rows. Sessions
 * with a `transfer.json` mark are never touched ([unsentSessions] excludes them), and neither is
 * anything younger than [QUIET_MS]: a directory still being written belongs to a live recorder,
 * not to the janitor. Returns the deleted names so the caller can say what happened — silent
 * cleanup is how data loss goes unexplained.
 */
fun sweepEmptyRecordings(
    sessionsDir: File,
    now: Long,
): List<String> =
    emptyRecordings(sessionsDir)
        .filter { now - newestMs(it) >= QUIET_MS }
        .filter { it.deleteRecursively() }
        .map { it.name }

/** Every session without a transfer marker, settled or not — what "still being written" counts. */
fun unsentSessions(sessionsDir: File): List<File> =
    (sessionsDir.listFiles { f: File -> f.isDirectory }?.toList() ?: emptyList())
        .filter { readMark(it) == null }
        .sortedBy { it.name }

private fun newestMs(dir: File): Long = dir.walkBottomUp().maxOfOrNull { it.lastModified() } ?: 0L

/**
 * The bundle for one session: its own files, plus every game record that names it.
 *
 * The game record is not decoration — `training-video-pack` needs the move list to label a frame,
 * and the link is `StoredGame.sessionId`. A session whose game is still open transfers anyway; the
 * server states plainly that it could not build a pack, which is recoverable, while withholding the
 * recording until some later run is how a gigabyte gets lost to a storage cap.
 */
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

/** Windows would never see these paths, but a `\` in the wire format would still be a wrong path. */
private fun File.invariantPath(): String = path.replace(File.separatorChar, '/')
