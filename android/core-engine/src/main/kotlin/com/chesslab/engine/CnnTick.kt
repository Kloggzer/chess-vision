package com.chesslab.engine

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.clearAlarm
import com.github.bhlangonijr.chesslib.move.Move

private const val CNN_STATUS_OK = "ok"

/** [maybePatchAnomaly] refuses to heal into the reference while it stands. */
internal const val CNN_STATUS_MISMATCH = "mismatch"

internal const val VERIFY_STATE_RESYNCED = "resynced"

private const val PERCENT = 100.0

private class CnnRead(
    val moves: List<String>,
    val agreement: Double,
    val conflicts: List<String>,
    val matchOk: Boolean,
    val inconclusive: Boolean,
)

/** Every commit here anchors on the frame the CNN actually LOOKED AT — `lastCur` may already hold the
 *  opponent's next move (invariant 5). */
internal fun EngineState.cnnTick(
    cnn: CnnEvaluator?,
    snap: CnnSnapshot,
    afterRejectedVerify: Boolean = false,
): List<TrackerEvent> {
    // `evaluationDue` must be asked once: it reads the clock and the frame buffer, so a second call is a second answer.
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
        cnnReadsStale += 1
        recoveryConfirmer.reset()
        return emptyList()
    }
    // Reject obsolete work before searching continuations or consuming this position's evaluation slot.
    val read = identityRead(model, snap.obs)
    lastCnnTs = nowS
    lastEvalEpoch = motionEpoch
    cnnReadsTaken += 1
    cnnAgreement = read.agreement
    cnnBestMove = read.moves.takeIf { it.isNotEmpty() }?.joinToString(" ")
    // The terminal verdict already anchored on the averaged frame; a match must not re-anchor (invariant 5).
    return if (afterRejectedVerify && read.matchOk) {
        recoveryConfirmer.reset()
        emptyList()
    } else {
        applyRead(model, snap, read)
    }
}

/** `stuck` does NOT require a stable board — a stuck tracker never looks quiet — the periodic check does. An
 *  OPEN recovery vote needs no gate: it wants two looks at the SAME board. */
