package com.chesslab.engine

import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.clearAlarm
import com.chesslab.engine.api.clearReferenceState

// Re-anchor on the board WITHOUT inventing history: every other way out either fabricates the path
// (`commitRecovery` writes bridging moves) or destroys the record (`setFen`). A resync does neither —
// the moves really played stay, nothing is appended, one decision row records the discontinuity.

/** Adopt [fen], keep the history and the log, invent nothing. */
internal fun EngineState.performResync(
    fen: String,
    how: String,
): List<TrackerEvent> {
    val from = board.fen()
    adoptPosition(fen)
    recordResync(from, how)
    note = "RESYNC: position adopted ($how) — path unknown, ${history.size} plies kept"
    return clearAlarm(ALARM_RESYNCED)
}

/**
 * The position is redefined: every latch keyed to the old one goes, the reference is stale by
 * definition. History, decision log and the alarm are the caller's call.
 */
internal fun EngineState.adoptPosition(fen: String) {
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
    lastCnnTs = 0.0
    occlGridActive = false
    gridCoverage = 1.0
    takenBack = null
    clearDesyncStreak()
}

/**
 * The auto arm — a REPLAY instrument, off by default (`autoResyncObsN = 0`): with the alarm latched, that
 * many CONSECUTIVE observations must carry an identity axis, be hand-free and agree on the SAME position.
 * A legal bridge is preferred (it is history); the latching look is already vote one, so the phone keeps 0.
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
    if (!gated || Squares.ALL.all { snap.obs.label(it) == null }) return null
    // A hand or a kingless read PAUSES the streak, it does not reset it: a covered board says nothing
    // about where the pieces are (rec-20260808-115912: of 699 alarmed evaluations 222 were hand-free,
    // and 221 of those failed the kings guard). What resets is contradiction, not silence.
    val fen = if (handInFrame()) null else cnnAdoptedFen(snap.obs, confThr)
    if (fen == board.fen()) resetResyncVotes()
    return fen?.takeIf { it != board.fen() }
}

internal fun EngineState.resetResyncVotes() {
    resyncFen = null
    resyncVotes = 0
}

/** `san = null` so no consumer reads the row as a ply; `fenBefore` is the position abandoned. */
private fun EngineState.recordResync(
    from: String,
    how: String,
) {
    val row = decisionRow(DECIDER_CNN_RESYNC, "position adopted ($how) — path unknown, history kept", move = "")
    decisionLog.add(row.copy(fenBefore = from))
}

/** `clearAlarm`'s reason when a resync released the latch — the log's provenance string. */
internal const val ALARM_RESYNCED = "resynced"
