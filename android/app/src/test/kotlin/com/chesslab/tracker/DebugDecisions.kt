package com.chesslab.tracker

import com.chesslab.engine.api.DebugDecision

internal fun debugDecision(
    ply: Int = 2,
    uci: String = "e2e4",
    san: String? = null,
    fenBefore: String? = null,
    fenAfter: String = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    decider: String = "rejected",
    accepted: Boolean = false,
) = DebugDecision(
    tsS = 1.0,
    ply = ply,
    uci = uci,
    san = san,
    fenBefore = fenBefore,
    fenAfter = fenAfter,
    decider = decider,
    reason = "e4? evidence too weak (0.00 < 2.0) — not committing",
    priorUsed = false,
    bestScore = 1.0,
    secondScore = 0.0,
    margin = 1.0,
    changed = listOf("f4", "d4"),
    changedVals = listOf("f4" to 9.25, "d4" to 4.5),
    shadowVetoed = listOf("e5"),
    occludedVetoed = listOf("h2"),
    gridCoverage = 1.0,
    zThr = 3.0,
    motion = 0.0,
    cnnRun = true,
    cnnAgreement = 1.0,
    cnnBestMove = null,
    stuckReason = null,
    verifyOutcome = null,
    accepted = accepted,
)
