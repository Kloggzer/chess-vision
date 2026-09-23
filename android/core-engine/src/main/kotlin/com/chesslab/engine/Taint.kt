package com.chesslab.engine

import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.github.bhlangonijr.chesslib.move.Move

/** Older says nothing about THIS frame; the filter then falls back to ">2 changed squares = hand". */
internal const val OBS_MAX_AGE_S: Double = 3.0

internal fun EngineState.freshCnnOccludedSquares(): Set<String> {
    // Not position-scoped: a hand does not belong to a position.
    val snap = freshSnapshot() ?: return emptySet()
    val hand = modelHandSquares(snap)
    return buildSet { hand.forEachSquare { add(Squares.ALL[it]) } }
}

private const val HAND_HEURISTIC_LIMIT: Int = 2

private const val MS_PER_S: Double = 1000.0

/** **Invariant 2, the half that ZEROES z:** an occluder may neither be an endpoint nor penalise other moves.
 *  **Invariant 4:** latched squares still COUNT. Runs BEFORE `changed` is derived. */
internal fun EngineState.applyTaints() {
    shadowBlocked.clear()
    if (motionOccluded != 0L) {
        cnnOcclusionFilter(motionOccluded).forEachSquare { i ->
            lastZ[i] = 0.0
            tainted = tainted.with(i)
            keepaliveTainted = keepaliveTainted.with(i)
            taintExpiry[i] = nowS + config.occluderHoldS
            taintStart[i] = nowS
        }
    }
    restingHandVeto()
    releaseLatches()
    // Latched squares ARE occluded: reporting only the baseline set made a still hand invisible, or "change".
    occludedVetoed = motionOccluded or tainted
    motionOccluded = 0L
}

/** With a fresh read, unconfident or agreeing squares taint; a confident DISAGREEMENT is what a real move
 *  looks like — tainting it would zero its evidence. */
internal fun EngineState.cnnOcclusionFilter(squares: Long): Long {
    // Position-scoped: a read of the position before a commit cannot tell hand from move among THESE squares.
    val snap = freshSnapshot()?.takeIf { it.fen == board.fen() }
    if (snap == null || !cnnRun) {
        return if (squares.countOneBits() > HAND_HEURISTIC_LIMIT) squares else 0L
    }
    val obs = snap.obs
    val thr = config.cnnConfThr
    var taint = 0L
    squares.forEachSquare { i ->
        val name = Squares.ALL[i]
        val agrees = occupancyAgreesWithBoard(i, obs) && !identityDisagrees(i, obs)
        if (!obs.confident(name, thr) || agrees) {
            taint = taint.with(i)
        }
    }
    return taint
}

/** Liest das Modell SICHER eine andere Figur, ist das Feld kein Verdecker, sondern der Zug. */
private fun EngineState.identityDisagrees(
    i: Int,
    obs: CnnObservation,
): Boolean {
    val thr = config.taintIdentityThr
    if (thr <= 0.0) return false
    val name = Squares.ALL[i]
    val seen = obs.label(name) ?: return false
    // BEIDE in der Klassenform ("wR"): gegen `pieceCharAt` ('R') ging der Vergleich nie auf und nahm jedem
    // sicher gelesenen Feld den Verdeckungsschutz.
    val held = board.labelAt(name)
    return held != "empty" && obs.labelConfident(name, thr) && seen != held
}

/** Shared by the occlusion filter and the count discount, so the two cannot drift. Occupancy only. */
private fun EngineState.occupancyAgreesWithBoard(
    i: Int,
    obs: CnnObservation,
): Boolean = (board.pieceCharAt(Squares.ALL[i]) != null) == obs.occupied(Squares.ALL[i])

/** The union of every hand signal: `cleanCommitsOnly` asks what strictness costs, not which signal is best. */
internal fun EngineState.handInFrame(): Boolean {
    if (tainted != 0L || occludedVetoed != 0L) return true
    val snap = freshSnapshot() ?: return false
    // The grid arm is the model-free half: the model head is silent under every 13-class model.
    return modelHandSquares(snap) != 0L || gridHandSquares(snap) != 0L
}

/** Only when HAND-shaped: at least one orthogonally adjacent PAIR. Any flag blanked a replay on one leaning
 *  piece; a threshold of 3 let a leaving hand's 2-flag tail confirm 003957's `g4`. */
internal fun EngineState.gridHandSquares(snap: CnnSnapshot): Long {
    if (!config.gridHandGate) return 0L
    val squares = snap.gridOccluded
    var paired = false
    squares.forEachSquare { if ((SQ_NEIGHBOURS[it] and squares) != 0L) paired = true }
    return if (paired) squares else 0L
}

/** Filtered to what a hand can be: `real14-80` over-predicts `occluded`, and one phantom starved recovery. A
 *  hand covers neighbours and cannot APPEAR without motion, so quiet flags need grid corroboration.
 *  `modelHandArm` silences the arm, `modelHandShapeFilter` only removes the filter. */
