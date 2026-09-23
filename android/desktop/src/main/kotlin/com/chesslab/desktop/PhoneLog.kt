package com.chesslab.desktop

import com.chesslab.tracker.io.Jsonl
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.float
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import java.time.Instant

private const val DEFAULT_AFTER_MOVE_MS = 250.0
private const val DEFAULT_BEFORE_MOVE_MS = 2000.0
private const val NS_PER_MS = 1_000_000.0

/** One committed ply as the phone wrote it down, at the video time its own clock puts it at. */
internal data class PlyMark(
    val ply: Int,
    val san: String,
    val uci: String,
    val fen: String,
    val videoMs: Double,
    /** The phone's quad when it wrote the row, source pixels `[a8, h8, h1, a1]`; null when the row has none. */
    val corners: FloatArray? = null,
) {
    val placement: String get() = fen.substringBefore(' ')
}

/** `[[x, y], …]` or flat `[x, y, …]` — the photo log writes pairs, the timeline writes eight numbers. */
internal fun cornersOf(element: JsonElement?): FloatArray? {
    val array = (element as? JsonArray) ?: return null
    val flat = array.flatMap { item -> (item as? JsonArray)?.map { it.jsonPrimitive.float } ?: listOf(item.jsonPrimitive.float) }
    return flat.takeIf { it.size == 8 }?.toFloatArray()
}

/**
 * The played game on the video's own time axis: the game record says WHICH position was on the board,
 * so a replay that re-derives the game and loses it can no longer mislabel anything (2026-08-15:
 * one missed opening move cost all 851 frames of a session). Ply 1 sits at the pre-roll, where the
 * phone flushed its ring, and every later ply follows by its own timestamp difference.
 */
internal class PlyTimeline(
    val marks: List<PlyMark>,
    private val afterMs: Double = DEFAULT_AFTER_MOVE_MS,
    private val beforeMs: Double = DEFAULT_BEFORE_MOVE_MS,
) {
    /**
     * The ply on the board at [videoMs], or null while a move is being made.
     *
     * A timestamp is the COMMIT, i.e. the board had already settled — so the band after it is
     * short, while the band before the next commit has to cover the reaching hand and the move.
     */
    fun plyAt(videoMs: Double): Int? {
        val index = marks.indexOfLast { it.videoMs <= videoMs }
        val next = marks.getOrNull(index + 1)
        if (next != null && next.videoMs - videoMs < beforeMs) return null
        if (index < 0) return 0
        if (videoMs - marks[index].videoMs < afterMs) return null
        return marks[index].ply
    }

    /** The marks whose time has passed between [fromMs] (exclusive) and [toMs] (inclusive). */
    fun crossed(
        fromMs: Double,
        toMs: Double,
    ): List<PlyMark> = marks.filter { it.videoMs > fromMs && it.videoMs <= toMs }
}

/**
 * The phone's own record of a run: `log.jsonl` beside the video says which ply was on the board
 * when, `session.yaml` says where the first one sits. Null for a camera-roll video — then the
 * tracker's own FEN is still the only source there is.
 */
internal fun sessionTimeline(
    video: File,
    options: List<String>,
): PlyTimeline? {
    val dir = video.parentFile ?: return null
    val preRoll = options.doubleOption("preroll") ?: preRollMs(File(dir, "session.yaml")) ?: return null
    // Decisions before the photo log: the log drops a ply whose photo was still pending when the next
    // move committed (six of 79 on 2026-08-24-22-43-46), the decisions never do.
    val marks =
        gameMarks(gameRecordFor(dir, options), preRoll)
            ?: decisionMarks(File(dir, "timeline.jsonl"))
            ?: logMarks(File(dir, "log.jsonl"), preRoll)
    if (marks.isNullOrEmpty()) return null
    return PlyTimeline(
        marks,
        options.doubleOption("after") ?: DEFAULT_AFTER_MOVE_MS,
        options.doubleOption("before") ?: DEFAULT_BEFORE_MOVE_MS,
    )
}

/**
 * The game record this recording produced: `files/games/<id>.json` beside `files/sessions/<id>/`,
 * the one whose `sessionId` names this session.
 */
internal fun gameRecordFor(
    sessionDir: File,
    options: List<String>,
): File? {
    options.stringOption("game")?.let { return it.fileArg() }
    val games = sessionDir.parentFile?.parentFile?.resolve("games") ?: return null
    return games
        .listFiles { f: File -> f.isFile && f.name.endsWith(".json") && f.name != "index.json" }
        ?.firstOrNull { runCatching { it.sessionId() }.getOrNull() == sessionDir.name }
}

