package com.chesslab.engine

import com.chesslab.engine.api.GrayImage

/**
 * Scratch integral buffer of the gray diff channel. Private to this file and fully consumed
 * inside [perSquareDiff], so it can never alias another caller's integral.
 */
private var diffScratch: LongArray = LongArray(0)

/**
 * Python per_square_diff (tracker.py:139). Mean |ref - cur| per square.
 *
 * `boxes` are precomputed by the caller (the tracker holds one [SquareBoxes] for
 * `extendUp = overhang` and one for `extendUp = 0.0`; Python rebuilds them per call, we must not).
 */
internal fun perSquareDiff(
    grayA: GrayImage,
    grayB: GrayImage,
    boxes: SquareBoxes,
    out: DoubleArray,
): DoubleArray {
    require(grayA.width == grayB.width && grayA.height == grayB.height) {
        "gray size mismatch: ${grayA.width}x${grayA.height} vs ${grayB.width}x${grayB.height}"
    }
    diffScratch = integralBuffer(grayA.width, grayA.height, diffScratch)
    val ii = integralAbsDiff(grayA.data, grayB.data, grayA.width, grayA.height, diffScratch)
    return regionMeans(ii, grayA.width, boxes, out)
}
