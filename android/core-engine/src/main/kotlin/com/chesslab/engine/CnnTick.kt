package com.chesslab.engine

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.clearAlarm
import com.github.bhlangonijr.chesslib.move.Move

private const val CNN_STATUS_OK = "ok"

/** Not private: [maybePatchAnomaly] refuses to heal anything into the reference while it stands. */
internal const val CNN_STATUS_MISMATCH = "mismatch"

/** `_verify_state` after a match-ok reference pull-forward. */
internal const val VERIFY_STATE_RESYNCED = "resynced"

private const val PERCENT = 100.0

/** What ONE observation says about the believed position — the five values travel together. */
private class CnnRead(
    val moves: List<String>,
    val agreement: Double,
    val conflicts: List<String>,
    val matchOk: Boolean,
    val inconclusive: Boolean,
)

/**
 * `_cnn_tick` — evaluate one CNN observation. Phase 04a routes here when nothing is pending.
 *
 * The observation itself is unconditional (Spec 11); the old demand conditions survive only as the
 * EVALUATION gates in [evaluationDue]. The snapshot carries the anchor warp of the observed frame
 * and the FEN at observation start, so every commit here anchors base truth on the frame the CNN
 * actually LOOKED AT — `lastCur` is several frames newer and may already contain the opponent's
 * next move (entry.md invariant 5).
 */
internal fun EngineState.cnnTick(
    cnn: CnnEvaluator?,
    snap: CnnSnapshot,
): List<TrackerEvent> {
    if (cnn == null || !evaluationDue()) return emptyList()
    val obs = snap.obs
    val hasIdentity = Squares.ALL.any { obs.label(it) != null }
    val read = if (hasIdentity) identityRead(cnn, obs) else occupancyRead(cnn, obs)
    lastCnnTs = nowS
    if (board.fen() != snap.fen) {
        // The state moved on while we looked — the reading describes a position we no longer hold.
        recoveryConfirmer.reset()
        return emptyList()
    }
    cnnAgreement = read.agreement
    cnnBestMove = read.moves.takeIf { it.isNotEmpty() }?.joinToString(" ")
    return applyRead(cnn, snap, read, hasIdentity)
}

/**
 * `stuck` deliberately does NOT require a stable board — a stuck tracker is exactly the case where
 * the board never looks quiet enough — while the periodic check does.
 */
private fun EngineState.evaluationDue(): Boolean {
    val stable = grayBuf.size >= avgFrames && (state == STATE_WAITING || state == STATE_MOVE)
    val stuck =
        stuckReason != null && stuckCount >= settleFrames && (nowS - lastCnnTs) >= config.cnnCooldownS
    return stuck || (stable && (nowS - lastCnnTs) >= config.cnnCheckIntervalS)
}

private fun EngineState.applyRead(
    cnn: CnnEvaluator,
    snap: CnnSnapshot,
    read: CnnRead,
    hasIdentity: Boolean,
): List<TrackerEvent> =
    when {
        read.matchOk -> onMatchOk(cnn, snap)
        read.inconclusive -> {
            // Too occluded to make a statement — and occlusion breaks the desync streak.
            recoveryConfirmer.reset()
            desyncObs = 0
            emptyList()
        }
        else -> onMismatch(cnn, snap, read, hasIdentity)
    }

/**
 * The identity axis is the WEAKER one: one confident type misread anywhere holds agreement below
 * `minAgreement` forever, so corrections and take-backs would never update (the b8b6->c6 correction
 * incident). Occupancy is the more reliable axis, so an identity mismatch is re-checked with
 * identity stripped before it is believed.
 *
 * This used to read "~40% on piece types". Measured on `occ-v10bn35-13c-hn` over the 7 217 occupied
 * crops of `occ-warm-13c-hn`'s test split it is **0.882**, against ~99.99% on `empty` — still an
 * asymmetry, but a much smaller one than the number this function was written against. What the
 * re-check defends is unchanged by that: it takes ONE misread square to sink whole-board agreement,
 * and 0.882 over 32 pieces still expects a few. Whether the strip-and-retry should now be narrower
 * is an open measurement question; nobody has re-run it.
 */
