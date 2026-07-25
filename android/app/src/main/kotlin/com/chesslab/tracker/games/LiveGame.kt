package com.chesslab.tracker.games

import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.TrackerEvent

/** One move as it was committed, plus the position it produced (the undo probe below needs it). */
private data class LiveMove(
    val move: StoredMove,
    val fenAfter: String,
)

/**
 * Accumulates the running game from the tracker's committed moves so it can be saved when it ends.
 *
 * Pure state, no Android, no I/O: the engine publishes moves as events and its position as a FEN,
 * and everything the library stores is derivable from those two.
 */
class LiveGame(
    private val startFen: String,
    private val startedAtEpochMs: Long,
    private val profileName: String,
) {
    private val moves = mutableListOf<LiveMove>()

    val moveCount: Int get() = moves.size

    /**
     * [decision] is 07b's provenance row for this move, present only while the debug payload is
     * armed — a game recorded with debug off keeps its moves and loses only the reasoning.
     */
    fun onCommitted(
        event: TrackerEvent.MoveCommitted,
        tsEpochMs: Long,
        decision: DebugDecision?,
    ) {
        moves +=
            LiveMove(
                StoredMove(
                    ply = moves.size + 1,
                    san = event.san,
                    uci = event.uci,
                    tsEpochMs = tsEpochMs,
                    provenance = decision?.toProvenance(),
                ),
                fenAfter = event.fenAfter,
            )
    }

    /**
     * Detects an undo from the published position, because the engine emits no undo event
     * (`TrackerEngine.undo` only sets a note). A position that equals the one BEFORE the last move
     * can only mean the last move was taken back — and a taken-back move must not survive in the
     * library or as labeled training data.
     */
    fun onFen(fen: String): Boolean {
        val last = moves.lastOrNull() ?: return false
        if (fen == last.fenAfter || fen != fenBefore(moves.size - 1)) return false
        moves.removeAt(moves.size - 1)
        return true
    }

    fun finish(
        id: String,
        finishedAtEpochMs: Long,
        sessionId: String? = null,
    ): StoredGame =
        StoredGame(
            id = id,
            startFen = startFen,
            startedAtEpochMs = startedAtEpochMs,
            finishedAtEpochMs = finishedAtEpochMs,
            profileName = profileName,
            result = resultFromFen(moves.lastOrNull()?.fenAfter ?: startFen),
            moves = moves.map { it.move },
            sessionId = sessionId,
        )

    private fun fenBefore(index: Int): String = if (index == 0) startFen else moves[index - 1].fenAfter
}

fun DebugDecision.toProvenance(): MoveProvenance =
    MoveProvenance(
        decider = decider,
        reason = reason,
        priorUsed = priorUsed,
        best = bestScore,
        second = secondScore,
        margin = margin,
        changed = changed,
        shadowVetoed = shadowVetoed,
        occludedVetoed = occludedVetoed,
        cnnAgreement = cnnAgreement,
        verifyOutcomes = listOfNotNull(verifyOutcome),
    )
