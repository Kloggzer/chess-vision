package com.chesslab.engine

import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.clearAlarm
import com.chesslab.engine.api.clearReferenceState
import com.chesslab.engine.api.cnnAdoptedFen

// specs/37 phase 02 — re-anchor on the board WITHOUT inventing history.
//
// Every other way out of a lost position either fabricates the path (`commitRecovery` writes
// bridging moves) or destroys the record (`setFen` clears history and the decision log). A resync
// does neither: the moves that were really played stay, NOTHING is appended, one decision row
// records the discontinuity, and the game continues from the adopted position. The absence of the
// bridging moves is the feature.

/**
 * Adopt [fen], keep the history, invent nothing.
 *
 * The resets mirror [com.chesslab.engine.api.TrackerEngine.setFen] deliberately — a resync is a
 * position redefinition and every latch keyed to the old position must go — EXCEPT the two that
 * ARE the phase: `history` and `decisionLog` survive. The reference is invalidated
 * (`clearReferenceState`): a resync means the reference is stale by definition, and the next
 * clean frame re-anchors it on the adopted position.
 */
internal fun EngineState.performResync(
    fen: String,
    how: String,
): List<TrackerEvent> {
    val from = board.fen()
    board = Game(fen)
    lastMove = null
    lastCommitSize = 0
    clearReferenceState()
    pendingCapture = null
    recoveredLast = false
    priorLast = false
    cnnStatus = null
    cnnConflicts = emptyList()
    holdUntil = 0.0
    refGamut = null
    motionSinceRef = false
    lastMotionTs = 0.0
    occlGridActive = false
    gridCoverage = 1.0
    takenBack = null
    confirmer.reset()
    recoveryConfirmer.reset()
    resetResyncVotes()
    clearStuck()
    clearDesyncStreak()
    recordResync(from, fen, how)
    note = "RESYNC: position adopted ($how) — path unknown, ${history.size} plies kept"
    return clearAlarm(ALARM_RESYNCED)
}

/**
 * The auto arm — a REPLAY instrument, off by default (`autoResyncObsN = 0`), and the phone keeps
 * the door specs/37-02 demands. With the alarm latched, [config.autoResyncObsN] CONSECUTIVE
 * observations must (a) carry an identity axis, (b) arrive with no engine-side hand signal
 * (`handInFrame` — its snapshot arm is blind on 13-class models, CLAUDE.md pitfall; the taints
 * are the honest arm), and (c) agree on the SAME adopted position, before the engine takes it.
 * One snapshot, one vote (the recovery seq-guard pattern); any hand, kingless read or changed
 * candidate resets the streak.
 *
 * A legal bridge that explains the conflicts is always preferred — the caller tries recovery
 * FIRST and only feeds a vote when no commit came out of it. A bridge is history; a resync is
 * the admission that none could be found.
 *
 * The observation that LATCHES the alarm is also the first vote: the latch and the vote run in
 * the same `cnnTick`, so `autoResyncObsN = n` means "the latching look plus n-1 more". At n = 1
 * a standoff resyncs the moment it latches — legitimate for an aggressive replay experiment,
 * and exactly why the phone keeps 0.
 */
internal fun EngineState.maybeAutoResync(
    snap: CnnSnapshot,
    confThr: Double,
): List<TrackerEvent> {
    val wanted = config.autoResyncObsN
    val fen = resyncVoteFen(snap, confThr) ?: return emptyList()
    lastResyncVoteSeq = snap.seq
    if (fen != resyncFen) {
        resyncFen = fen
        resyncVotes = 1
    } else {
        resyncVotes += 1
    }
    if (resyncVotes < wanted) {
        note = "resync candidate holds ($resyncVotes/$wanted consistent looks)…"
        return emptyList()
    }
    return performResync(fen, how = "auto, $wanted consistent looks")
}

/** The adopted FEN this snapshot may vote for, or null — resetting the streak where demanded. */
private fun EngineState.resyncVoteFen(
    snap: CnnSnapshot,
    confThr: Double,
): String? {
    val gated = config.autoResyncObsN > 0 && alarm != null && snap.seq != lastResyncVoteSeq
    if (!gated || Squares.ALL.none { snap.obs.label(it) != null }) return null
    // A hand or a kingless read PAUSES the streak, it does not reset it: a covered board is a
    // non-observation and says nothing about where the pieces are (measured on rec-20260808-115912:
    // of 699 alarmed evaluations 222 were hand-free but 221 of those failed the kings guard —
    // reset-on-hand made the streak unreachable even where clean adoptable reads existed). What
    // DOES reset is contradiction: a clean read matching the believed board, or a clean read
    // adopting a DIFFERENT position than the streak's candidate (handled by the caller's
    // key change).
    val fen = if (handInFrame()) null else cnnAdoptedFen(snap.obs, confThr)
    if (fen == board.fen()) resetResyncVotes()
    return fen?.takeIf { it != board.fen() }
}

internal fun EngineState.resetResyncVotes() {
    resyncFen = null
    resyncVotes = 0
}

/**
 * One row, [DECIDER_CNN_RESYNC], `san = null` so no consumer reads it as a ply
 * (`DecisionCollector` skips rows without a san). `fenBefore` is the position ABANDONED,
 * `fenAfter` the one adopted — the discontinuity, written down.
 */
private fun EngineState.recordResync(
    from: String,
    to: String,
    how: String,
) {
    decisionLog.add(
        DecisionRecord(
            tsS = nowS,
            ply = history.size,
            move = "",
            san = null,
            fenBefore = from,
            fenAfter = to,
            decider = DECIDER_CNN_RESYNC,
            reason = "position adopted ($how) — path unknown, history kept",
            priorUsed = false,
            bestScore = bestScore,
            secondScore = secondScore,
            margin = bestScore - secondScore,
            changed = changed.sortedSquareNames(),
            changedVals = changedVals.toList(),
            shadowVetoed = shadowVetoed.sortedSquareNames(),
            occludedVetoed = occludedVetoed.sortedSquareNames(),
            gridCoverage = gridCoverage,
            zThr = config.zThr,
            motion = motion,
            cnnRun = cnnRun,
            cnnAgreement = cnnAgreement,
            cnnReadsTaken = cnnReadsTaken,
            cnnReadsStale = cnnReadsStale,
            cnnSnaps = cnnSnapsSeen,
            cnnSnapsToVerify = cnnSnapsToVerify,
            cnnSnapsNoEvaluator = cnnSnapsNoEvaluator,
            cnnSnapsNotDue = cnnSnapsNotDue,
            cnnBestMove = cnnBestMove,
            stuckReason = stuckReason,
            verifyOutcome = null,
            accepted = true,
        ),
    )
}

/** `clearAlarm`'s reason when a resync released the latch — the log's provenance string. */
internal const val ALARM_RESYNCED = "resynced"