private fun EngineState.evaluationDue(): Boolean {
    // An open desync fills at observation rate: waiting buys no independence; `alarmDeferred` guards the hand.
    if (recoveryConfirmer.count > 0 || desyncObs in 1 until config.desyncObsN) return true
    val cooled = (nowS - lastCnnTs) >= config.cnnCooldownS
    val stable = grayBuf.size >= avgFrames && (state == STATE_WAITING || state == STATE_MOVE)
    val stuck = stuckReason != null && stuckCount >= settleFrames && cooled
    // Repeated refusal used to keep the CNN OUT — 70x `Kf1` without one read.
    val refused = config.refusedStreakForEval > 0 && refusedStreak >= config.refusedStreakForEval && cooled
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

/** Identity is the WEAKER axis (0.882 on occupied crops against ~99.99 % empty): one confident misread holds
 *  agreement below `minAgreement` forever, so a mismatch is re-checked with identity stripped. */
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
    // BOTH axes: identity sees only LABEL-confident squares, so an extra piece on an occupancy-confident square
    // passed as "unchanged" and cleared the latch.
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

/** The CNN confirms the board: pull the reference forward, commit NO move, release the latch — a matching
 *  board is the take-back the alarm was waiting for. */
private fun EngineState.onMatchOk(
    cnn: CnnEvaluator,
    snap: CnnSnapshot,
): List<TrackerEvent> {
    // Zero confident squares yields an empty conflict set and `match = true`: a hand would clear the alarm and
    // pull the reference onto the covered frame.
    if (Squares.ALL.count { snap.obs.confident(it, cnn.confThr) } < cnn.minConfidentBoard) {
        cnnStatus = CNN_STATUS_OK
        note = "CNN: too little of the board is legible to confirm it — holding"
        return emptyList()
    }
    cnnStatus = CNN_STATUS_OK
    cnnConflicts = emptyList()
    // The end of a disagreement: the reset lived only in `clearAlarm`, so interleaved mismatches still reached the
    // alarm and `desyncObs` never returned to zero, keeping `maybePatchAnomaly` off.
    clearDesyncStreak()
    val events = mutableListOf<TrackerEvent>()
    if (alarm != null) {
        events += clearAlarm(null)
        note = "board restored — alarm cleared"
    }
    recoveryConfirmer.reset()
    val anchor = recoveryAnchor(snap)
    if (stuckReason != null && anchor != null) {
        // `fromCommit = true`: partial occlusion is tolerated here, so the gamut is not rebuilt (invariant 6).
        setRefComposite(anchor.cur, anchor.curBgr, visibleSquares(snap), fromCommit = true)
        // Ein gegen die alte Referenz gestarteter Timer autorisierte sonst sofort einen Patch gegen die neue.
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
        // A legal bridge explaining the conflicts is HISTORY and always preferred; the resync vote counts only while
        // recovery produces nothing.
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
    // An undo moves the app, not the board: the next glance derives the same bridge again. The hold remembers.
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
        // Beide, nicht nur das Grau: sonst mittelt das Farbbild ueber Frames VOR der Bruecke, und `setRef` baut
        // aus dem ungleichen Paar `refBgr` samt Gamut.
        grayBuf.clear()
        bgrBuf.clear()
    } else {
        setRefComposite(anchor.cur, anchor.curBgr, visibleSquares(snap), fromCommit = true)
    }
    // We WERE behind: a reply played meanwhile is visible against this old reference, so grant one motion
    // window — WAITING, not MOVE: under MOVE the window expired unused.
    motionSinceRef = true
    lastMotionTs = nowS
    state = STATE_WAITING
    restSettled = false
    // Not cleared: this position is not covered by the hold, and clearing let a second bridge free the first.
    recoveredLast = true
    priorLast = false
    cnnStatus = CNN_STATUS_OK
    cnnConflicts = emptyList()
    // The streak and anomaly timers belong to the position and reference the bridge just left.
    clearDesyncStreak()
    anomalySince = 0L
    confirmer.reset()
    clearStuck()
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

/** ONE decision row per move: a single row for the bridge left three of four moves out of the log. Rows of
 *  a multi-move bridge are stamped `i/N`. */
private fun EngineState.pushRecovery(moves: List<Move>): List<String> {
    val sans = ArrayList<String>(moves.size)
    val key = if (moves.size == 1) null else moves.joinToString(" ") { uciOf(it) }
    for ((i, move) in moves.withIndex()) {
        val fenBefore = board.fen()
        val san = board.san(move)
        sans.add(san)
        board.push(move)
        // Per move: `recordDecision` reads `history.size` as the row's ply.
        history.add(san)
        val stamp = if (key == null) "" else " [move ${i + 1}/${moves.size} of recovery $key]"
        recordDecision(move, san, fenBefore, DECIDER_CNN_RECOVERY, priorUsed = false, reasonSuffix = stamp)
    }
    return sans
}

/** Neither observer nor stuck arm is motion-gated, so this vote is the ONLY thing keeping a mid-move glance
 *  out of a bridge; the floor exists because `confirmFrames` is 1 with `cnnOn`. */
private fun EngineState.recoveryVoteConfirmed(
    snap: CnnSnapshot,
    key: String,
): Boolean {
    // Two arms, summed: the model's occluded head (blind on 13-class models; filtered to hand-shaped, plausible
    // flags) and the grid read, hand-shaped clusters only — a lone flag is a leaning piece.
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

/** None: a finger over part of one square is how a misread beside it becomes a fabricated bridge. */
private const val RECOVERY_OCCLUDED_LIMIT = 0

/** entry.md invariant 5 — `lastCur` only when the snapshot carries no usable warp. */
private fun EngineState.recoveryAnchor(snap: CnnSnapshot): CommitAnchor? =
    snap.anchorAtDetSize(detSize) ?: lastCur?.let { CommitAnchor(it, lastCurBgr) }

/** A mis-sized reference corrupts every later diff. */
internal fun CnnSnapshot.anchorAtDetSize(detSize: Int): CommitAnchor? {
    val warp = gray ?: return null
    val sized = warp.width == detSize && warp.height == detSize && (warped?.width ?: detSize) == detSize
    return if (sized) CommitAnchor(warp, warped) else null
}

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
