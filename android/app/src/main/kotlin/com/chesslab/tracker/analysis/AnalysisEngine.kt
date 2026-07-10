package com.chesslab.tracker.analysis

import java.io.Closeable

/**
 * Engine evaluation of a single position, from the side-to-move's point of view.
 *
 * Exactly one of [cp] / [mateIn] is non-null for a real engine score; both may be
 * null when the engine produced no score (e.g. terminated positions).
 *
 * @property cp centipawns (positive = side to move is better), or null if mate.
 * @property mateIn moves until mate (positive = side to move mates), or null.
 */
data class Eval(
    val cp: Int?,
    val mateIn: Int?,
)

/**
 * Result of analyzing one position.
 *
 * @property fen the analyzed position.
 * @property eval score from the side-to-move POV.
 * @property bestUci best move in UCI notation (e.g. "e2e4"), or null if none.
 * @property pv principal variation as UCI moves.
 * @property depth search depth the result was obtained at.
 */
data class PositionAnalysis(
    val fen: String,
    val eval: Eval,
    val bestUci: String?,
    val pv: List<String>,
    val depth: Int,
)

/**
 * On-device position evaluator. Implementations: [StockfishEngine] (native UCI
 * process) and [FakeAnalysisEngine] (deterministic, no native code).
 *
 * The interface is the hard contract for the games/analysis UI — it must stay
 * buildable and testable without any native binary.
 */
interface AnalysisEngine : Closeable {
    /** Analyze a single position to [depth]. */
    suspend fun analyze(
        fen: String,
        depth: Int = DEFAULT_DEPTH,
    ): PositionAnalysis

    /**
     * Analyze each position of a game (the position *before* each move);
     * the returned list is aligned index-for-index with [fens].
     */
    suspend fun analyzeGame(
        fens: List<String>,
        depth: Int = DEFAULT_DEPTH,
    ): List<PositionAnalysis>

    companion object {
        /** Default search depth — deep enough for accuracy grading, fast on-device. */
        const val DEFAULT_DEPTH: Int = 12
    }
}
