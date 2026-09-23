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

/** The verify state after a match-ok reference pull-forward. */
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
 * Evaluate one CNN observation; the route taken when nothing is pending. The snapshot carries the
 * anchor warp and FEN of the observed frame, so every commit here anchors base truth on the frame
 * the CNN actually LOOKED AT — `lastCur` may already hold the opponent's next move (invariant 5).
 */
internal fun EngineState.cnnTick(
    cnn: CnnEvaluator?,
    snap: CnnSnapshot,
    afterRejectedVerify: Boolean = false,
): List<TrackerEvent> {
    // One exit, two reasons, and the evaluator carried OUT of the check so it stays non-null:
    // which gate closed is the whole point of the counters, and `evaluationDue` must be asked
    // once — it reads the clock and the frame buffer, so a second call is a second answer.
    val model =
        when {
            cnn == null -> {
                cnnSnapsNoEvaluator += 1
                null
            }
            !afterRejectedVerify && !evaluationDue() -> {
                cnnSnapsNotDue += 1
                null
            }
            else -> cnn
        } ?: return emptyList()
    if (board.fen() != snap.fen) {
        // The state moved on while we looked — the reading describes a position we no longer hold.
        cnnReadsStale += 1
        recoveryConfirmer.reset()
        return emptyList()
    }
    // Reject obsolete work before searching legal continuations or consuming the current
    // position's evaluation slot. A fresh reading may arrive immediately after this one.
    val read = identityRead(model, snap.obs)
    lastCnnTs = nowS
    lastEvalEpoch = motionEpoch
    cnnReadsTaken += 1
    cnnAgreement = read.agreement
    cnnBestMove = read.moves.takeIf { it.isNotEmpty() }?.joinToString(" ")
    // The terminal verdict already anchored on the candidate's averaged frame; a match here has
    // nothing to add and must not re-anchor on the frame the CNN looked at (invariant 5).
    return if (afterRejectedVerify && read.matchOk) {
        recoveryConfirmer.reset()
        emptyList()
    } else {
        applyRead(model, snap, read)
    }
}

/**
 * `stuck` deliberately does NOT require a stable board — a stuck tracker is exactly the case where
 * the board never looks quiet enough — while the periodic check does. An OPEN recovery vote needs no
 * gate: it wants two looks at the SAME board, and a cooldown delivers two changed ones.
 */
private fun EngineState.evaluationDue(): Boolean {
    // An open desync fills its threshold at observation rate: waiting buys no independence
    // (`docs/tracker-flow.md`); `alarmDeferred` guards against the hand instead.
    if (recoveryConfirmer.count > 0 || desyncObs in 1 until config.desyncObsN) return true
    val cooled = (nowS - lastCnnTs) >= config.cnnCooldownS
    val stable = grayBuf.size >= avgFrames && (state == STATE_WAITING || state == STATE_MOVE)
    val stuck = stuckReason != null && stuckCount >= settleFrames && cooled
    // Repeated refusal used to keep the CNN OUT — 70x `Kf1` without one read (`docs/tracker-flow.md`).
    val refused = config.refusedStreakForEval > 0 && refusedStreak >= config.refusedStreakForEval && cooled
    // Motion since the last evaluation makes this read new whatever the clock says.
    val settled = config.cnnEvalOnSettle && motionEpoch != lastEvalEpoch
    return stuck || refused || (stable && (settled || (nowS - lastCnnTs) >= config.cnnCheckIntervalS))
}

private fun EngineState.applyRead(
    cnn: CnnEvaluator,
    snap: CnnSnapshot,
    read: CnnRead,
): List<TrackerEvent> =
    when {
        read.matchOk -> onMatchOk(cnn, snap)
        read.inconclusive -> {
            // Too occluded to make a statement — and occlusion breaks the desync streak.
            recoveryConfirmer.reset()
            clearDesyncStreak()
            emptyList()
        }
        else -> onMismatch(cnn, snap, read)
    }

/**
 * The identity axis is the WEAKER one — 0.882 on occupied crops against ~99.99 % on `empty`, and one
 * confident type misread holds agreement below `minAgreement` forever, so corrections and take-backs
 * would never update (the b8b6->c6 incident). An identity mismatch is re-checked with it stripped.
 */
