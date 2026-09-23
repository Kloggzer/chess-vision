package com.chesslab.tracker.games

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator
import com.github.bhlangonijr.chesslib.move.MoveList

/** A FAILED search walks the whole tree: 2 / 17 / 143 / 1 670 ms at depths 1-4. Four missed plies is not "the
 *  app blinked" anyway — a record that guesses that far invents a game. */
private const val MAX_BRIDGE_PLIES = 3

/** Half the depth: this runs on the commit, and a failed search there stalls the tracker. */
internal const val LIVE_BRIDGE_PLIES = 2

/** Derived from the two positions, never committed. */
const val DECIDER_SEAM_BRIDGE: String = "seam_bridge"

/** The FIRST, shallowest sequence that explains the gap — a rival would have to reach the very same placement.
 *  Positions compare by PLACEMENT and side to move: counters differ exactly at a seam, and the two FEN writers
 *  disagree on en-passant squares. */
internal fun seamBridge(
    fenBefore: String,
    seamUcis: List<String>,
    startFen: String,
    maxPlies: Int = MAX_BRIDGE_PLIES,
): List<String>? {
    val board = boardAt(fenBefore) ?: return null
    val target = boardAt(startFen)?.let(::positionKey) ?: return null
    return (0..maxPlies).firstNotNullOfOrNull { depth -> firstBridge(board, depth, seamUcis, target) }
}

/** One board, `doMove`/`undoMove`: `Board.clone()` round-trips through a FEN string. */
private fun firstBridge(
    board: Board,
    depth: Int,
    seamUcis: List<String>,
    target: String,
): List<String>? {
    if (depth == 0) return if (reaches(board, seamUcis, target)) emptyList() else null
    for (move in MoveGenerator.generateLegalMoves(board)) {
        board.doMove(move)
        val deeper = firstBridge(board, depth - 1, seamUcis, target)
        board.undoMove()
        if (deeper != null) return listOf(move.toString()) + deeper
    }
    return null
}

private fun reaches(
    board: Board,
    ucis: List<String>,
    target: String,
): Boolean {
    var played = 0
    var legal = true
    for (uci in ucis) {
        val move = MoveGenerator.generateLegalMoves(board).firstOrNull { it.toString() == uci }
        if (move == null) {
            legal = false
            break
        }
        board.doMove(move)
        played++
    }
    val hit = legal && positionKey(board) == target
    repeat(played) { board.undoMove() }
    return hit
}

private fun boardAt(fen: String): Board? = runCatching { Board().apply { loadFromFen(fen) } }.getOrNull()

private fun positionKey(board: Board): String {
    val fields = board.fen.split(" ")
    return "${fields.first()} ${fields.getOrNull(1).orEmpty()}"
}

/** Runs on the READ path too: the games on the device were split under the old rule. A gap NOT explained keeps
 *  its segment and its warning. */
fun StoredGame.closeSeams(): StoredGame {
    val segments = segmentsOrOne()
    // A game whose every seam has been searched is the normal case after the first open, and must cost nothing.
    if (segments.none { it.enteredBy.needsSearch }) return this
    val closed = closeSegments(segments)
    if (closed == segments) return this
    val renumbered = renumber(closed)
    return copy(moves = renumbered.flatMap { it.moves }, segments = renumbered)
}

private val SeamOrigin?.needsSearch: Boolean get() = this != null && searchedPlies < MAX_BRIDGE_PLIES

private fun closeSegments(segments: List<GameSegment>): List<GameSegment> {
    val out = mutableListOf(segments.first())
    for (segment in segments.drop(1)) {
        val previous = out.last()
        val closing =
            segment.enteredBy?.takeIf { it.needsSearch }?.let { seam ->
                endOf(previous)?.let { fenBefore -> closingMoves(fenBefore, seam, segment.startFen, previous) }
            }
        if (closing == null) {
            out += segment.searched()
            continue
        }
        out[out.lastIndex] = previous.copy(moves = previous.moves + closing + segment.moves)
    }
    return out
}

/** A failed search walked the whole tree; without this it would walk it again on every open. */
private fun GameSegment.searched(): GameSegment =
    if (!enteredBy.needsSearch) this else copy(enteredBy = enteredBy?.copy(searchedPlies = MAX_BRIDGE_PLIES))

/** Bridge plies carry their own decider: a search result must never read as an observation. */
private fun closingMoves(
    fenBefore: String,
    seam: SeamOrigin,
    startFen: String,
    previous: GameSegment,
): List<StoredMove>? {
    val bridge = seamBridge(fenBefore, seam.ucis, startFen) ?: return null
    val played = playedFrom(fenBefore, bridge + seam.ucis) ?: return null
    val timestamp = previous.moves.lastOrNull()?.tsEpochMs ?: 0L
    return played.mapIndexed { index, ply ->
        StoredMove(
            ply = 0,
            san = ply.san,
            uci = ply.uci,
            tsEpochMs = timestamp,
            provenance = provenanceOf(derived = index < bridge.size, decider = seam.decider),
        )
    }
}

internal data class PlayedPly(
    val uci: String,
    val san: String,
    val fenAfter: String,
)

/** Generated legality, as in `GameView.replay`: chesslib applies an illegal move without complaint. */
internal fun playedFrom(
    fenBefore: String,
    ucis: List<String>,
): List<PlayedPly>? {
    val board = boardAt(fenBefore) ?: return null
    return ucis.map { uci ->
        val move = MoveGenerator.generateLegalMoves(board).firstOrNull { it.toString() == uci } ?: return null
        val san = sanOf(board, move)
        board.doMove(move)
        PlayedPly(uci, san, board.fen)
    }
}

internal fun provenanceOf(
    derived: Boolean,
    decider: String,
): MoveProvenance =
    MoveProvenance(
        decider = if (derived) DECIDER_SEAM_BRIDGE else decider,
        reason =
            if (derived) {
                "the only move that reaches the position $decider rebuilt"
            } else {
                decider
            },
        priorUsed = false,
    )

private fun endOf(segment: GameSegment): String? {
    val board = boardAt(segment.startFen) ?: return null
    for (uci in segment.moves.map { it.uci }) {
        val move = MoveGenerator.generateLegalMoves(board).firstOrNull { it.toString() == uci } ?: return null
        board.doMove(move)
    }
    return board.fen
}

/** Through chesslib's writer, so check and disambiguation are spelled as PGN wants. */
private fun sanOf(
    board: Board,
    move: Move,
): String = runCatching { MoveList(board.fen).apply { add(move) }.toSanArray().first() }.getOrDefault(move.toString())

private fun renumber(segments: List<GameSegment>): List<GameSegment> {
    var ply = 0
    return segments.map { segment ->
        segment.copy(moves = segment.moves.map { move -> move.copy(ply = ++ply) })
    }
}
