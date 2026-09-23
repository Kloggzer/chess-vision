package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage

private const val WHY_RESIDUE = "piece moved/hand residue"

private const val WHY_DRIFT = "light drift"

private const val CHANGED_CEILING_SLACK = 2

private const val BGR_CHANNELS = 3

private const val R_X0 = 0

private const val R_Y0 = 1

private const val R_X1 = 2

private const val R_Y1 = 3

/** The note names only the LAST reason. */
private class PatchResult(
    val patched: Long,
    val why: String,
)

/** Rebuilt on EVERY detection frame: only the refusal arms call [maybePatchAnomaly], and a square that went
 *  quiet over the candidate path otherwise came back already due. */
internal fun EngineState.trackAnomalies() {
    val hot = changed
    hot.forEachSquare { if (!anomalySince.has(it)) anomalyStart[it] = nowS }
    anomalySince = hot
}

/** A square persistently "changed" that NO viable move explains is healed after its timeout instead of
 *  discarding base truth. Empty squares wait longer: a changing empty square could be a silent wrong move. */
internal fun EngineState.maybePatchAnomaly(
    bestLl: Double,
    cur: GrayImage,
    curBgr: BgrImage?,
) {
    val hot = anomalySince
    val n = hot.countOneBits()
    // Never while the CNN disagrees: a square that differs because the PHYSICAL board moved on looks the same,
    // and healing it would make the diff channel agree with the wrong position for good.
    val desynced = alarm != null || desyncObs > 0 || cnnStatus == CNN_STATUS_MISMATCH
    val eligible = n > 0 && bestLl < 0.0 && n <= config.maxChanged + CHANGED_CEILING_SLACK && !desynced
    val ref = refGray
    if (ref != null && eligible) {
        val result = patchDueSquares(hot, ref, cur, curBgr)
        if (result.patched != 0L) {
            anomalySince = anomalySince.without(result.patched)
            // `refGray` was mutated IN PLACE: both identity-keyed census caches must recode.
            refCensusFor = null
            curCensusFor = null
            note =
                "Reference pulled forward (${result.patched.sortedSquareNames().joinToString(", ")}): " +
                "${result.why} — no move"
            if (result.patched.countOneBits() == n) {
                clearStuck()
                confirmer.reset()
            }
        }
    }
}

private fun EngineState.patchDueSquares(
    hot: Long,
    ref: GrayImage,
    cur: GrayImage,
    curBgr: BgrImage?,
): PatchResult {
    var patched = 0L
    var why = ""
    hot.forEachSquareSorted { i ->
        val occupied = board.pieceCharAt(i) != null
        val needed = if (occupied) config.nudgeTimeoutS else config.driftWindowS
        if (nowS - anomalyStart[i] >= needed) {
            patchSquare(i, ref, cur, curBgr)
            patched = patched.with(i)
            why = if (occupied) WHY_RESIDUE else WHY_DRIFT
        }
    }
    return PatchResult(patched, why)
}

/** Over the same pixels the diff looks at, **overhang included**: the base cell alone leaves the strip
 *  above it hot forever. */
private fun EngineState.patchSquare(
    square: Int,
    ref: GrayImage,
    cur: GrayImage,
    curBgr: BgrImage?,
) {
    val region = squareRegion(square, detSize, whitePov, inset = 0.0, extendUp = config.overhang)
    copyRegion(ref.data, cur.data, region, ref.width, ref.height, 1)
    val refColor = refBgr
    if (curBgr != null && refColor != null) {
        copyRegion(refColor.data, curBgr.data, region, refColor.width, refColor.height, BGR_CHANNELS)
    }
}

private fun copyRegion(
    dst: ByteArray,
    src: ByteArray,
    region: IntArray,
    width: Int,
    height: Int,
    channels: Int,
) {
    val x0 = region[R_X0].coerceIn(0, width)
    val y0 = region[R_Y0].coerceIn(0, height)
    val x1 = region[R_X1].coerceIn(x0, width)
    val y1 = region[R_Y1].coerceIn(y0, height)
    val span = (x1 - x0) * channels
    val stride = width * channels
    if (span > 0) {
        for (y in y0 until y1) {
            val offset = y * stride + x0 * channels
            System.arraycopy(src, offset, dst, offset, span)
        }
    }
}