internal fun EngineState.modelHandSquares(snap: CnnSnapshot): Long {
    if (!config.modelHandArm) return 0L
    var flagged = 0L
    for (i in 0 until Squares.COUNT) {
        if (snap.obs.pOccluded(Squares.ALL[i]) > config.pOccludedThr) flagged = flagged.with(i)
    }
    if (flagged == 0L || !config.modelHandShapeFilter) return flagged
    var paired = false
    flagged.forEachSquare { if ((SQ_NEIGHBOURS[it] and flagged) != 0L) paired = true }
    if (!paired) return 0L
    val quiet = nowS - lastMotionTs > OBS_MAX_AGE_S
    return if (quiet && gridHandSquares(snap) == 0L) 0L else flagged
}

/** What the count gate may stop COUNTING (a bleed cloud read `empty 1.000`). The fen must match, and
 *  `pOccluded` is bounded so a resting hand cannot unlock the gate (invariant 4). */
internal fun EngineState.cnnConfirmedUnchanged(candidates: Long): Long {
    val snap = (if (cnnOn) freshSnapshot() else null) ?: return 0L
    if (snap.fen != board.fen()) return 0L
    val obs = snap.obs
    val thr = config.cnnConfThr
    var confirmed = 0L
    candidates.forEachSquare { i ->
        val name = Squares.ALL[i]
        if (obs.confident(name, thr) && obs.pOccluded(name) <= config.pOccludedThr && occupancyAgreesWithBoard(i, obs)) {
            confirmed = confirmed.with(i)
        }
    }
    return confirmed
}

/** The baseline detector runs only OUTSIDE the stable states and skin sits inside the wood gamut, so a still
 *  hand surfaced as "change". Tainted with the SAME latch, it never bakes into the reference. */
private fun EngineState.restingHandVeto() {
    val snap = freshSnapshot() ?: return
    val expiry = nowS + config.occluderHoldS
    modelHandSquares(snap).forEachSquare { i ->
        lastZ[i] = 0.0
        tainted = tainted.with(i)
        taintExpiry[i] = expiry
        taintStart[i] = nowS
    }
}

/** Transcribed literally, do not simplify: an occluder cannot vanish WITHOUT motion, so release needs an
 *  expired hold AND motion since — or evidence back at baseline, else a misread latches forever. */
private fun EngineState.releaseLatches() {
    tainted.forEachSquare { i ->
        val exp = taintExpiry[i]
        // Gegen den GESPEICHERTEN Beginn: `exp - occluderHoldS` folgte dem Live-Regler.
        val motionSinceTaint = lastMotionTs >= taintStart[i]
        val backToBaseline = lastZ[i] < config.zThr
        if (nowS > exp && (motionSinceTaint || backToBaseline)) {
            tainted = tainted.without(bit(i))
            keepaliveTainted = keepaliveTainted.without(bit(i))
        } else {
            lastZ[i] = 0.0
        }
    }
}

internal fun EngineState.freshSnapshot() = cnnSnap?.takeIf { nowS - it.tsMs / MS_PER_S <= OBS_MAX_AGE_S }

/** An unset slot is 0.0 and therefore never live. */
internal fun EngineState.liveExpiry(expiry: DoubleArray): Long {
    var live = 0L
    for (i in 0 until Squares.COUNT) {
        if (nowS < expiry[i]) live = live.with(i)
    }
    return live
}

/** Per square, not hand-shaped: one covered square hides its own evidence just as well. */
internal fun EngineState.recordSight(snap: CnnSnapshot) {
    var confident = 0L
    var occupied = 0L
    val thr = config.cnnConfThr
    for (i in 0 until Squares.COUNT) {
        val square = Squares.ALL[i]
        if (snap.obs.confident(square, thr)) {
            confident = confident.with(i)
            if (snap.obs.occupied(square)) occupied = occupied.with(i)
        }
    }
    sights.addLast(SquareSight(snap.seq, visibleSquares(snap), confident, occupied, snap.fen))
    while (sights.size > SIGHT_DEPTH) sights.removeFirst()
}

/** The only squares a reference may take from this observation. */
internal fun EngineState.visibleSquares(snap: CnnSnapshot): Long {
    var covered = snap.gridOccluded
    for (i in 0 until Squares.COUNT) {
        if (snap.obs.pOccluded(Squares.ALL[i]) > config.sightCoverageMax) covered = covered.with(i)
    }
    return covered.inv()
}

/** Inside the motion hold, settle is replaced by evidence: the move's squares seen unoccluded and post-move
 *  in the last [TrackerConfig.earlyCommitObs] reads. A piece still in hand or a half-done castling fails. */
internal fun EngineState.sightSettled(
    boardSnap: Game,
    move: Move,
): Boolean = sightSettled(boardSnap, listOf(move))

internal fun EngineState.sightSettled(
    boardSnap: Game,
    moves: List<Move>,
): Boolean {
    val need = config.earlyCommitObs
    if (need <= 0) return true
    if (sights.size < need) return false
    var touched = 0L
    val after = boardSnap.copy()
    for (mv in moves) {
        touched = touched or moveTouchedMask(after, mv)
        after.push(mv)
    }
    var wanted = 0L
    touched.forEachSquare { if (after.pieceCharAt(it) != null) wanted = wanted.with(it) }
    // A snapshot landed after a commit or `setFen` describes the position we left.
    val reference = boardSnap.fen()
    return sights.toList().takeLast(need).all { sight ->
        (sight.fen == null || sight.fen == reference) &&
            (sight.visible and touched) == touched &&
            (sight.confident and touched) == touched &&
            (sight.occupied and touched) == wanted
    }
}
