package com.chesslab.engine

import com.chesslab.engine.api.CnnSnapshot

/** `_observe_snapshot`'s failure backoff, in seconds. */
private const val OBSERVER_BACKOFF_S = 1.0

/**
 * The free-running observer (Spec 11). The observation itself runs in `:app` — pixels and ONNX are
 * not this module's business — but its invariants are engine law, so they are stated and enforced
 * here:
 *
 * 1. Observe OFF the frame thread; inference is the expensive part and must not stall detection.
 * 2. The anchor warp rides along: warp at full `boardSize`, then resize to `detSize` with
 *    `INTER_AREA` when `detectScale < 1.0`. **entry.md invariant 1: `snap.gray` and `snap.warped`
 *    are at `detSize`, identical to `refGray`.** [anchorAtDetSize] REJECTS anything else instead of
 *    anchoring it — a reference at the wrong resolution corrupts every later diff silently.
 * 3. `snap.fen` is the game FEN at observation START — the discard-on-change guard.
 * 4. `snap.seq` is the seq of the OBSERVED frame; that pairing is what lets a consumer tell a
 *    fresh reading from one that predates its own decision.
 * 5. An observation FAILURE backs the next spawn off by a second ([observationFailed]) — with the
 *    default `observerIntervalS = 0.0` a persistent failure would otherwise retry at loop rate.
 *
 * Routing (`_cnn_worker`) belongs to phase 04a: a pending candidate has priority over the periodic
 * check and reaches the verify ladder even with a null snapshot (its CNN-unavailable fallback),
 * while a null snapshot with nothing pending is dropped.
 */
internal fun EngineState.observerDue(now: Double): Boolean =
    cnnRun && !cnnFailed && !cnnBusy && (now - observerStartedTs) >= config.observerIntervalS

/**
 * What the spawn path does. [EngineState.cnnBusy] serialises to EXACTLY ONE observation at a time —
 * that is the whole concurrency model; there is no queue and no second worker.
 */
internal fun EngineState.observationStarted(now: Double) {
    cnnBusy = true
    observerStartedTs = now
}

internal fun EngineState.observationFinished() {
    cnnBusy = false
}

internal fun EngineState.observationFailed(now: Double) {
    observerStartedTs = now + OBSERVER_BACKOFF_S
}

/** The snapshot's anchor pair, or `null` when it carries none or is not at [detSize] (see 2. above). */
internal fun CnnSnapshot.anchorAtDetSize(detSize: Int): CommitAnchor? {
    val warp = gray ?: return null
    val sized = warp.width == detSize && warp.height == detSize && (warped?.width ?: detSize) == detSize
    return if (sized) CommitAnchor(warp, warped) else null
}
