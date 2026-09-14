package com.chesslab.engine

import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.github.bhlangonijr.chesslib.move.Move

/**
 * Maximum age of a CNN snapshot that may still arbitrate an occlusion; older says nothing about THIS
 * frame, so the filter falls back to the pure ">2 changed squares = hand" heuristic.
 */
internal const val OBS_MAX_AGE_S: Double = 3.0

/** The observer's `occluded` class dominates. Shared with the recovery clean gate. */
internal const val P_OCCLUDED_THR: Double = 0.5

/** Fresh per-square hand reads surfaced for hosts that must prove a frame is safe to persist. */
internal fun EngineState.freshCnnOccludedSquares(): Set<String> {
    val snap = freshSnapshot() ?: return emptySet()
    if (snap.fen != board.fen()) return emptySet()
    val hand = modelHandSquares(snap)
    return buildSet { hand.forEachSquare { add(Squares.ALL[it]) } }
}

/** The no-CNN hand heuristic. */
private const val HAND_HEURISTIC_LIMIT: Int = 2

/** `tsMs` is milliseconds at the seam; the engine's clock ([EngineState.nowS]) is seconds. */
private const val MS_PER_S: Double = 1000.0

/**
 * Step 2's occlusion taint machinery. **entry.md invariant 2, the half that ZEROES z:** an occluder
 * carries no move information, so it may neither be an endpoint nor penalise other moves — the shadow
 * veto does the opposite. **Invariant 4:** latched squares still COUNT. Runs BEFORE `changed` is derived.
 */
internal fun EngineState.applyTaints() {
    shadowBlocked.clear()
    if (motionOccluded != 0L) {
        cnnOcclusionFilter(motionOccluded).forEachSquare { i ->
            lastZ[i] = 0.0
            tainted = tainted.with(i)
            keepaliveTainted = keepaliveTainted.with(i)
            taintExpiry[i] = nowS + config.occluderHoldS
        }
    }
    restingHandVeto()
    releaseLatches()
    // Display: latched squares ARE occluded squares. Reporting only the baseline detector's set
    // made a latched still hand invisible — or worse, "change" — in the UI.
    occludedVetoed = motionOccluded or tainted
    motionOccluded = 0L
}

/**
 * Which baseline-absdiff squares are occlusion (taint) and which are a real move (pass through). With no
 * usable observation this is the ">2 = hand" heuristic; with a fresh one, unconfident or agreeing taints,
 * while a confident DISAGREEMENT is what a real move looks like — tainting it would zero its evidence.
 */
internal fun EngineState.cnnOcclusionFilter(squares: Long): Long {
    // Position-scoped like every other verdict off this cache: a read of the position we held before
    // a commit or a resync cannot say which of THESE squares is a hand and which is the move.
    val snap = freshSnapshot()?.takeIf { it.fen == board.fen() }
    // No observation model: it was never built, or building it failed.
    if (snap == null || !cnnRun) {
        return if (squares.countOneBits() > HAND_HEURISTIC_LIMIT) squares else 0L
    }
    val obs = snap.obs
    val thr = config.cnnConfThr
    var taint = 0L
    squares.forEachSquare { i ->
        val name = Squares.ALL[i]
        if (!obs.confident(name, thr) || occupancyAgreesWithBoard(i, obs)) {
            taint = taint.with(i)
        }
    }
    return taint
}

/**
 * The observation's occupancy of square [i] matches the game state's — the one predicate the occlusion
 * filter and the count discount share, so the two cannot drift apart. Occupancy only, never identity:
 * a knight read as a pawn still agrees here, deliberately.
 */
private fun EngineState.occupancyAgreesWithBoard(
    i: Int,
    obs: CnnObservation,
): Boolean = (board.pieceCharAt(Squares.ALL[i]) != null) == obs.occupied(Squares.ALL[i])

/**
 * True while ANYTHING reads as a hand: an occlusion latch, this frame's veto set, or an occluded-reading
 * square in a fresh observation. The `cleanCommitsOnly` experiment's one predicate, deliberately the
 * union of every hand signal — its question is "what does strictness cost", not "which signal is best".
 */
internal fun EngineState.handInFrame(): Boolean {
    if (tainted != 0L || occludedVetoed != 0L) return true
    val snap = freshSnapshot() ?: return false
    // The grid arm is the model-free half of the snapshot signal: the model head is identically
    // silent under every 13-class model (CLAUDE.md pitfall), the groove read is not.
    return modelHandSquares(snap) != 0L || gridHandSquares(snap) != 0L
}

/**
 * The grid-groove map, but only when it is shaped like a HAND: at least one PAIR of orthogonally adjacent
 * flags, spatial and per observation (user's call, 2026-08-10). Counting ANY flag blanked a whole replay
 * on one leaning piece (c8); a threshold of 3 let a leaving hand's 2-flag tail confirm 003957's `g4`.
 */
