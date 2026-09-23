package com.chesslab.tracker.analysis

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Side
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.isActive
import java.io.IOException

class PositionLibraryWarmer(
    private val engines: EngineService,
    private val store: ReviewStore,
    private val budget: ReviewBudget,
) {
    suspend fun warm(
        positions: List<String>,
        onProgress: suspend (done: Int, total: Int) -> Unit,
    ): Boolean {
        val missing = positions.distinctBy(::canonicalEnginePosition).filter { store.loadPosition(it, budget) == null }
        if (missing.isEmpty()) return true
        onProgress(0, missing.size)
        engines.lease(EngineLane.REVIEW, budget.profile).use { lease ->
            missing.forEachIndexed { index, fen ->
                val context = currentCoroutineContext()
                context.ensureActive()
                val score = analyseReviewPosition(lease, fen, budget) { !context.isActive } ?: return false
                store.savePosition(fen, budget, score)
                onProgress(index + 1, missing.size)
            }
        }
        return true
    }
}

/** `null` only when no binary shipped: the review lane is exempt from the gate, so never `Blocked`. */
internal fun analyseReviewPosition(
    lease: EngineLease,
    fen: String,
    budget: ReviewBudget,
    cancelled: () -> Boolean,
): Score? {
    val board = runCatching { Board().apply { loadFromFen(fen) } }.getOrNull() ?: throw IOException("Invalid review position")
    terminalScore(board)?.let { return it }
    val whiteToMove = board.sideToMove == Side.WHITE
    val search = lease.search(fen, budget.capMs, budget.multiPv, budget.nodes, cancelled)
    if (search !is EngineSearch.Found) return null
    val best =
        search.lines
            .firstOrNull()
            ?.toWhitePov(whiteToMove)
            ?: throw IOException("Stockfish returned no analysis")
    return Score(cpOf(best), best.depth, best.pv, mate = best.mate)
}
