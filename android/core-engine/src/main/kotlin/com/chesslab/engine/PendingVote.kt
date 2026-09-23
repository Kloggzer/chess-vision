package com.chesslab.engine

/** Contradiction needs two glances (g8h6), concurrence one: two instruments agreeing is not the failure
 *  mode, and a second glance costs ~0.21 s on the SM8650. */
internal const val COMMIT_VOTES = 1

/** Each terminal against the diff hands its reading to an independent recovery vote. */
internal const val VERIFY_STATE_GHOST = "ghost"
internal const val VERIFY_STATE_SHADOW = "shadow"

/** `verifyWindow` counts observations; this is wall time. Over 66 candidates every one that ever commits was
 *  decided on its FIRST usable observation — later glances only block recovery. */
internal fun EngineState.verifyExpired(pend: PendingVerify): Boolean = nowS - pend.startedS >= config.verifyTimeoutS

/** An observer that STOPPED ([verifyExpired] owns slow): frames only advance inside a tick, so a dead attach
 *  would refuse every detection forever. The candidate drops; base truth stays. */
internal fun EngineState.expireStalledVerify() {
    val pend = pending ?: return
    if (nowS - pend.lastTickS < config.verifyTimeoutS) return
    pending = null
    confirmer.reset()
    verifyState = VERIFY_STATE_STALLED
    note = "CNN did not answer within ${config.verifyTimeoutS}s — pending candidate dropped"
}

/** Never on one glance (g8h6: one confident-empty misread overruled a real move). The SAME outcome on
 *  [votesNeeded] consecutive observations; an overrule's key carries its uci (invariant 13). */
internal fun EngineState.pendingVoted(
    outcome: String,
    votesNeeded: Int,
): Boolean {
    val pend = pending ?: return false
    if (pend.voteOutcome == outcome) {
        pend.voteCount += 1
    } else {
        pend.voteOutcome = outcome
        pend.voteCount = 1
    }
    if (pend.voteCount >= votesNeeded) return true
    note = "verify: $outcome? confirming (${pend.voteCount}/$votesNeeded)"
    return false
}
