package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.move.Move
import kotlin.math.max

private class SearchChannel(
    val squares: List<String>,
    val target: Map<String, Any>,
    val value: (Board, String) -> Any,
)

private class SearchState(
    val seq: List<Move>,
    val board: Board,
    val conflicts: Set<String>,
)

/**
 * Port of `cnn_recovery.py:285 derive_moves_deep` — conflict-guided beam search over up to
 * [maxPlies] half-moves. Only moves touching at least one CONFLICTING square are expanded,
 * so 4 plies stay a few hundred boards.
 *
 * Terminal candidates are keyed by the **placement-only FEN**: the camera cannot see whose
 * turn it is, so a longer transposition to the same placement is the SAME hypothesis (the
 * shortest sequence wins) — not a rival that would destroy the acceptance margin.
 */
fun CnnRecovery.deriveMovesDeepFull(
    board: Board,
    obs: OccupancyObservation,
    maxPlies: Int = config.recoveryMaxPlies,
    beam: Int = config.beam,
): DerivedMoves {
    val channel = channelFor(obs, config.confThr, config.colorAxis)
    val n = channel.squares.size
    if (n < config.minConfidentRecovery) {
        return DerivedMoves(emptyList(), NO_AGREEMENT, NO_AGREEMENT)
    }
    val finals = LinkedHashMap<String, Pair<Int, List<Move>>>()
    var states = listOf(SearchState(emptyList(), board, conflictsOf(channel, board)))
    note(finals, emptyList(), board, n - states.first().conflicts.size)
    var remainingPlies = maxPlies
    while (remainingPlies > 0) {
        remainingPlies--
        val next = ArrayList<SearchState>()
        for (state in states) {
            // A fully explained state is not expanded further.
            if (state.conflicts.isEmpty()) continue
            next.addAll(expand(channel, state, finals, n))
        }
        if (next.isEmpty()) break
        states = next.sortedWith(compareBy({ it.conflicts.size }, { it.seq.size })).take(beam)
    }
    // Length is PRICED, not free (`plyCostSquares`). Ranking on raw hits with length as a mere
    // tiebreak let a 4-ply fabrication win on one misread square; the score a candidate is ranked
    // and gated by is therefore its hits minus what its plies cost. At the default 0 this is the
    // old comparator exactly.
    val cost = config.plyCostSquares
    val score = { c: Pair<Int, List<Move>> -> c.first - cost * c.second.size }
    val byScoreThenLength = compareByDescending(score).thenBy { c: Pair<Int, List<Move>> -> c.second.size }
    val ranked = finals.values.sortedWith(byScoreThenLength)
    val bestHits = ranked.first().first
    val bestSeq = ranked.first().second
    val secondHits = if (ranked.size > 1) ranked[1].first else NO_HITS
    val best = bestHits.toDouble() / n
    val second = max(NO_AGREEMENT, secondHits.toDouble() / n)
    // The margin compares the SCORES, so a rival is beaten on the same terms it was ranked on.
    val rivalScore = if (ranked.size > 1) score(ranked[1]) else NO_HITS
    val accepted =
        bestSeq.isNotEmpty() &&
            best >= config.minAgreement &&
            (score(ranked.first()) - max(rivalScore, 0)) >= config.marginSquares
    return DerivedMoves(if (accepted) bestSeq else emptyList(), best, second)
}

/**
 * Identity when the observation carries labels, else occupancy — same code path, different
 * value function (`cnn_recovery.py:298-312`).
 */
private fun channelFor(
    obs: OccupancyObservation,
    confThr: Double,
    colorAxis: Boolean = false,
): SearchChannel =
    if (obs.label != null) {
        val squares = obs.labelConfidentSquares(confThr)
        val axis: (String) -> Any = if (colorAxis) ::sideOfLabel else { label -> label }
        SearchChannel(squares, squares.associateWith { axis(obs.label(it)!!) }) { b, sq -> axis(labelAt(b, sq)) }
    } else {
        val squares = obs.confidentSquares(confThr)
        SearchChannel(squares, squares.associateWith { obs.occupied(it) as Any }) { b, sq ->
            b.getPiece(squareOf(sq)) != Piece.NONE
        }
    }

/** `wR` and `wN` collapse to `w`; `empty` stays itself. The colour axis of [CnnConfig.colorAxis]. */
private fun sideOfLabel(label: String): Any = if (label == "empty") label else label.take(1)

private fun conflictsOf(
    channel: SearchChannel,
    board: Board,
): Set<String> = channel.squares.filterTo(LinkedHashSet()) { channel.target[it] != channel.value(board, it) }

private fun expand(
    channel: SearchChannel,
    state: SearchState,
    finals: MutableMap<String, Pair<Int, List<Move>>>,
    n: Int,
): List<SearchState> {
    val out = ArrayList<SearchState>()
    for (move in state.board.legalMoves()) {
        // Touches no conflicting square -> fixes nothing.
        if (moveTouchedSquares(state.board, move).none { it in state.conflicts }) continue
        val next = state.board.clone().also { it.doMove(move) }
        val conflicts = conflictsOf(channel, next)
        val seq = state.seq + move
        out.add(SearchState(seq, next, conflicts))
        note(finals, seq, next, n - conflicts.size)
    }
    return out
}

/** `_note`: keyed by placement only; more hits wins, and the SHORTEST sequence wins ties. */
private fun note(
    finals: MutableMap<String, Pair<Int, List<Move>>>,
    seq: List<Move>,
    board: Board,
    hits: Int,
) {
    val key = board.boardFen()
    val prev = finals[key]
    val better = prev == null || hits > prev.first
    val shorterTie = prev != null && hits == prev.first && seq.size < prev.second.size
    if (better || shorterTie) {
        finals[key] = hits to seq
    }
}

/** The placement-only FEN field — `chess.Board.board_fen()`. */
internal fun Board.boardFen(): String = getFen(false).substringBefore(' ')
