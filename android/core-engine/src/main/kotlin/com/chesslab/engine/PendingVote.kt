package com.chesslab.engine

/**
 * `tracker.py::_COMMIT_VOTES` — observations the CONFIRM rung needs, where every other rung needs
 * `verifyObsVotes`.
 *
 * That knob is 2 because a single glance must not OVERRULE the diff (g8h6 incident, 2026-07-09).
 * Confirming is the opposite situation: the CNN agrees with a candidate the diff already carried
 * through `confirmFrames`, the ambiguity margin and `commitLlFloor` — two independent instruments
 * concurring is not the failure mode the vote was built against. And the second glance is
 * expensive: one observation costs a full observer round trip (crop request + inference), ~0.21 s
 * on the SM8650, which is ~40% of a commit's wall-clock latency. Contradiction needs two glances;
 * concurrence needs one.
 */
internal const val COMMIT_VOTES = 1

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
 *
 * The CONFIRM rung passes [COMMIT_VOTES] instead — see there.
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
