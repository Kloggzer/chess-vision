package com.chesslab.engine.changeset

import com.chesslab.engine.api.DebugDecision

/**
 * What a commit tells the outside world.
 *
 * One [DebugDecision] per HALF-move, because that is what a replay's scorer reads — not the event
 * stream (`DesktopMain`). A commit of three plies is three rows, numbered in order, or the score
 * sees one move where three were played.
 */
data class ChangeDecision(
    val timestampMs: Long,
    val plyAfter: Int,
    val ucis: List<String>,
    val sans: List<String>,
    val fenBefore: String,
    val fenAfter: String,
    val covered: List<String>,
) {
    fun rows(): List<DebugDecision> =
        ucis.indices.map { i ->
            DebugDecision(
                tsS = timestampMs / MS_PER_SECOND,
                ply = plyAfter - ucis.size + i + 1,
                uci = ucis[i],
                san = sans.getOrNull(i),
                fenBefore = if (i == 0) fenBefore else null,
                fenAfter = fenAfter,
                decider = "change_diff",
                reason = "the settled board changed on exactly the squares this move touches",
                priorUsed = false,
                bestScore = 0.0,
                secondScore = 0.0,
                margin = 0.0,
                changed = emptyList(),
                changedVals = emptyList(),
                shadowVetoed = emptyList(),
                occludedVetoed = covered,
                gridCoverage = 0.0,
                zThr = 0.0,
                motion = 0.0,
                cnnRun = true,
                cnnAgreement = 0.0,
                cnnBestMove = null,
                stuckReason = null,
                verifyOutcome = null,
                accepted = true,
            )
        }

    private companion object {
        const val MS_PER_SECOND = 1000.0
    }
}
