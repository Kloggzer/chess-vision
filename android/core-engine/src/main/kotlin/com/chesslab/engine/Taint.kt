package com.chesslab.engine

/**
 * Maximum age of a CNN snapshot that may still arbitrate an occlusion (`_OBS_MAX_AGE_S`,
 * `tracker.py:58`). Older than this and the observation says nothing about THIS frame, so the
 * filter falls back to the pure ">2 changed squares = hand" heuristic.
 */
internal const val OBS_MAX_AGE_S: Double = 3.0

/** `p > 0.5` — the observer's `occluded` class dominates (`tracker.py:2873`). */
private const val P_OCCLUDED_THR: Double = 0.5

/** `len(squares) > 2` — the no-CNN hand heuristic (`tracker.py:1337`). */
private const val HAND_HEURISTIC_LIMIT: Int = 2

/** `tsMs` is milliseconds at the seam; the engine's clock ([EngineState.nowS]) is seconds. */
private const val MS_PER_S: Double = 1000.0

/**
 * Step 2's occlusion taint machinery (`_try_detect`, `tracker.py:2853-2900`).
 *
 * **entry.md invariant 2, the half that ZEROES z.** An occluder — a hand, a sleeve, an arm —
 * carries no move information: it must neither serve as a move endpoint nor penalise other moves
 * as a "hot untouched" square. The shadow veto (`Vetoes.kt`) does the exact opposite and only
 * removes a square from `changed`; swapping the two is silent and fatal.
 *
 * **entry.md invariant 4:** latched squares still COUNT toward `maxChanged` even though their z is
 * zero — 03c reads `blockedN = tainted.size`, which is what [EngineState.tainted] holds when this
 * returns.
 *
 * Called by 03d straight after `computeEvidence`, on the same mutable `z` map, and BEFORE the
 * `changed = {s : z[s] >= zThr}` set is derived — that is the whole point of zeroing z here.
 */
internal fun EngineState.applyTaints(z: MutableMap<String, Double>) {
    shadowBlocked.clear()
    // Baseline-absdiff occlusion with CNN arbitration (`:2857-2861`).
    if (motionOccludedSquares.isNotEmpty()) {
        for (square in cnnOcclusionFilter(motionOccludedSquares, board)) {
            z[square] = 0.0
            tainted[square] = nowS + config.motionHoldS
        }
    }
    restingHandVeto(z)
    releaseLatches(z)
    // Display (`:2894-2895`): latched squares ARE occluded squares. Reporting only the baseline
    // detector's set made a latched still hand invisible — or worse, "change" — in the UI.
    occludedVetoed = (motionOccludedSquares + tainted.keys).sorted()
    motionOccludedSquares = mutableSetOf()
    pruneExpiry(occlusionExpiry)
    pruneExpiry(occlCoreExpiry)
}

/**
 * Python `_cnn_occlusion_filter` (`tracker.py:1328-1351`) — which baseline-absdiff squares are
 * occlusion (taint) and which are a real move (pass through).
 *
 * With no usable observation the answer is the ">2 = hand" heuristic. With a FRESH one:
 * - the CNN is not confident there -> occlusion -> taint;
 * - it is confident and AGREES with the FEN -> nothing moved, so the delta is noise -> taint;
 * - it is confident and DISAGREES with the FEN -> that is exactly what a real move looks like ->
 *   **do not taint**. Tainting it would zero the evidence of the move we are trying to detect.
 *
 * The threshold is [com.chesslab.engine.api.TrackerConfig.cnnConfThr]: Python reads
 * `getattr(self.recovery, 'conf_thr', 0.9)`, but `CnnRecovery` is always constructed with
 * `conf_thr=self.cnn_conf_thr` (`tracker.py:1856`), so the `0.9` fallback is dead code
 * (STATUS: resolved during authoring).
 */
internal fun EngineState.cnnOcclusionFilter(
    squares: Set<String>,
    board: Game,
): Set<String> {
    val snap = freshSnapshot()
    // `self.recovery is None` -> the observation model was never built or failed to build.
    if (snap == null || !cnnRun || cnnFailed) {
        return if (squares.size > HAND_HEURISTIC_LIMIT) squares else emptySet()
    }
    val obs = snap.obs
    val thr = config.cnnConfThr
    val taint = LinkedHashSet<String>()
    for (square in squares) {
        if (!obs.confident(square, thr)) {
            taint.add(square)
        } else if ((board.pieceCharAt(square) != null) == obs.occupied(square)) {
            taint.add(square)
        }
    }
    return taint
}

/**
 * Resting-hand veto (`tracker.py:2862-2875`, user-reported 2026-07-09).
 *
 * The baseline occlusion detector only runs OUTSIDE the stable states (the state gate in the frame
 * loop) and skin sits inside the wood gamut, so a motionless hand surfaced as plain "change". The
 * free-running observer sees it as the trained `occluded` class: taint those squares with the SAME
 * latch, so the hand can never be baked into the reference.
 */
private fun EngineState.restingHandVeto(z: MutableMap<String, Double>) {
    val snap = freshSnapshot() ?: return
    val obs = snap.obs
    val expiry = nowS + config.motionHoldS
    for (square in Squares.ALL) {
        if (obs.pOccluded(square) > P_OCCLUDED_THR) {
            z[square] = 0.0
            tainted[square] = expiry
        }
    }
}

/**
 * The latch release rule (`tracker.py:2884-2891`) — transcribed literally, do not simplify.
 *
 * An occluder cannot vanish WITHOUT motion: a hand only leaves the board by moving. A tainted
 * square is therefore released only when its hold expired AND either motion occurred since the
 * taint was last refreshed, or its evidence returned to baseline (whatever occluded it is gone, or
 * the taint was false — the escape hatch that stops a misclassification from latching a quiet board
 * forever). Until it is released the square carries NO evidence: **z is zeroed on EVERY frame**,
 * not only at taint time. Previously it was only zeroed when the taint was set, and a still hand
 * outlived the 0.4 s timer and surfaced as "change".
 */
private fun EngineState.releaseLatches(z: MutableMap<String, Double>) {
    val hold = config.motionHoldS
    // A copy of the key set: the loop deletes from the map it iterates.
    for (square in tainted.keys.toList()) {
        val exp = tainted.getValue(square)
        val motionSinceTaint = lastMotionTs >= exp - hold
        val backToBaseline = (z[square] ?: 0.0) < config.zThr
        if (nowS > exp && (motionSinceTaint || backToBaseline)) {
            tainted.remove(square)
        } else {
            z[square] = 0.0
        }
    }
}

/** The cached observation, or `null` when there is none or it is older than [OBS_MAX_AGE_S]. */
private fun EngineState.freshSnapshot() = cnnSnap?.takeIf { nowS - it.tsMs / MS_PER_S <= OBS_MAX_AGE_S }

/** `{sq: exp for sq, exp in expiry.items() if now < exp}` (`tracker.py:2897-2900`). */
private fun EngineState.pruneExpiry(expiry: MutableMap<String, Double>) {
    val iterator = expiry.entries.iterator()
    while (iterator.hasNext()) {
        if (nowS >= iterator.next().value) iterator.remove()
    }
}
