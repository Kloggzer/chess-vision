package com.chesslab.arena

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.MoveList
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

/** The LONGER source: `candidate.json` has frames but stops early and GUESSES order on bundled commits
 *  (wrong on `VID_20260726_233432`). The PGN decides the sequence; the candidate lends frames where it agrees. */
fun truthOf(dir: File): List<TruthPly> {
    val candidate = candidatePlies(dir)
    val pgn = pgnPlies(dir)
    check(candidate.isNotEmpty() || pgn.isNotEmpty()) {
        "no reference for ${dir.name} — neither candidate.json with moves nor reference.pgn"
    }
    if (pgn.isEmpty()) return candidate
    return pgn.mapIndexed { i, san -> TruthPly(san, candidate.getOrNull(i)?.takeIf { it.san == san }?.frame ?: -1) }
}

/** A frame with SEVERAL plies is a backlog flush, not a measurement: -1 (54 of 1242). */
private fun candidatePlies(dir: File): List<TruthPly> {
    val file = File(dir, "candidate.json")
    if (!file.isFile) return emptyList()
    val moves = Json.parseToJsonElement(file.readText()).jsonObject["moves"]?.jsonArray ?: return emptyList()
    val raw =
        moves.map { row ->
            TruthPly(
                san =
                    row.jsonObject
                        .getValue("san")
                        .jsonPrimitive.content,
                frame =
                    row.jsonObject["frame"]
                        ?.jsonPrimitive
                        ?.content
                        ?.toIntOrNull() ?: -1,
            )
        }
    val perFrame = raw.filter { it.frame >= 0 }.groupingBy { it.frame }.eachCount()
    val bundled = perFrame.filterValues { it > 1 }.keys
    return raw.map { if (it.frame in bundled) it.copy(frame = -1) else it }
}

/** Normalised through chesslib so they compare against a run's. */
private fun pgnPlies(dir: File): List<String> {
    val file = File(dir, "reference.pgn")
    if (!file.isFile) return emptyList()
    val body =
        file
            .readText()
            .lineSequence()
            .filterNot { it.startsWith("[") }
            .joinToString(" ")
            .replace(COMMENT, " ")
            .replace(MOVE_NUMBER, " ")
            .replace(RESULT, " ")
    val board = Board()
    val out = mutableListOf<String>()
    for (token in body.split(WHITESPACE).filter { it.isNotBlank() }) {
        val list = MoveList(board.fen)
        list.loadFromSan(token)
        out += list.toSanArray().first()
        board.doMove(list.first())
    }
    return out
}

private val COMMENT = Regex("\\{[^}]*\\}")
private val MOVE_NUMBER = Regex("\\d+\\.(\\.\\.)?")
private val RESULT = Regex("(1-0|0-1|1/2-1/2|\\*)")
private val WHITESPACE = Regex("\\s+")
