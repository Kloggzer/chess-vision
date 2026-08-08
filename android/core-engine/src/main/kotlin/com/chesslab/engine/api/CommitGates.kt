package com.chesslab.engine.api

import com.chesslab.engine.Candidate
import com.chesslab.engine.EngineState
import com.chesslab.engine.handInFrame
import com.chesslab.engine.pyFixed
import com.chesslab.engine.recordRejection
import com.chesslab.engine.uciOf

/**
 * Steps 6b, 7 and 8 — the gates between a candidate and dispatch. `true` = commit it.
 *
 * Each gate refuses the same way: reset the confirmer (a refused candidate must not keep its
 * streak), say why in the note, and record the rejection so the decision log carries refusals,
 * not only commits. The confirmer itself is the last gate: the same candidate over N stable
 * frames, where an endpoint candidate (`vote = false`) skips the vote — its CNN verify IS the
 * multi-frame confirmation.
 */
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

/**
 * The `cleanCommitsOnly` EXPERIMENT: no candidate advances while anything reads as a hand. Sits
 * before the confirmer so a hand does not burn votes.
 */
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

/**
 * Step 6b, the absolute LL floor: a sole-viable candidate has an infinite margin, so a weak
 * phantom (`f6h5 @ 0.44` swallowed a live castle) sails through every margin check. Endpoint
 * candidates (`vote = false`) stay exempt — they are CNN-verified by design.
 */
private fun EngineState.llFloorGate(
    cand: Candidate,
    sans: String,
    key: String,
): Boolean {
    if (!cand.vote || config.commitLlFloor <= 0 || bestScore >= config.commitLlFloor) return true
    confirmer.reset()
    note =
        "$sans? evidence too weak (${pyFixed(bestScore, 2)} < ${pyFixed(config.commitLlFloor, 1)}) — " +
        "not committing"
    recordRejection(key, note.orEmpty())
    return false
}

/**
 * Step 7, the motion gate: a real move is always preceded by a hand, and it becomes visible
 * within seconds of the hand leaving. BOTH conditions are needed — `motionSinceRef` alone was
 * armed forever by a single wobble spike.
 */
private fun EngineState.motionGate(
    sans: String,
    key: String,
): Boolean {
    if (!config.requireMotionForMove) return true
    val age = nowS - lastMotionTs
    // `motionRecencyS <= 0` is OFF — no recency limit — the way 0 means off for every other
    // knob in the catalog (`censusZWeight`, `minGridLineCoverage`, `occlusionColorThr`,
    // `commitLlFloor`, `observerIntervalS`). Read literally it meant `age > 0`, i.e. reject
    // EVERY candidate: by the time one exists the hand is long gone (settle frames plus
    // `motionHoldS`), so the age is never zero. Found live on 2026-08-01 — the device had it at
    // 0.0 and the deterministic channel had not committed a single move in the whole session,
    // every one of them waiting out the 10 s CNN recovery poll instead.
    val stale = config.motionRecencyS > 0.0 && age > config.motionRecencyS
    if (motionSinceRef && !stale) return true
    confirmer.reset()
    val why = if (!motionSinceRef) "no motion since last move" else "last motion ${pyFixed(age, 0)}s ago"
    note = "$sans? ignored — $why (drift/light, not a real move)"
    recordRejection(key, note.orEmpty())
    return false
}
