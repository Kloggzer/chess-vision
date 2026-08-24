package com.chesslab.engine

import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import kotlin.math.abs

/**
 * Maximum age of a CNN snapshot that may still arbitrate an occlusion (`_OBS_MAX_AGE_S`). Older
 * than this and the observation says nothing about THIS frame, so the filter falls back to the pure
 * ">2 changed squares = hand" heuristic.
 */
internal const val OBS_MAX_AGE_S: Double = 3.0

/** `p > 0.5` — the observer's `occluded` class dominates. Shared with the recovery clean gate. */
internal const val P_OCCLUDED_THR: Double = 0.5

/** Fresh per-square hand reads surfaced for hosts that must prove a frame is safe to persist. */
internal fun EngineState.freshCnnOccludedSquares(): Set<String> {
    val snap = freshSnapshot() ?: return emptySet()
    if (snap.fen != board.fen()) return emptySet()
    val hand = modelHandSquares(snap)
    return buildSet { hand.forEachSquare { add(Squares.ALL[it]) } }
}

/** `len(squares) > 2` — the no-CNN hand heuristic. */
private const val HAND_HEURISTIC_LIMIT: Int = 2

/** `tsMs` is milliseconds at the seam; the engine's clock ([EngineState.nowS]) is seconds. */
private const val MS_PER_S: Double = 1000.0

/**
 * Step 2's occlusion taint machinery.
 *
 * **entry.md invariant 2, the half that ZEROES z.** An occluder — a hand, a sleeve, an arm —
 * carries no move information: it must neither serve as a move endpoint nor penalise other moves
 * as a "hot untouched" square. The shadow veto (`Vetoes.kt`) does the exact opposite and only
 * removes a square from `changed`; swapping the two is silent and fatal.
 *
 * **entry.md invariant 4:** latched squares still COUNT toward `maxChanged` even though their z is
 * zero.
 *
 * Runs straight after `computeEvidence`, on the same [EngineState.lastZ], and BEFORE the
 * `changed = {s : z[s] >= zThr}` set is derived — that is the whole point of zeroing z here.
 */