internal fun EngineState.gridHandSquares(snap: CnnSnapshot): Long {
    if (!config.gridHandGate) return 0L
    val squares = snap.gridOccluded
    var paired = false
    squares.forEachSquare { if ((SQ_NEIGHBOURS[it] and squares) != 0L) paired = true }
    return if (paired) squares else 0L
}

/**
 * The MODEL's occluded head, filtered to what a hand can physically be (2026-08-14): `real14-80`
 * over-predicts `occluded`, and one phantom square starved recovery indefinitely (20260814-142947). A hand
 * covers neighbours and cannot APPEAR without motion, so quiet flags count only if the grid corroborates.
 */
internal fun EngineState.modelHandSquares(snap: CnnSnapshot): Long {
    var flagged = 0L
    for (i in 0 until Squares.COUNT) {
        if (snap.obs.pOccluded(Squares.ALL[i]) > config.pOccludedThr) flagged = flagged.with(i)
    }
    if (flagged == 0L || !config.modelHandGate) return flagged
    var paired = false
    flagged.forEachSquare { if ((SQ_NEIGHBOURS[it] and flagged) != 0L) paired = true }
    if (!paired) return 0L
    val quiet = nowS - lastMotionTs > OBS_MAX_AGE_S
    return if (quiet && gridHandSquares(snap) == 0L) 0L else flagged
}

/**
 * The subset of [candidates] a FRESH, position-matched, CONFIDENT snapshot confirms UNCHANGED — what the
 * count gate may stop COUNTING (Qxe2 @6800: a bleed cloud read `empty 1.000` while the gate counted it).
 * The fen must match, and `pOccluded` is bounded so a resting hand cannot unlock the gate (invariant 4).
 */
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

/**
 * Resting-hand veto (user-reported 2026-07-09): the baseline detector runs only OUTSIDE the stable
 * states and skin sits inside the wood gamut, so a motionless hand surfaced as plain "change". Taint
 * those squares with the SAME latch, so the hand can never be baked into the reference.
 */
private fun EngineState.restingHandVeto() {
    val snap = freshSnapshot() ?: return
    val expiry = nowS + config.occluderHoldS
    modelHandSquares(snap).forEachSquare { i ->
        lastZ[i] = 0.0
        tainted = tainted.with(i)
        taintExpiry[i] = expiry
    }
}

/**
 * The latch release rule — transcribed literally, do not simplify: an occluder cannot vanish WITHOUT
 * motion, so a tainted square is released only once its hold expired AND motion occurred since, or its
 * evidence returned to baseline (else a misread latches a quiet board forever). Until then z is ZEROED.
 */
private fun EngineState.releaseLatches() {
    val hold = config.occluderHoldS
    tainted.forEachSquare { i ->
        val exp = taintExpiry[i]
        val motionSinceTaint = lastMotionTs >= exp - hold
        val backToBaseline = lastZ[i] < config.zThr
        if (nowS > exp && (motionSinceTaint || backToBaseline)) {
            tainted = tainted.without(bit(i))
            keepaliveTainted = keepaliveTainted.without(bit(i))
        } else {
            lastZ[i] = 0.0
        }
    }
}

/** The cached observation, or `null` when there is none or it is older than [OBS_MAX_AGE_S]. */
internal fun EngineState.freshSnapshot() = cnnSnap?.takeIf { nowS - it.tsMs / MS_PER_S <= OBS_MAX_AGE_S }

/** An unset slot is 0.0 and therefore never live. */
internal fun EngineState.liveExpiry(expiry: DoubleArray): Long {
    var live = 0L
    for (i in 0 until Squares.COUNT) {
        if (nowS < expiry[i]) live = live.with(i)
    }
    return live
}

/** Per square, not hand-shaped: a single covered square hides that square's evidence just as well. */
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

/** Squares neither hand arm flags in this observation — the only ones a reference may take from it. */
internal fun EngineState.visibleSquares(snap: CnnSnapshot): Long {
    var covered = snap.gridOccluded
    for (i in 0 until Squares.COUNT) {
        if (snap.obs.pOccluded(Squares.ALL[i]) > config.sightCoverageMax) covered = covered.with(i)
    }
    return covered.inv()
}

/**
 * Inside the motion hold the physical settle is replaced by evidence: the move's squares were seen
 * unoccluded in the last [TrackerConfig.earlyCommitObs] observations, every one of them already
 * showing the post-move occupancy. A piece still in the hand covers its target; a half-done castling
 * has the rook square under the hand; both fail here and wait for the hold.
 */
internal fun EngineState.sightSettled(
    boardSnap: Game,
    move: Move,
): Boolean = sightSettled(boardSnap, listOf(move))

/** The pair form: every square either move touches, against the position after both. */
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
    // The sight's own position decides whether it says anything here: a snapshot that landed after
    // a commit or a `setFen` describes the position we left, and it proved the adopted one's move.
    val reference = boardSnap.fen()
    return sights.toList().takeLast(need).all { sight ->
        (sight.fen == null || sight.fen == reference) &&
            (sight.visible and touched) == touched &&
            (sight.confident and touched) == touched &&
            (sight.occupied and touched) == wanted
    }
}
