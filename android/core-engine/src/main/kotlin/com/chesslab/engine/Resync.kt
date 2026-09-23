package com.chesslab.engine

import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.clearAlarm
import com.chesslab.engine.api.clearReferenceState

// Re-anchor WITHOUT inventing history: recovery fabricates the path, `setFen` destroys the record. A resync
// keeps the moves played, appends nothing and records one discontinuity row.

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

/** Every latch keyed to the old position goes; history, log and alarm are the caller's call. */
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

/** A REPLAY instrument, off by default: with the alarm latched, that many CONSECUTIVE hand-free identity
 *  looks must agree on ONE position. A legal bridge is preferred (it is history). */
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

private fun EngineState.resyncVoteFen(
    snap: CnnSnapshot,
    confThr: Double,
): String? {
    val gated = config.autoResyncObsN > 0 && alarm != null && snap.seq != lastResyncVoteSeq
    if (!gated || Squares.ALL.all { snap.obs.label(it) == null }) return null
    // A hand or a kingless read PAUSES the streak: silence says nothing (of 222 hand-free alarmed evaluations
    // 221 failed the kings guard). Contradiction resets, silence does not.
    val fen = if (handInFrame()) null else cnnAdoptedFen(snap.obs, confThr)
    if (fen == board.fen()) resetResyncVotes()
    return fen?.takeIf { it != board.fen() }
}

internal fun EngineState.resetResyncVotes() {
    resyncFen = null
    resyncVotes = 0
}

/** `san = null` so no consumer reads the row as a ply. */
private fun EngineState.recordResync(
    from: String,
    how: String,
) {
    val row = decisionRow(DECIDER_CNN_RESYNC, "position adopted ($how) — path unknown, history kept", move = "")
    decisionLog.add(row.copy(fenBefore = from))
}

internal const val ALARM_RESYNCED = "resynced"
