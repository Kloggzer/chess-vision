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
 * run wrote it, and it can be wrong in two ways. It stops early ("Position lost — tracking
 * paused"): on `VID_20260824_154327` it holds 51 plies where the PGN holds the whole 117-ply game.
 * And it GUESSES ORDER: a run that commits a backlog puts several plies on one frame, 51 of 606
 * across the corpus sit in such a bundle, and on `VID_20260726_233432` the guess is demonstrably
 * wrong — the pictures show e4 at frame 240, the candidate calls it ply 3.
 *
 * So the PGN decides the sequence wherever there is one, and the candidate only lends its frames
 * to the plies it agrees with.
 */
fun truthOf(dir: File): List<TruthPly> {
    val candidate = candidatePlies(dir)
    val pgn = pgnPlies(dir)
    check(candidate.isNotEmpty() || pgn.isNotEmpty()) {
        "no reference for ${dir.name} — neither candidate.json with moves nor reference.pgn"
    }
    if (pgn.isEmpty()) return candidate
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
