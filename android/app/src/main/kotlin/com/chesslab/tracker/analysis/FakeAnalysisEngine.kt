package com.chesslab.tracker.analysis

/**
 * Deterministic [AnalysisEngine] double — no native code, no I/O.
 *
 * Returns canned evaluations from [cannedEvals] (fen → [Eval]); unknown positions
 * evaluate to a neutral `cp = 0`. Used by the analysis UI in previews/tests and by
 * CI, which must never need a Stockfish binary.
 *
 * @param cannedEvals evaluation to return per FEN.
 * @param cannedBestMoves optional best move (UCI) to return per FEN.
 */
class FakeAnalysisEngine(
    private val cannedEvals: Map<String, Eval> = emptyMap(),
    private val cannedBestMoves: Map<String, String> = emptyMap(),
) : AnalysisEngine {
    override suspend fun analyze(
        fen: String,
        depth: Int,
    ): PositionAnalysis {
        val eval = cannedEvals[fen] ?: Eval(cp = 0, mateIn = null)
        val best = cannedBestMoves[fen]
        return PositionAnalysis(
            fen = fen,
            eval = eval,
            bestUci = best,
            pv = listOfNotNull(best),
            depth = depth,
        )
    }

    override suspend fun analyzeGame(
        fens: List<String>,
        depth: Int,
    ): List<PositionAnalysis> = fens.map { analyze(it, depth) }

    override fun close() {
        // Nothing to release — no native resources.
    }
}
