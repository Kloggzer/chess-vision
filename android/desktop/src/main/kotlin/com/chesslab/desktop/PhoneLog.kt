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

internal data class PlyMark(
    val ply: Int,
    val san: String,
    val uci: String,
    val fen: String,
    val videoMs: Double,
    val corners: FloatArray? = null,
) {
    val placement: String get() = fen.substringBefore(' ')
}

internal fun cornersOf(element: JsonElement?): FloatArray? {
    val array = (element as? JsonArray) ?: return null
    val flat = array.flatMap { item -> (item as? JsonArray)?.map { it.jsonPrimitive.float } ?: listOf(item.jsonPrimitive.float) }
    return flat.takeIf { it.size == 8 }?.toFloatArray()
}

/** The game record says WHICH position was on the board, so a replay that loses the game cannot mislabel
 *  (one missed opening move once cost all 851 frames). Ply 1 sits at the pre-roll. */
internal class PlyTimeline(
    val marks: List<PlyMark>,
    private val afterMs: Double = DEFAULT_AFTER_MOVE_MS,
    private val beforeMs: Double = DEFAULT_BEFORE_MOVE_MS,
) {
    /** Null while a move is being made. A timestamp is the COMMIT: the band after it is short, the band before
     *  the next commit covers the reaching hand. */
    fun plyAt(videoMs: Double): Int? {
        val index = marks.indexOfLast { it.videoMs <= videoMs }
        val next = marks.getOrNull(index + 1)
        if (next != null && next.videoMs - videoMs < beforeMs) return null
        if (index < 0) return 0
        if (videoMs - marks[index].videoMs < afterMs) return null
        return marks[index].ply
    }

    fun crossed(
        fromMs: Double,
        toMs: Double,
    ): List<PlyMark> = marks.filter { it.videoMs > fromMs && it.videoMs <= toMs }
}

/** Null for a camera-roll video — then the tracker's own FEN is the only source. */
internal fun sessionTimeline(
    video: File,
    options: List<String>,
): PlyTimeline? {
    val dir = video.parentFile ?: return null
    val preRoll = options.doubleOption("preroll") ?: preRollMs(File(dir, "session.yaml")) ?: return null
    // Decisions before the photo log: the log drops a ply whose photo was still pending (six of 79).
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

/** The game record, NOT `log.jsonl`: the photo log drops a ply whose photo was pending when the next move
 *  committed, and its hole is a stretch of video labeled with the position before. */
internal fun gameMarks(
    game: File?,
    preRollMs: Double,
): List<PlyMark>? {
    if (game == null || !game.isFile) return null
    val root = Json.parseToJsonElement(game.readText()) as JsonObject
    // Segment by segment: walking a restarted record onto the previous board refused every recording with a seam.
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
            // `doMove`'s return value is no legality check at any validation level.
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

/** The FALLBACK for a recording whose game record is gone; a hole costs the frames up to the next commit. */
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

/** `log.jsonl` carries the SAN, not the UCI; no matching move means the log is not a legal game. */
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
