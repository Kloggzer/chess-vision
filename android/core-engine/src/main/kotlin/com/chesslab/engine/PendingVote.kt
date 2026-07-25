package com.chesslab.engine

/**
 * `_pending_voted` — no verify decision on a single CNN glance.
 *
 * The g8h6 overrule incident (2026-07-09): one frame's confident-empty misread overruled a real
 * move. The SAME outcome must be seen on [votesNeeded] consecutive observations; a different
 * outcome resets the count (entry.md invariant 13). With the free-running observer a second glance
 * costs about one inference.
 *
 * The outcome of an overrule carries the uci (`"overrule:d2d4"`) on purpose: a CNN that changes its
 * mind about WHICH move it saw must start counting from one.
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
