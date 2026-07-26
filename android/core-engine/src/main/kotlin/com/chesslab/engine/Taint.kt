package com.chesslab.engine

import com.chesslab.engine.api.BgrImage

/**
 * Maximum age of a CNN snapshot that may still arbitrate an occlusion (`_OBS_MAX_AGE_S`). Older
 * than this and the observation says nothing about THIS frame, so the filter falls back to the pure
 * ">2 changed squares = hand" heuristic.
 */
internal const val OBS_MAX_AGE_S: Double = 3.0

/** `p > 0.5` — the observer's `occluded` class dominates. */
private const val P_OCCLUDED_THR: Double = 0.5

/** `len(squares) > 2` — the no-CNN hand heuristic. */
private const val HAND_HEURISTIC_LIMIT: Int = 2

/** `tsMs` is milliseconds at the seam; the engine's clock ([EngineState.nowS]) is seconds. */
private const val MS_PER_S: Double = 1000.0

/** Interleaved BGR — three bytes per pixel. */
private const val BGR_CHANNELS = 3

/**
 * [EngineState.handScratch]'s working memory — the Lab and HSV planes [handOccluders] converts
 * the hot boxes into. Per instance, never file scope: two engines must not alias each other.
 */
internal class HandVetoScratch {
    var lab = ByteArray(0)
    var hsv = ByteArray(0)
}

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
            taintExpiry[i] = nowS + config.motionHoldS
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
 * The opaque-occlusion veto on the DETECTION frame — a resting hand.
 *
 * `occlusionColorSquares` is a nearest-neighbour Mahalanobis test against the reference board's
 * own colour gamut: a hand matches no square, while a piece arriving on a new square matches
 * whichever square already carries a similar piece. It was competent all along and simply never
 * handed the squares that matter, because its only caller ([chromaOutliers], inside
 * `baselineOcclusionAndShadow`) is gated twice out of reach — that function runs only in the
 * MOTION states, so a hand that stops moving is never examined, and its candidate gate is an
 * absolute `motionPxThr * 4` = 80 grey levels that a resting hand does not reach. Measured on a
 * real game: a hand on f1 peaked at 62.0 while the move scorer rated the same pixels z = 15.7.
 *
 * The consequence was a phantom king move fitted to a motionless hand, whose commit then baked
 * the hand into the reference for 96 detection frames.
 *
 * Unlike [chromaOutliers] this one passes `extendUp = config.overhang`, matching the evidence
 * boxes the `hot` set was derived from, and dilates by one orthogonal neighbour exactly as
 * `baselineOcclusionAndShadow` does.
 *
 * @return true when anything was tainted, i.e. the caller must re-derive `hot` from [lastZ].
 */
internal fun EngineState.handOccluders(
    curBgr: BgrImage?,
    hot: Long,
): Boolean {
    val gamut = refGamut
    if (gamut == null || curBgr == null) return false
    val outliers =
        if (hot == 0L || config.occlusionColorThr <= 0.0) 0L else scanForOccluders(curBgr, gamut, hot)
    if (outliers != 0L) {
        val expiry = nowS + config.motionHoldS
        // Dilated by one orthogonal neighbour, exactly as `baselineOcclusionAndShadow` does — a
        // hand never covers a single cell cleanly.
        dilate(outliers).forEachSquare { i ->
            lastZ[i] = 0.0
            tainted = tainted.with(i)
            taintExpiry[i] = expiry
        }
    }
    return outliers != 0L
}

/**
 * The Lab/HSV conversion of the hot boxes plus the nearest-neighbour test.
 *
 * Unlike `baselineOcclusionAndShadow`'s call this one passes `extendUp = config.overhang`,
 * matching the evidence boxes the `hot` set was derived from.
 */
private fun EngineState.scanForOccluders(
    bgr: BgrImage,
    gamut: ColorGamut,
    hot: Long,
): Long {
    val geom = PlaneGeometry(bgr.width, bgr.height, detSize, whitePov, extendUp = config.overhang)
    val need = bgr.width * bgr.height * BGR_CHANNELS
    if (handScratch.lab.size != need) handScratch.lab = ByteArray(need)
    if (handScratch.hsv.size != need) handScratch.hsv = ByteArray(need)
    hot.forEachSquare { i ->
        geom.region(i, config.overhang)?.let { box ->
            bgrToLabBox(bgr.data, bgr.width, box, handScratch.lab)
            bgrToHsvBox(bgr.data, bgr.width, box, handScratch.hsv)
        }
    }
    return occlusionColorSquares(
        ColorPlanes(handScratch.lab, handScratch.hsv),
        geom,
        gamut,
        hot,
        config.occlusionColorThr,
    )
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
        if (!obs.confident(name, thr) || (board.pieceCharAt(name) != null) == obs.occupied(name)) {
            taint = taint.with(i)
        }
    }
    return taint
}

/**
 * Resting-hand veto (user-reported 2026-07-09).
 *
 * The baseline occlusion detector only runs OUTSIDE the stable states (the state gate in the frame
 * loop) and skin sits inside the wood gamut, so a motionless hand surfaced as plain "change". The
 * free-running observer sees it as the trained `occluded` class: taint those squares with the SAME
 * latch, so the hand can never be baked into the reference.
 */
private fun EngineState.restingHandVeto() {
    val obs = freshSnapshot()?.obs ?: return
    val expiry = nowS + config.motionHoldS
    for (i in 0 until Squares.COUNT) {
        if (obs.pOccluded(Squares.ALL[i]) > P_OCCLUDED_THR) {
            lastZ[i] = 0.0
            tainted = tainted.with(i)
            taintExpiry[i] = expiry
        }
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
    val hold = config.motionHoldS
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
private fun EngineState.freshSnapshot() = cnnSnap?.takeIf { nowS - it.tsMs / MS_PER_S <= OBS_MAX_AGE_S }

/** `{sq for sq, exp in expiry.items() if now < exp}` — an unset slot is 0.0 and never live. */
internal fun EngineState.liveExpiry(expiry: DoubleArray): Long {
    var live = 0L
    for (i in 0 until Squares.COUNT) {
        if (nowS < expiry[i]) live = live.with(i)
    }
    return live
}
