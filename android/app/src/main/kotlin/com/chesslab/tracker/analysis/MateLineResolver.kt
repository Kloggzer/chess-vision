package com.chesslab.tracker.analysis

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.isActive
import java.io.IOException

private const val MAX_EXTENSION_SEARCHES = 12
private const val MAX_LINE_PLIES = 72
internal const val NO_ENGINE_BINARY = "no Stockfish binary for this device"

/** A legally replayed continuation. [complete] is true only when its last board is checkmate;
 *  [failure] says why the engine could not extend it, so a stub line never passes for a result. */
data class ResolvedMateLine(
    val uciLine: List<String>,
    val sanLine: List<String>,
    val complete: Boolean,
    val failure: String? = null,
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
        val failure =
            if (!board.isTerminal && moves.size < MAX_LINE_PLIES) extend(board, moves) else null
        return ResolvedMateLine(
            uciLine = moves,
            sanLine = sansOf(startFen, moves),
            complete = board.isMated,
            failure = failure,
        )
    }

    private suspend fun extend(
        board: Board,
        moves: MutableList<String>,
    ): String? {
        val context = currentCoroutineContext()
        engines.lease(lane, budget.profile).use { lease ->
            repeat(MAX_EXTENSION_SEARCHES) {
                context.ensureActive()
                val search =
                    try {
                        lease.search(board.fen, budget.capMs, budget.multiPv, budget.nodes) { !context.isActive }
                    } catch (failure: IOException) {
                        return failure.message?.takeIf(String::isNotBlank) ?: failure.javaClass.simpleName
                    }
                if (search is EngineSearch.Unavailable) return NO_ENGINE_BINARY
                val best = (search as? EngineSearch.Found)?.lines?.firstOrNull()?.takeIf { it.mate != null } ?: return null
                val added = appendLegal(board, best.pv, moves)
                if (board.isTerminal || added == 0 || moves.size >= MAX_LINE_PLIES) return null
            }
        }
        return null
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
