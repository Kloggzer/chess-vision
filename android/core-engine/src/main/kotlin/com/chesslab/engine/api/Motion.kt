package com.chesslab.engine.api

import com.chesslab.engine.motionScore

/**
 * PERCENT (0..100) of pixels whose brightness changed by more than [pxThr].
 *
 * Exposed because `:app`'s board-aligned ROI motion feeds `FrameInput.motionRoiScore`, and it must
 * be the SAME function the engine scores whole-frame motion with — a second copy drifts. Compared
 * against `motionThr` (0.25 percent), so never treat the result as a fraction.
 */
fun motionPercent(
    prev: ByteArray,
    cur: ByteArray,
    pxThr: Double,
): Double = motionScore(prev, cur, pxThr)