private fun EngineState.identityRead(
    cnn: CnnEvaluator,
    obs: CnnObservation,
): CnnRead {
    val fen = board.fen()
    val matches = cnn.boardMatchesIdentity(fen, obs)
    var derived = cnn.deriveMovesDeep(fen, obs, config.recoveryMaxPlies)
    if (matches.inconclusive) {
        return CnnRead(derived.moves, derived.agreement, matches.conflicts, matches.match, inconclusive = true)
    }
    val occObs = obs.occupancyOnly()
    // BOTH axes, in both directions. Identity only sees LABEL-confident squares, so an extra piece
    // on an occupancy-confident but label-unconfident one used to pass as "unchanged" and had
    // `onMatchOk` clear the latch over it; occupancy alone still rescues an identity-only mismatch.
    val occ = cnn.resyncCheck(fen, occObs)
    if (occ.match) {
        return CnnRead(derived.moves, derived.agreement, emptyList(), matchOk = true, inconclusive = false)
    }
    if (derived.moves.isEmpty()) {
        val deep = cnn.deriveMovesDeep(fen, occObs, config.recoveryMaxPlies)
        if (deep.moves.isNotEmpty()) derived = deep
    }
    val conflicts = if (matches.match) occ.conflicts else matches.conflicts
    return CnnRead(derived.moves, derived.agreement, conflicts, matchOk = false, inconclusive = false)
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
    // A glance that saw nothing cannot report "unchanged": zero confident squares yields an empty
    // conflict set, `match = true` and agreement 1.0, so a hand over the board would clear the alarm
    // and pull the reference onto the covered frame. `VerifySingle` rung 1 has always guarded this.
    if (Squares.ALL.count { snap.obs.confident(it, cnn.confThr) } < cnn.minConfidentBoard) {
        cnnStatus = CNN_STATUS_OK
        note = "CNN: too little of the board is legible to confirm it — holding"
        return emptyList()
    }
    cnnStatus = CNN_STATUS_OK
    cnnConflicts = emptyList()
    // A matching board is the END of a disagreement, and until now only a LATCHED one noticed: the
    // reset lived solely in `clearAlarm`, which returns early when nothing is latched. So mismatches
    // INTERLEAVED with clean glances still reached the alarm, and `desyncObs` never returned to
    // zero, keeping `maybePatchAnomaly` off from the first disagreement onwards.
    clearDesyncStreak()
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
        setRefComposite(anchor.cur, anchor.curBgr, visibleSquares(snap), fromCommit = true)
        // Ein gegen die alte Referenz gestarteter Timer autorisiert sonst sofort einen Patch
        // gegen die neue — `finishCommit` und der stille Neu-Anker raeumen ihn aus demselben Grund.
        anomalySince = 0L
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
): List<TrackerEvent> {
    cnnStatus = CNN_STATUS_MISMATCH
    cnnConflicts = read.conflicts
    if (read.moves.isNotEmpty()) {
        val events = onRecovery(snap, read)
        // A legal bridge that explains the conflicts is HISTORY and always preferred; the resync
        // vote counts only while recovery keeps producing nothing (specs/37-02's auto arm).
        if (events.any { it is TrackerEvent.MoveCommitted || it is TrackerEvent.SequenceCommitted }) return events
        return events + maybeAutoResync(snap, cnn.confThr)
    }
    val events = onStableMismatch(cnn, snap.obs, snap, read.conflicts)
    recoveryConfirmer.reset()
    return events + maybeAutoResync(snap, cnn.confThr)
}

private fun EngineState.onRecovery(
    snap: CnnSnapshot,
    read: CnnRead,
): List<TrackerEvent> {
    val key = read.moves.joinToString(" ")
    // An undo moves the app, not the board, so the next glance derives the same bridge again
    // (2026-08-02, three presses, three re-commits). The hold is the only memory of that rejection.
    if (recoveryHeld()) {
        recoveryConfirmer.reset()
        note = "$NOTE_TAKEN_BACK_PREFIX ($key) $NOTE_TAKEN_BACK_WAY_OUT"
        return emptyList()
    }
    if (!recoveryVoteConfirmed(snap, key)) return emptyList()
    val moves = board.resolveSequence(read.moves)
    return when {
        moves == null -> emptyList()
        alarm != null && !resolvesAlarmConflicts(snap.obs, moves) -> {
            // A legal-looking sequence that leaves a conflict square unexplained is a fabrication.
            note = "ILLEGAL MOVE? CNN recovery would not resolve conflicts — withholding"
            recoveryConfirmer.reset()
            emptyList()
        }
        else -> commitRecovery(snap, moves, read.agreement)
    }
}

/** Every latched conflict square must read as the sequence PREDICTS it. */
private fun EngineState.resolvesAlarmConflicts(
    obs: CnnObservation,
    moves: List<Move>,
): Boolean {
    val latched = alarm ?: return true
    val after = board.copy()
    for (move in moves) after.push(move)
    val occupancy = obs.occupancyOnly()
    return latched.conflicts.all {
        !occupancy.confident(it, config.cnnConfThr) ||
            occupancy.occupied(it) == (after.labelAt(it) != "empty")
    }
}

