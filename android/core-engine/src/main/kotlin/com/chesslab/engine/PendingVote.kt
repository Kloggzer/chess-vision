package com.chesslab.engine

/**
 * Observations the CONFIRM rung needs, where every other rung needs `verifyObsVotes`: contradiction
 * needs two glances (g8h6 incident, 2026-07-09), concurrence one — two independent instruments agreeing
 * is not the failure mode, and a second glance costs a full round trip, ~0.21 s on the SM8650.
 */
internal const val COMMIT_VOTES = 1

/** Terminal verdicts against the diff candidate — each hands its reading to an independent recovery vote. */
internal const val VERIFY_STATE_GHOST = "ghost"
internal const val VERIFY_STATE_SHADOW = "shadow"

/**
 * The pre-commit verify's wall-clock bound, which `verifyWindow` cannot express because it counts
 * observations. Measured over 66 pending candidates: every one that ever commits is decided on its FIRST
 * usable observation, every other stays flat — later glances only cost a round trip that blocks recovery.
 */
internal fun EngineState.verifyExpired(pend: PendingVerify): Boolean = nowS - pend.startedS >= config.verifyTimeoutS

/**
 * Watchdog for an observer that STOPPED, not one that is merely slow ([verifyExpired] owns that):
 * frames only advance inside a tick, so an attach that dies mid-game leaves the engine refusing every
 * detection forever. The candidate is dropped and the diff path tries again, base truth untouched.
 */
internal fun EngineState.expireStalledVerify() {
    val pend = pending ?: return
    if (nowS - pend.lastTickS < config.verifyTimeoutS) return
    pending = null
    confirmer.reset()
    verifyState = VERIFY_STATE_STALLED
    note = "CNN did not answer within ${config.verifyTimeoutS}s — pending candidate dropped"
}

/**
 * No verify decision on a single CNN glance: in the g8h6 incident (2026-07-09) one frame's confident-empty
 * misread overruled a real move. The SAME outcome must be seen on [votesNeeded] consecutive observations,
 * a different one resets (invariant 13); an overrule's outcome carries the uci, so a changed mind restarts.
 */
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
