package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage

/** The occupied-square reason. */
private const val WHY_RESIDUE = "piece moved/hand residue"

/** The empty-square reason. */
private const val WHY_DRIFT = "light drift"

/** `max_changed + 2` — the resting-hand protection ceiling. */
private const val CHANGED_CEILING_SLACK = 2

private const val BGR_CHANNELS = 3

// Indices into the `intArrayOf(x0, y0, x1, y1)` of [squareRegion].
private const val R_X0 = 0

private const val R_Y0 = 1

private const val R_X1 = 2

private const val R_Y1 = 3

/** What one pass of the patcher healed, and why (the note names only the LAST reason, like Python). */
private class PatchResult(
    val patched: Long,
    val why: String,
)

/**
 * Nudge/drift self-healing of the reference without CNN — `_maybe_patch_anomaly`, Spec 10 part 4.
 *
 * Per-square timer: a square that is persistently "changed" although NO viable move explains the
 * situation (`bestLl < 0`) gets its cell pulled forward in the reference once its timeout expires,
 * rather than discarding the whole base truth.
 * - occupied squares (nudge / j'adoube / hand residue on the commit reference): `nudgeTimeoutS`;
 * - empty squares (local light drift): `driftWindowS` — more conservative, because a changing
 *   empty square could also be a silent wrong move.
 *
 * It runs WITH a CNN configured too: recovery needs `stuckCount >= settleFrames` plus cooldown plus
 * voting before it can heal, and in that window commit-frame hand residue keeps producing phantom
 * candidates. The cell patch is cheap, local and guarded, so it complements recovery.
 */
internal fun EngineState.maybePatchAnomaly(
    bestLl: Double,
    cur: GrayImage,
    curBgr: BgrImage?,
) {
    // Maintain the timer by REBUILDING it: squares that stopped changing lose their timer, new
    // ones start now.
    val hot = changed
    hot.forEachSquare { if (!anomalySince.has(it)) anomalyStart[it] = nowS }
    anomalySince = hot

    val n = hot.countOneBits()
    val eligible = n > 0 && bestLl < 0.0 && n <= config.maxChanged + CHANGED_CEILING_SLACK
    val ref = refGray
    if (ref != null && eligible) {
        val result = patchDueSquares(hot, ref, cur, curBgr)
        if (result.patched != 0L) {
            anomalySince = anomalySince.without(result.patched)
            // `refGray` was mutated IN PLACE, so both identity-keyed census caches must recode —
            // `curCensusFor` can name the very same plane and would hand back stale codes.
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

/** The per-square timeout loop, in Python's `sorted(changed)` order — the note names the LAST why. */
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

/**
 * Copies one cell from the current frame into the reference.
 *
 * The region uses `inset = 0.0, extendUp = overhang` — **the same pixels the diff looks at,
 * including the overhang**. Patching only the base cell leaves the extended strip above it hot
 * forever and the healing never converges.
 */
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

/** `dst[y0:y1, x0:x1] = src[y0:y1, x0:x1]`, clipped like NumPy's slicing. */
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