private fun EngineState.commitRecovery(
    snap: CnnSnapshot,
    moves: List<Move>,
    agreement: Double,
): List<TrackerEvent> {
    val ucis = moves.map { uciOf(it) }
    val sans = pushRecovery(moves)
    lastMove = ucis.last()
    lastCommitSize = moves.size
    queueSessionCapture(sans.last())
    val anchor = recoveryAnchor(snap)
    if (anchor == null) {
        refGray = null
        refBgr = null
        refFen = null
        // Beide, nicht nur das Grau: sonst mittelt das Farbbild weiter ueber Frames der Stellung
        // VOR der Bruecke, und `setRef` baut aus diesem ungleichen Paar `refBgr` samt Gamut.
        grayBuf.clear()
        bgrBuf.clear()
    } else {
        setRefComposite(anchor.cur, anchor.curBgr, visibleSquares(snap), fromCommit = true)
    }
    // Recovery means we WERE behind: a reply played during the recovery window is already visible
    // against this (old) reference, so grant exactly one motion window — otherwise the recency
    // gate holds that reply hostage until the next recovery cycle. WAITING, not MOVE: `stableMeans`
    // detects only outside MOVE and `stableBranch` holds MOVE until the next motion frame, so the
    // granted window used to expire unused — nothing ran before the next hand set the flag anyway.
    motionSinceRef = true
    lastMotionTs = nowS
    state = STATE_WAITING
    restSettled = false
    // Not cleared here either: a recovery reaching this point is at a position the hold does not
    // cover, so the FEN key already says so. Clearing was what let a second bridge free the first.
    recoveredLast = true
    priorLast = false
    cnnStatus = CNN_STATUS_OK
    cnnConflicts = emptyList()
    // Same reason as in `finishCommit`, for both: the streak and the per-square anomaly timers
    // belong to the position and the reference the bridge just left.
    clearDesyncStreak()
    anomalySince = 0L
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

/**
 * Push the sequence onto the board and the history, ONE decision row per move: a single row for the
 * whole bridge left three of four moves nowhere in the log, with a `fenBefore` four plies older than
 * its `fenAfter` (2026-08-02). A multi-move bridge stamps every row `i/N` so the rows group back.
 */
private fun EngineState.pushRecovery(moves: List<Move>): List<String> {
    val sans = ArrayList<String>(moves.size)
    val key = if (moves.size == 1) null else moves.joinToString(" ") { uciOf(it) }
    for ((i, move) in moves.withIndex()) {
        val fenBefore = board.fen()
        val san = board.san(move)
        sans.add(san)
        board.push(move)
        // Appended per move, not in one `addAll` at the end: `recordDecision` reads `history.size`
        // as the row's ply, so the rows number themselves only if the history grows with them.
        history.add(san)
        val stamp = if (key == null) "" else " [move ${i + 1}/${moves.size} of recovery $key]"
        recordDecision(move, san, fenBefore, DECIDER_CNN_RECOVERY, priorUsed = false, reasonSuffix = stamp)
    }
    return sans
}

/**
 * The two clean agreeing glances a bridge demands; `false` while the vote is open. Neither observer
 * nor stuck arm is motion-gated, so the first branch is the ONLY thing keeping a mid-move glance out
 * of a bridge; the vote floor exists because `confirmFrames` is 1 with `cnnOn` (specs/39 phase 02).
 */
private fun EngineState.recoveryVoteConfirmed(
    snap: CnnSnapshot,
    key: String,
): Boolean {
    // Two arms, deliberately summed: the model's own occluded head (blind on 13-class models, and
    // filtered to hand-shaped, motion-plausible flags — the raw head refused every vote of session
    // 20260814-142947) and the grid-groove read of the same frame, hand-shaped clusters only (a
    // lone standing flag is a leaning piece and would refuse every vote for minutes).
    val occludedSquares =
        modelHandSquares(snap).countOneBits() +
            gridHandSquares(snap).countOneBits()
    return when {
        occludedSquares > RECOVERY_OCCLUDED_LIMIT -> {
            recoveryConfirmer.reset()
            note = "CNN recovery: $occludedSquares square(s) read occluded — waiting for a clean board"
            false
        }
        snap.seq == lastRecoveryVoteSeq -> false
        else -> {
            lastRecoveryVoteSeq = snap.seq
            val confirmed = recoveryConfirmer.feed(key)
            if (!confirmed) note = "CNN recovery checks $key… (${recoveryConfirmer.count}/$recoveryVotes)"
            confirmed
        }
    }
}

/**
 * Squares the observer may read as occluded before a recovery vote is refused: none. A finger that
 * covers part of one square is exactly how a misread next to it becomes a fabricated bridge (the
 * win-20260807 video's `Na3/Bxa3/Bf8`).
 */
private const val RECOVERY_OCCLUDED_LIMIT = 0

/** entry.md invariant 5 — `lastCur` is the fallback ONLY when the snapshot carries no usable warp. */
private fun EngineState.recoveryAnchor(snap: CnnSnapshot): CommitAnchor? =
    snap.anchorAtDetSize(detSize) ?: lastCur?.let { CommitAnchor(it, lastCurBgr) }

/** The snapshot's warp pair, or `null` unless it is at [detSize] — a mis-sized reference corrupts every later diff. */
internal fun CnnSnapshot.anchorAtDetSize(detSize: Int): CommitAnchor? {
    val warp = gray ?: return null
    val sized = warp.width == detSize && warp.height == detSize && (warped?.width ?: detSize) == detSize
    return if (sized) CommitAnchor(warp, warped) else null
}

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
