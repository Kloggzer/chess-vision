package com.chesslab.tracker.hints

import com.chesslab.tracker.analysis.AnalysisLine
import com.chesslab.tracker.analysis.AnalysisResult
import com.chesslab.tracker.analysis.GateBlock

/** Schwarz am Zug — so liest jede Probe hier, ausser sie sagt etwas anderes. */
internal const val FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1"

internal const val OTHER_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 2"

internal const val BEST_SAN = "e5"

internal fun result(
    fen: String,
    mate: Int? = null,
) = AnalysisResult(
    fen = fen,
    gameOver = false,
    cp = if (mate == null) 20 else null,
    mate = mate,
    winWhite = 52.0,
    lines = listOf(AnalysisLine(uci = "e7e5", san = BEST_SAN, cp = 20, mate = mate)),
    depth = 12,
)

internal fun moment(
    fen: String = FEN,
    recordFen: String? = null,
    steadyMs: Long = HINT_SETTLE_MS,
    alarmed: Boolean = false,
    blocked: GateBlock? = null,
    result: AnalysisResult? = result(fen),
) = HintMoment(
    fen = fen,
    recordFen = recordFen,
    steadyMs = steadyMs,
    alarmed = alarmed,
    blocked = blocked,
    result = result,
)
