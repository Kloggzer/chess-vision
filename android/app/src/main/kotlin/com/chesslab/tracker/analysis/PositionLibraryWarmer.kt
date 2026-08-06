package com.chesslab.tracker.analysis

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Side
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.isActive
import java.io.IOException

/** Extends the persistent position library after the positions from the played game are complete. */
class PositionLibraryWarmer(
    private val engineFactory: () -> UciEngine?,
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
        val engine = engineFactory() ?: return false
        try {
            engine.start(budget.threads, budget.hashMb)
            missing.forEachIndexed { index, fen ->
                val context = currentCoroutineContext()
                context.ensureActive()
                val score = analyseReviewPosition(engine, fen, budget) { !context.isActive }
                store.savePosition(fen, budget, score)
                onProgress(index + 1, missing.size)
            }
        } finally {
            engine.close()
        }
        return true
    }
}

internal fun analyseReviewPosition(
    engine: UciEngine,
    fen: String,
    budget: ReviewBudget,
    cancelled: () -> Boolean,
): Score {
    val board = runCatching { Board().apply { loadFromFen(fen) } }.getOrNull() ?: throw IOException("Invalid review position")
    terminalScore(board)?.let { return it }
    val whiteToMove = board.sideToMove == Side.WHITE
    val best =
        engine
            .analyse(fen, budget.capMs, budget.multiPv, nodes = budget.nodes, cancelled = cancelled)
            .firstOrNull()
            ?.toWhitePov(whiteToMove)
            ?: throw IOException("Stockfish returned no analysis")
    return Score(cpOf(best), best.depth, best.pv, mate = best.mate)
}
