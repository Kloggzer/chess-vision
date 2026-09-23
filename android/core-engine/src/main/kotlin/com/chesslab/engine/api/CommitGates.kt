package com.chesslab.engine.api

import com.chesslab.engine.Candidate
import com.chesslab.engine.EngineState
import com.chesslab.engine.handInFrame
import com.chesslab.engine.pyFixed
import com.chesslab.engine.recordRejection
import com.chesslab.engine.uciOf

/** A refusal resets confirmation so rejected evidence cannot contribute to a later commit. */
internal fun EngineState.commitGates(cand: Candidate): Boolean {
    val sans = board.sanSequence(cand.moves).joinToString(" + ")
    val key = cand.moves.joinToString(" ") { uciOf(it) }
    if (!cleanHandGate(sans, key) || !llFloorGate(cand, sans, key) || !motionGate(sans, key)) return false
    candidateUci = key
    if (cand.vote && !confirmer.feed(key)) {
        note = "detecting $sans… (${confirmer.count}/$confirmFrames)"
        return false
    }
    return true
}

/** This gate precedes confirmation so a hand cannot burn votes. */
private fun EngineState.cleanHandGate(
    sans: String,
    key: String,
): Boolean {
    if (!config.cleanCommitsOnly || !handInFrame()) return true
    confirmer.reset()
    note = "$sans? hand in frame — clean commits only (experiment)"
    recordRejection(key, note.orEmpty())
    return false
}

/** The absolute floor blocks sole-candidate phantoms; `f6h5 @ 0.44` swallowed a live castle. */
private fun EngineState.llFloorGate(
    cand: Candidate,
    sans: String,
    key: String,
): Boolean {
    if (!cand.vote || config.commitLlFloor <= 0 || bestScore >= config.commitLlFloor) return true
    confirmer.reset()
    // Wiederholte Ablehnungen holen die CNN dazu; siehe `docs/tracker-flow.md`.
    refusedStreak = if (key == refusedKey) refusedStreak + 1 else 1
    refusedKey = key
    note =
        "$sans? evidence too weak (${pyFixed(bestScore, 2)} < ${pyFixed(config.commitLlFloor, 1)}) — " +
        "not committing"
    recordRejection(key, note.orEmpty())
    return false
}

/** Motion must be recent because one wobble spike otherwise arms the gate forever. */
private fun EngineState.motionGate(
    sans: String,
    key: String,
): Boolean {
    if (!config.requireMotionForMove) return true
    val age = nowS - lastMotionTs
    // `motionRecencyS <= 0` means no limit; treating 0 literally blocked every move on 2026-08-01.
    val stale = config.motionRecencyS > 0.0 && age > config.motionRecencyS
    if (motionSinceRef && !stale) return true
    confirmer.reset()
    val why = if (!motionSinceRef) "no motion since last move" else "last motion ${pyFixed(age, 0)}s ago"
    note = "$sans? ignored — $why (drift/light, not a real move)"
    recordRejection(key, note.orEmpty())
    return false
}
