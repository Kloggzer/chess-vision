package com.chesslab.tracker.games

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator
import com.github.bhlangonijr.chesslib.move.MoveList

/**
 * How many plies the app may have missed in one gap.
 *
 * Three, on cost. A FAILED search is the expensive one — it walks the whole tree — and measured on
 * the dev machine from a middlegame position it costs 2 / 17 / 143 / 1 670 ms at depths 1 / 2 / 3 /
 * 4. Depth four is a second of the phone's time to say "I could not explain it", and a gap of four
 * missed plies is not "the app blinked" anyway: a record that guesses that far is a record that
 * invents a game.
 */
private const val MAX_BRIDGE_PLIES = 3

/**
 * The same, for the LIVE path — half the depth, because this one runs on the commit that opened the
 * gap and a failed search there stalls the tracker.
 *
 * Nothing is lost by it: the seam is recorded as before, and [closeSeams] searches to
 * [MAX_BRIDGE_PLIES] when the game is opened, so a three-ply gap is closed a little later rather
 * than never.
 */
internal const val LIVE_BRIDGE_PLIES = 2

/** The decider written on a ply nobody committed — it was derived from the two positions. */
const val DECIDER_SEAM_BRIDGE: String = "seam_bridge"

/**
 * The plies that close the gap at a seam — the FIRST sequence that explains it — or null when
 * nothing this deep does.
 *
 * A seam is the moment the engine's board was somewhere the record could not reach: the tracker
 * missed a ply or two while a hand covered the board, then a CNN recovery worked out where the game
 * had got to and committed from THERE. The record is left holding a position [fenBefore], the plies
 * the recovery committed ([seamUcis]) and the position they ended on ([startFen]), with a hole in
 * the middle.
 *
 * It stops at the first hit and does not look for a second — *"wenn ein Pfad gefunden wurde bitte
 * den markieren, ich brauch nicht alle Pfade"*. The hole is normally no mystery anyway: the
 * shallowest sequence whose result is the exact position the engine reached is what happened, and
 * a rival at the same depth would have to reach the very same placement with the same side to move.
 * What this buys is the SUCCESS case — the search returns on the ply it finds instead of walking the
 * rest of the tree to prove nobody else could have.
 *
 * A gap it cannot explain keeps its seam and its warning, and the caller records that the search has
 * run ([SeamOrigin.searchedPlies]) so it never runs again.
 *
 * Positions are compared by PLACEMENT and side to move only. The counters cannot be compared — a
 * seam is precisely where the two boards disagree about how many plies have been played — and the
 * engine's FEN writer and chesslib's need not agree on when an en-passant square is worth naming.
 */
internal fun seamBridge(
    fenBefore: String,
    seamUcis: List<String>,
    startFen: String,
    maxPlies: Int = MAX_BRIDGE_PLIES,
): List<String>? {
    val board = boardAt(fenBefore) ?: return null
    val target = boardAt(startFen)?.let(::positionKey) ?: return null
    // Shallowest first: the fewest missed plies that explain the gap is the answer, and a deeper
    // sequence reaching the same position transposes through it rather than competing with it.
    return (0..maxPlies).firstNotNullOfOrNull { depth -> firstBridge(board, depth, seamUcis, target) }
}

/**
 * The first [depth]-ply sequence that reaches [target] once [seamUcis] follow it.
 *
 * One board, `doMove`/`undoMove`: `Board.clone()` round-trips through a FEN string and a failed
 * search walks tens of thousands of nodes.
 */
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

/** Does [ucis] play out legally from here and land on [target]? The board is left as it was found. */
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

/** Placement and side to move — see [seamBridge] for why the counters are left out. */
private fun positionKey(board: Board): String {
    val fields = board.fen.split(" ")
    return "${fields.first()} ${fields.getOrNull(1).orEmpty()}"
}

/**
 * The same game with every seam that the plies themselves explain spliced shut.
 *
 * The user's words: *"die Segmente sind mit einer Warnung voneinander getrennt obwohl sie sich
 * einfach schließen lassen, da dort ein CNN recovery stattfand"*. When [seamBridge] finds the one
 * sequence that closes a gap the record is continuous after all — those plies happened, they were
 * simply in no move list — so the two segments become one line and the warning goes. A gap that is
 * NOT uniquely explained keeps its segment and its warning, unchanged.
 *
 * It runs on the READ path as well as the write path, because the games already on the device were
 * split under the old rule and those are the ones the user is looking at.
 */
fun StoredGame.closeSeams(): StoredGame {
    val segments = segmentsOrOne()
    // Nothing to close, and nothing to search: a game whose every seam has been searched already is
    // the normal case after the first open, and it must cost nothing at all.
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

/**
 * The segment with its seam marked as searched — the answer to "what happened here" written down.
 *
 * This is the whole point of [SeamOrigin.searchedPlies]: the search that found nothing is the one
 * that walked the entire tree, and without this it would walk it again on every open, for the life
 * of the game. Measured on the two games on the device, both of which keep two unexplainable gaps.
 */
private fun GameSegment.searched(): GameSegment =
    if (!enteredBy.needsSearch) this else copy(enteredBy = enteredBy?.copy(searchedPlies = MAX_BRIDGE_PLIES))

/**
 * The seam's own plies, preceded by the ones nobody ever committed — or null when the gap does not
 * close.
 *
 * The recovery's plies were committed by the tracker and keep saying so. The bridge plies were
 * derived here from two positions and say THAT, under their own decider: a reader asking where a
 * move came from must never be told that a search result was an observation.
 */
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
            // Zero here; the whole record is renumbered once the splice is done.
            ply = 0,
            san = ply.san,
            uci = ply.uci,
            tsEpochMs = timestamp,
            provenance = provenanceOf(derived = index < bridge.size, decider = seam.decider),
        )
    }
}

/** One replayed ply: what it is called, and the position it produced. */
internal data class PlayedPly(
    val uci: String,
    val san: String,
    val fenAfter: String,
)

/**
 * [ucis] replayed from [fenBefore], or null as soon as one of them is not legal where it stands.
 *
 * The generated-legality check is the one `GameView.replay` needs for the same reason: chesslib
 * applies an illegal move without complaint, and every position after it would be a fabrication.
 */
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

/** The position a segment ends on, replayed from its own start. */
private fun endOf(segment: GameSegment): String? {
    val board = boardAt(segment.startFen) ?: return null
    for (uci in segment.moves.map { it.uci }) {
        val move = MoveGenerator.generateLegalMoves(board).firstOrNull { it.toString() == uci } ?: return null
        board.doMove(move)
    }
    return board.fen
}

/** SAN through chesslib's own writer, so a check or a disambiguation is spelled as PGN wants it. */
private fun sanOf(
    board: Board,
    move: Move,
): String = runCatching { MoveList(board.fen).apply { add(move) }.toSanArray().first() }.getOrDefault(move.toString())

/** Plies are numbered across the WHOLE record, and a splice moves every number after it. */
private fun renumber(segments: List<GameSegment>): List<GameSegment> {
    var ply = 0
    return segments.map { segment ->
        segment.copy(moves = segment.moves.map { move -> move.copy(ply = ++ply) })
    }
}
