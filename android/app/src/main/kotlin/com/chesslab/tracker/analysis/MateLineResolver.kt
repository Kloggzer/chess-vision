package com.chesslab.tracker.analysis

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.isActive

private const val MAX_EXTENSION_SEARCHES = 12
private const val MAX_LINE_PLIES = 72

/** A legally replayed continuation. [complete] is true only when its last board is checkmate. */
data class ResolvedMateLine(
    val uciLine: List<String>,
    val sanLine: List<String>,
    val complete: Boolean,
)

/** Extends the short PV stored by the review cache until it reaches an actual checkmate. */
class MateLineResolver(
    private val engines: EngineService,
    private val lane: EngineLane,
    private val budget: ReviewBudget = ReviewBudget(),
) {
    suspend fun resolve(
        startFen: String,
        seed: List<String>,
    ): ResolvedMateLine {
        val board =
            runCatching { Board().apply { loadFromFen(startFen) } }.getOrNull()
                ?: return ResolvedMateLine(emptyList(), emptyList(), complete = false)
        val moves = mutableListOf<String>()
        appendLegal(board, seed, moves)
        if (!board.isTerminal && moves.size < MAX_LINE_PLIES) {
            extend(board, moves)
        }
        return ResolvedMateLine(
            uciLine = moves,
            sanLine = sansOf(startFen, moves),
            complete = board.isMated,
        )
    }

    private suspend fun extend(
        board: Board,
        moves: MutableList<String>,
    ) {
        val context = currentCoroutineContext()
        engines.lease(lane, budget.profile).use { lease ->
            repeat(MAX_EXTENSION_SEARCHES) {
                context.ensureActive()
                val search =
                    runCatching { lease.search(board.fen, budget.capMs, budget.multiPv, budget.nodes) { !context.isActive } }
                        .getOrNull()
                val best = (search as? EngineSearch.Found)?.lines?.firstOrNull()?.takeIf { it.mate != null } ?: return
                val added = appendLegal(board, best.pv, moves)
                if (board.isTerminal || added == 0 || moves.size >= MAX_LINE_PLIES) return
            }
        }
    }
}

private fun appendLegal(
    board: Board,
    candidates: List<String>,
    destination: MutableList<String>,
): Int {
    val before = destination.size
    val room = (MAX_LINE_PLIES - destination.size).coerceAtLeast(0)
    for (uci in candidates.take(room)) {
        if (board.isTerminal) break
        val move =
            runCatching { Move(uci, board.sideToMove) }
                .getOrNull()
                ?.takeIf { candidate -> MoveGenerator.generateLegalMoves(board).any { it.toString() == candidate.toString() } }
                ?: return destination.size - before
        board.doMove(move)
        destination += uci
    }
    return destination.size - before
}

private val Board.isTerminal: Boolean get() = isMated || isDraw || isStaleMate