private fun EngineState.identityRead(
    cnn: CnnEvaluator,
    obs: CnnObservation,
): CnnRead {
    val fen = board.fen()
    val matches = cnn.boardMatchesIdentity(fen, obs)
    var derived = cnn.deriveMovesDeep(fen, obs, config.recoveryMaxPlies)
    if (matches.match || matches.inconclusive) {
        return CnnRead(derived.moves, derived.agreement, matches.conflicts, matches.match, matches.inconclusive)
    }
    val occObs = obs.occupancyOnly()
    if (cnn.resyncCheck(fen, occObs).match) {
        // Identity-only disagreement: occupancy says the board DOES match the game state.
        return CnnRead(derived.moves, derived.agreement, emptyList(), matchOk = true, inconclusive = false)
    }
    if (derived.moves.isEmpty()) {
        val deep = cnn.deriveMovesDeep(fen, occObs, config.recoveryMaxPlies)
        if (deep.moves.isNotEmpty()) derived = deep
    }
    return CnnRead(derived.moves, derived.agreement, matches.conflicts, matchOk = false, inconclusive = false)
}

/**
 * The occupancy-only arm — `tracker.py:2020-2028`, the `else` of `_cnn_tick`'s identity branch.
 *
 * `resync_check` names the ONE legal move whose occupancy explains the observation, and how well.
 * Python takes THAT move and THAT agreement, and reaches for the deep beam search only as a
 * fallback: when resync named no move and the board does not match.
 *
 * This used to run `deriveMovesDeep` unconditionally on every non-match (D04c-2). The divergence
 * was accepted as "the agreement number, not the decision", on the reasoning that the path was
 * unreachable with the bundled 14-class model. That reasoning expired the moment a 2-class model
 * shipped: `observationFromProbs` returns no identity for it, so this arm became the ONLY reachable
 * one — and the deep search returns up to `recoveryMaxPlies` moves where resync names one. On the
 * device that is visible as multi-ply commits: 69 recorded plies contained two bursts of 3 and 4.
 */
private fun EngineState.occupancyRead(
    cnn: CnnEvaluator,
    obs: CnnObservation,
): CnnRead {
    val fen = board.fen()
    val res = cnn.resyncCheck(fen, obs)
    var moves = res.move?.let { listOf(it) } ?: emptyList()
    var agreement = res.agreement
    if (moves.isEmpty() && !res.match) {
        val deep = cnn.deriveMovesDeep(fen, obs, config.recoveryMaxPlies)
        if (deep.moves.isNotEmpty()) {
            moves = deep.moves
            agreement = deep.agreement
        }
    }
    return CnnRead(moves, agreement, res.conflicts, matchOk = res.match, inconclusive = false)
}

/**
 * "Nothing changed": the CNN confirms the board matches the game state, so the diff was stuck on
 * shadow or drift. Pull the reference forward, commit NO move — and release the latch, because a
 * matching board is the take-back the alarm was waiting for.
 */
private fun EngineState.onMatchOk(
    cnn: CnnEvaluator,
    snap: CnnSnapshot,
): List<TrackerEvent> {
    // A glance that saw nothing cannot report "unchanged". `resyncCheckFull` builds its conflict
    // set from CONFIDENT squares only, so zero confident squares yields an empty set, `match =
    // true` and agreement 1.0 — a hand over the board then clears the alarm and pulls the
    // reference onto the covered frame. The verify ladder has guarded exactly this with
    // `minConfidentBoard` since it was written (`VerifySingle` rung 1); the periodic check never
    // did, and Python does not either.
    if (Squares.ALL.count { snap.obs.confident(it, cnn.confThr) } < cnn.minConfidentBoard) {
        cnnStatus = CNN_STATUS_OK
        note = "CNN: too little of the board is legible to confirm it — holding"
        return emptyList()
    }
    cnnStatus = CNN_STATUS_OK
    cnnConflicts = emptyList()
    val events = mutableListOf<TrackerEvent>()
    if (alarm != null) {
        events += clearAlarm(null)
        note = "board restored — alarm cleared"
    }
    recoveryConfirmer.reset()
    val anchor = recoveryAnchor(snap)
    if (stuckReason != null && anchor != null) {
        // `fromCommit = true`: the CNN tolerates partial occlusion (`minConfidentRecovery`), so
        // this frame is not verifiably clean enough to rebuild the colour gamut (invariant 6).
        setRef(anchor.cur, anchor.curBgr, fromCommit = true)
        clearStuck()
        confirmer.reset()
        verifyState = VERIFY_STATE_RESYNCED
        note = "CNN: board unchanged — reference pulled forward (no move)"
    }
    return events
}

private fun EngineState.onMismatch(
    cnn: CnnEvaluator,
    snap: CnnSnapshot,
    read: CnnRead,
    hasIdentity: Boolean,
): List<TrackerEvent> {
    cnnStatus = CNN_STATUS_MISMATCH
    cnnConflicts = read.conflicts
    if (read.moves.isNotEmpty()) return onRecovery(snap, read, hasIdentity)
    val events = onStableMismatch(cnn, snap.obs, snap, read.conflicts)
    recoveryConfirmer.reset()
    return events
}