internal fun EngineState.applyTaints() {
    shadowBlocked.clear()
    if (motionOccluded != 0L) {
        cnnOcclusionFilter(motionOccluded).forEachSquare { i ->
            lastZ[i] = 0.0
            tainted = tainted.with(i)
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
 * Python `_cnn_occlusion_filter` — which baseline-absdiff squares are occlusion (taint) and which
 * are a real move (pass through).
 *
 * With no usable observation the answer is the ">2 = hand" heuristic. With a FRESH one:
 * - the CNN is not confident there -> occlusion -> taint;
 * - it is confident and AGREES with the FEN -> nothing moved, so the delta is noise -> taint;
 * - it is confident and DISAGREES with the FEN -> that is exactly what a real move looks like ->
 *   **do not taint**. Tainting it would zero the evidence of the move we are trying to detect.
 *
 * The threshold is [com.chesslab.engine.api.TrackerConfig.cnnConfThr]: Python reads
 * `getattr(self.recovery, 'conf_thr', 0.9)`, but `CnnRecovery` is always constructed with
 * `conf_thr=self.cnn_conf_thr`, so the `0.9` fallback is dead code.
 */
internal fun EngineState.cnnOcclusionFilter(squares: Long): Long {
    val snap = freshSnapshot()
    // `self.recovery is None` -> the observation model was never built or failed to build.
    if (snap == null || !cnnRun || cnnFailed) {
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
 * The observation's occupancy of square [i] matches the game state's — the one predicate the
 * occlusion filter and the count discount share, extracted so the two cannot drift apart.
 * Occupancy only, never identity: a knight read as a pawn still agrees here, deliberately.
 */
private fun EngineState.occupancyAgreesWithBoard(
    i: Int,
    obs: CnnObservation,
): Boolean = (board.pieceCharAt(Squares.ALL[i]) != null) == obs.occupied(Squares.ALL[i])

/**
 * True while ANYTHING reads as a hand: an engine-side occlusion latch, this frame's occlusion
 * veto set, or an occluded-reading square in a fresh observation. The `cleanCommitsOnly`
 * experiment's one predicate — deliberately the union of every hand signal the engine has,
 * because the experiment's question is "what does strictness cost", not "which signal is best".
 */
internal fun EngineState.handInFrame(): Boolean {
    if (tainted != 0L || occludedVetoed != 0L) return true
    val snap = freshSnapshot() ?: return false
    // The grid arm is the model-free half of the snapshot signal: the model head is identically
    // silent under every 13-class model (CLAUDE.md pitfall), the groove read is not.
    return modelHandSquares(snap) != 0L || gridHandSquares(snap) != 0L
}

/**
 * The grid-groove map, but only when it is shaped like a HAND: at least one PAIR of orthogonally
 * ADJACENT flagged squares. Purely spatial and per observation, deliberately — the tracker gets
 * no temporal extension (the user's call of 2026-08-10; the labeling deadzone is the exporter's
 * business, not this gate's).
 *
 * A DISTANCE rule is measured and rejected too (2026-08-12): let the vote through when the hand
 * keeps 3 cells of clearance from the candidate's own squares, since the map already says where the
 * hand is. On rec-20260808-003957 that scores 38 found / 29 missed / 1 invented against this gate's
 * 65 / 2 / 2, and the one invented ply is `g4` at frame 5421 — this sensor's founding incident, at
 * its own frame, with the rest of the game lost behind the desync it causes. It also buys nothing:
 * over the 38 plies it keeps, the commit frames are identical to this gate's. The gate is board-wide
 * because a hand two squares from a move is still a hand over the evidence for it.
 *
 * Both rejected alternatives are measured, on opposite videos. Counting ANY flag: one square
 * (c8, a piece leaning over its own grooves) reads flagged on 73 % of VID_20260802_222741's
 * frames and blanked that whole replay to ZERO plies. A plain count threshold of 3: the LEAVING
 * hand of 003957's ply-39 incident trails off through 2-flag frames — h3+h2, always neighbours —
 * and the fabricated `g4` confirmed through exactly that tail (67/67 fell back to 39). Every
 * measured hand frame carries an adjacent pair; a leaning piece plus scattered noise never does.
 */
internal fun EngineState.gridHandSquares(snap: CnnSnapshot): Long {
    if (!config.gridHandGate) return 0L
    val squares = snap.gridOccluded
    var paired = false
    squares.forEachSquare { if ((SQ_NEIGHBOURS[it] and squares) != 0L) paired = true }
    return if (paired) squares else 0L
}

/**
 * The MODEL's occluded head, filtered to what a hand can physically be (2026-08-14).
 *
 * `real14-80` over-predicts `occluded`: on a quiet, clean board it read the whole queenside flank
 * as covered (session 20260814-142947), and every raw consumer of the head — the resting-hand
 * veto, [handInFrame], the recovery clean gate — treated each flag as a hand, so one phantom
 * square starved recovery indefinitely (`RECOVERY_OCCLUDED_LIMIT` is 0 by design). The grid arm
 * already carries a measured plausibility rule ([gridHandSquares]); this is the head's
 * counterpart, built on two physical facts:
 * - a hand covers neighbours: flags with no orthogonally adjacent pair anywhere are misreads —
 *   the same adjacency argument the grid rule is measured on;
 * - a hand cannot APPEAR without motion ([releaseLatches] states the converse — it cannot vanish
 *   without it). An occluded read describes a frame at most [OBS_MAX_AGE_S] old, and the hand that
 *   arrived on that frame moved to get there, so genuine flags come with motion no staler than the
 *   observation itself. The exception is a hand at REST beyond that window, and that is exactly
 *   what the grid arm's groove read vouches for (003957's founding incident) — so quiet-board
 *   flags count only when the grid corroborates them.
 *
 * `modelHandGate = false` restores the raw head, for A/B replays only.
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
 * Where the hand is, if a fresh observation can say so — the experiment's precondition.
 *
 * `handTolerantCells` lets detection continue through motion, and it may only do that when the
 * motion can be LOCATED. A stale or absent snapshot, or flags that are not hand-shaped, means the
 * engine does not know what is moving, and then the old rule stands.
 */
internal fun EngineState.locatedHand(): Long {
    if (config.handTolerantCells <= 0) return 0L
    val snap = freshSnapshot() ?: return 0L
    return gridHandSquares(snap)
}

/**
 * Is the located hand within `handTolerantCells` of [squares], in king-move distance?
 *
 * An empty hand map is not near anything: the caller has already decided what an unlocatable hand
 * means, and it is never "carry on".
 */
internal fun EngineState.handNear(
    hand: Long,
    squares: Long,
): Boolean {
    val clear = config.handTolerantCells
    if (hand == 0L || squares == 0L || clear <= 0) return false
    var near = false
    squares.forEachSquare { s ->
        hand.forEachSquare { h ->
            if (maxOf(abs(s % Squares.N - h % Squares.N), abs(s / Squares.N - h / Squares.N)) < clear) near = true
        }
    }
    return near
}

/**
 * The subset of [candidates] a FRESH, position-matched, CONFIDENT snapshot confirms UNCHANGED
 * against the reference — evidence the count gate may stop counting.
 *
 * The motivating frame (Qxe2, rec-20260808-003957 @6800): one true move plus a crown-overhang
 * bleed cloud read as 8 changed squares while the observer read d1/e1/b2/d2 as `empty 1.000` —
 * the gate counted evidence the CNN had already contradicted. Discounting is COUNTING only: the
 * squares stay in `changed`, their z stays for scoring, and every commit gate and the verify
 * ladder still stand behind whatever candidate the unlocked path produces.
 *
 * Three deliberate hardenings over [cnnOcclusionFilter]'s freshness:
 * - `snap.fen == board.fen()` (the `cnnDesync` pattern): a snapshot of a DIFFERENT position must
 *   not vouch for this one.
 * - `pOccluded <= P_OCCLUDED_THR`: a square can read confident AND occluded; without this a
 *   resting hand over empty squares would unlock the gate — invariant 4 stays load-bearing.
 * - `cnnOn`, not merely `cnnRun`: `cnnVerify = false` means the operator turned the CNN's say off.
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
 * Resting-hand veto (user-reported 2026-07-09).
 *
 * The baseline occlusion detector only runs OUTSIDE the stable states (the state gate in the frame
 * loop) and skin sits inside the wood gamut, so a motionless hand surfaced as plain "change". The
 * free-running observer sees it as the trained `occluded` class: taint those squares with the SAME
 * latch, so the hand can never be baked into the reference. Through [modelHandSquares], because a
 * hand that RESTS long enough to need this veto arrived with motion and stands in the groove read.
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
 * The latch release rule — transcribed literally, do not simplify.
 *
 * An occluder cannot vanish WITHOUT motion: a hand only leaves the board by moving. A tainted
 * square is therefore released only when its hold expired AND either motion occurred since the
 * taint was last refreshed, or its evidence returned to baseline (whatever occluded it is gone, or
 * the taint was false — the escape hatch that stops a misclassification from latching a quiet board
 * forever). Until it is released the square carries NO evidence: **z is zeroed on EVERY frame**,
 * not only at taint time. Previously it was only zeroed when the taint was set, and a still hand
 * outlived the 0.4 s timer and surfaced as "change".
 */
private fun EngineState.releaseLatches() {
    val hold = config.occluderHoldS
    tainted.forEachSquare { i ->
        val exp = taintExpiry[i]
        val motionSinceTaint = lastMotionTs >= exp - hold
        val backToBaseline = lastZ[i] < config.zThr
        if (nowS > exp && (motionSinceTaint || backToBaseline)) {
            tainted = tainted.without(bit(i))
        } else {
            lastZ[i] = 0.0
        }
    }
}

/** The cached observation, or `null` when there is none or it is older than [OBS_MAX_AGE_S]. */
internal fun EngineState.freshSnapshot() = cnnSnap?.takeIf { nowS - it.tsMs / MS_PER_S <= OBS_MAX_AGE_S }

/** `{sq for sq, exp in expiry.items() if now < exp}` — an unset slot is 0.0 and never live. */
internal fun EngineState.liveExpiry(expiry: DoubleArray): Long {
    var live = 0L
    for (i in 0 until Squares.COUNT) {
        if (nowS < expiry[i]) live = live.with(i)
    }
    return live
}
