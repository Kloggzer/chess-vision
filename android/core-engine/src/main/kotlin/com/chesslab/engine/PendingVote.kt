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
 * `_verify_expired` — the pre-commit verify's wall-clock bound, the deadline [TrackerConfig.verifyWindow]
 * cannot express because it counts observations.
 *
 * Measured over 66 pending candidates on 15 clips + 3 real recordings
 * (`scripts/replay_clip_cnn.py`): every candidate that ever commits is decided on its FIRST usable
 * observation (local agreement 1.000, 6/6 pairs and 55/55 singles), and every candidate that does
 * not is flat below the threshold for the whole window (0.500, 0.500, 0.667-0.75, 0.75) and never
 * once rises. The later observations carry no information, and each costs a full round trip during
 * which nothing can be detected and recovery cannot run.
 */
internal fun EngineState.verifyExpired(pend: PendingVerify): Boolean = nowS - pend.startedS >= config.verifyTimeoutS

/**
 * `_expire_stalled_verify` — watchdog for an observer that STOPPED, not one that is merely slow.
 *
 * [PendingVerify.frames] only advances inside a tick, so a candidate that receives no observation
 * at all is bounded by nothing: an attach that dies mid-game leaves the engine refusing every
 * detection and routing nothing to recovery, with the note still reading "checking … via CNN".
 * The slow case is handled inside the ladder ([verifyExpired], which resolves on the evidence it
 * has); this is the case where there is none, so the candidate is dropped and the diff path tries
 * again — base truth untouched, exactly as a rejected verify leaves it.
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