private fun EngineState.onRecovery(
    snap: CnnSnapshot,
    read: CnnRead,
    hasIdentity: Boolean,
): List<TrackerEvent> {
    val key = read.moves.joinToString(" ")
    // Voting, not single-shot: the legacy port pushed a whole sequence onto the board on ONE
    // glance (specs/12 D6). The recovery confirmer is what makes it multi-observation evidence.
    if (!recoveryConfirmer.feed(key)) {
        note = "CNN recovery checks $key… (${recoveryConfirmer.count}/$confirmFrames)"
        return emptyList()
    }
    val moves = board.resolveSequence(read.moves)
    return when {
        moves == null -> emptyList()
        alarm != null && !resolvesAlarmConflicts(snap.obs, moves, hasIdentity) -> {
            // A legal-looking sequence that leaves a conflict square unexplained is a fabrication.
            note = "ILLEGAL MOVE? CNN recovery would not resolve conflicts — withholding"
            recoveryConfirmer.reset()
            emptyList()
        }
        else -> commitRecovery(snap, moves, read.agreement)
    }
}

/**
 * Every latched conflict square must read as the sequence PREDICTS it. Without an identity axis
 * nothing is verifiable, so the sequence is withheld rather than trusted.
 */
private fun EngineState.resolvesAlarmConflicts(
    obs: CnnObservation,
    moves: List<Move>,
    hasIdentity: Boolean,
): Boolean {
    val latched = alarm ?: return true
    if (!hasIdentity) return false
    val after = board.copy()
    for (move in moves) after.push(move)
    return latched.conflicts.none {
        obs.labelConfident(it, config.cnnConfThr) && obs.label(it) != after.labelAt(it)
    }
}

private fun EngineState.commitRecovery(
    snap: CnnSnapshot,
    moves: List<Move>,
    agreement: Double,
): List<TrackerEvent> {
    val fenBefore = board.fen()
    val ucis = moves.map { uciOf(it) }
    val sans = ArrayList<String>(moves.size)
    for (move in moves) {
        sans.add(board.san(move))
        board.push(move)
    }
    history.addAll(sans)
    lastMove = ucis.last()
    recordDecision(moves.last(), sans.last(), fenBefore, DECIDER_CNN_RECOVERY, priorUsed = false)
    queueSessionCapture(sans.last())
    val anchor = recoveryAnchor(snap)
    if (anchor == null) {
        refGray = null
        refBgr = null
        refFen = null
        grayBuf.clear()
    } else {
        setRef(anchor.cur, anchor.curBgr, fromCommit = true)
    }
    // Recovery means we WERE behind: a reply played during the recovery window is already visible
    // against this (old) reference, so grant exactly one motion window — otherwise the recency
    // gate holds that reply hostage until the next recovery cycle.
    motionSinceRef = true
    lastMotionTs = nowS
    state = STATE_MOVE
    recoveredLast = true
    priorLast = false
    cnnStatus = CNN_STATUS_OK
    cnnConflicts = emptyList()
    confirmer.reset()
    clearStuck()
    // A successful commit while alarmed means the move resolved the conflict.
    val events = clearAlarm(null).toMutableList()
    note = "Move detected by CNN recovery: ${sans.joinToString(" + ")} (agreement ${pyFixed(agreement * PERCENT, 0)}%)"
    events +=
        if (moves.size == 1) {
            TrackerEvent.MoveCommitted(ucis[0], sans[0], board.fen(), DECIDER_CNN_RECOVERY, false)
        } else {
            TrackerEvent.SequenceCommitted(ucis, sans, board.fen(), DECIDER_CNN_RECOVERY)
        }
    return events
}

/** entry.md invariant 5 — `lastCur` is the fallback ONLY when the snapshot carries no usable warp. */
private fun EngineState.recoveryAnchor(snap: CnnSnapshot): CommitAnchor? =
    snap.anchorAtDetSize(detSize) ?: lastCur?.let { CommitAnchor(it, lastCurBgr) }

/** The derived ucis as legal moves applied in order, or `null` if one of them does not apply. */
private fun Game.resolveSequence(ucis: List<String>): List<Move>? {
    val probe = copy()
    val out = ArrayList<Move>(ucis.size)
    for (uci in ucis) {
        val move = probe.legalMoves().firstOrNull { uciOf(it) == uci } ?: return null
        out.add(move)
        probe.push(move)
    }
    return out
}
