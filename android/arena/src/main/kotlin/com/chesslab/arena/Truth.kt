package com.chesslab.arena

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.MoveList
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

/**
 * The reference for a recording: the LONGER of its two sources, never the more convenient one.
 *
 * `candidate.json` carries a frame per ply, which is what a lag measurement needs — but a tracker
 * run wrote it and most of them stop early ("Position lost — tracking paused"). On
 * `VID_20260824_154327` it holds 51 plies where the PGN holds the whole 117-ply game. Scoring
 * against the short one would count every ply a BETTER tracker finds as a phantom, so the PGN
 * decides the sequence and the candidate only lends its frames to the plies it agrees on.
 */
fun truthOf(dir: File): List<TruthPly> {
    val candidate = candidatePlies(dir)
    val pgn = pgnPlies(dir)
    check(candidate.isNotEmpty() || pgn.isNotEmpty()) {
        "no reference for ${dir.name} — neither candidate.json with moves nor reference.pgn"
    }
    if (pgn.size <= candidate.size) return candidate.ifEmpty { pgn.map { TruthPly(it, -1) } }
    return pgn.mapIndexed { i, san -> TruthPly(san, candidate.getOrNull(i)?.takeIf { it.san == san }?.frame ?: -1) }
}

/** The label run's plies, each with the frame it committed on. Empty when there is no candidate. */
private fun candidatePlies(dir: File): List<TruthPly> {
    val file = File(dir, "candidate.json")
    if (!file.isFile) return emptyList()
    val moves = Json.parseToJsonElement(file.readText()).jsonObject["moves"]?.jsonArray ?: return emptyList()
    return moves.map { row ->
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
}

/** The mainline SANs of `reference.pgn`, normalised through chesslib so they compare against a run's. */
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