private fun File.sessionId(): String? = (Json.parseToJsonElement(readText()) as JsonObject)["sessionId"]?.jsonPrimitive?.contentOrNull

/**
 * The move list as the phone committed it, on the video's clock — the game record, NOT `log.jsonl`.
 * That one is the move-PHOTO log and drops a ply whose photo was still pending when the next move
 * committed (`SessionCapture.supersededFrames`, on four sessions). Its hole is not a missing row
 * but a stretch of video labeled with the position before the move.
 */
internal fun gameMarks(
    game: File?,
    preRollMs: Double,
): List<PlyMark>? {
    if (game == null || !game.isFile) return null
    val root = Json.parseToJsonElement(game.readText()) as JsonObject
    // Segment by segment: after a seam the record restarts from a rebuilt position, and walking
    // its moves onto the previous board refused every phone recording with a seam (16-20-19).
    val segments =
        (root["segments"] as? JsonArray)?.map { it.jsonObject }?.takeIf { it.isNotEmpty() }
            ?: listOf(root)
    val first =
        segments
            .firstOrNull()
            ?.get("moves")
            ?.jsonArray
            ?.firstOrNull()
            ?.jsonObject
            ?.text("tsEpochMs")
            ?.toDouble() ?: return null
    return segments.flatMap { segment ->
        val board = Board().apply { loadFromFen(segment.getValue("startFen").jsonPrimitive.content) }
        segment.getValue("moves").jsonArray.map { it.jsonObject }.map { row ->
            val uci = row.text("uci")
            // See TrainingVideoPack: `doMove`'s return value is not a legality check at any
            // validation level, so the generator has to be asked.
            val move = Move(uci, board.sideToMove)
            val before = board.fen
            require(MoveGenerator.generateLegalMoves(board).any { it.toString() == move.toString() }) {
                "game record has an illegal move $uci at ply ${row.text("ply")} in $before"
            }
            board.doMove(move)
            PlyMark(
                ply = row.text("ply").toInt(),
                san = row.text("san"),
                uci = uci,
                fen = board.fen,
                videoMs = preRollMs + (row.text("tsEpochMs").toDouble() - first),
            )
        }
    }
}

/**
 * `log.jsonl` on the video's time axis — the FALLBACK, for a recording whose game record is gone.
 * Rows carry the ply, the FEN it produced and the commit's wall clock, and the file may be missing
 * plies ([gameMarks]); a hole costs the frames between the lost move and the next commit.
 */
internal fun logMarks(
    log: File,
    preRollMs: Double,
): List<PlyMark> {
    val rows = Jsonl.rows(log).filter { it["ply"] != null && it["fen"] != null && it["ts"] != null }
    val first = rows.firstOrNull()?.let { Instant.parse(it.text("ts")) } ?: return emptyList()
    val board = Board()
    return rows.map { row ->
        val fen = row.text("fen")
        PlyMark(
            ply = row.text("ply").toInt(),
            san = row.optional("move_san") ?: "",
            uci = board.moveTo(fen.substringBefore(' ')),
            fen = fen,
            videoMs = preRollMs + (Instant.parse(row.text("ts")).toEpochMilli() - first.toEpochMilli()).toDouble(),
            corners = cornersOf(row["corners"]),
        )
    }
}

/**
 * The move that turns this board into [placement], played. `log.jsonl` carries the SAN but not the
 * UCI a candidate needs, and one legal move produces a given placement — no move at all means the
 * log does not describe a legal game, which is worth stopping for.
 */
internal fun Board.moveTo(placement: String): String {
    val move =
        legalMoves().firstOrNull { candidate ->
            doMove(candidate)
            val hit = fen.substringBefore(' ') == placement
            undoMove()
            hit
        }
    requireNotNull(move) { "log.jsonl has no legal move onto $placement from $fen" }
    doMove(move)
    return move.toString()
}

/** The recording's own answer to where its first commit sits — written by `SessionRecorder`. */
internal fun preRollMs(sessionYaml: File): Double? =
    sessionYaml
        .takeIf { it.isFile }
        ?.readLines()
        ?.firstOrNull { it.startsWith("video_pre_roll_ns:") }
        ?.substringAfter(':')
        ?.trim()
        ?.toDoubleOrNull()
        ?.div(NS_PER_MS)

private fun JsonObject.text(key: String): String = getValue(key).jsonPrimitive.content

private fun JsonObject.optional(key: String): String? = this[key]?.jsonPrimitive?.contentOrNull
