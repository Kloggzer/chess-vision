package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage

/** `"piece moved/hand residue"` (`tracker.py:3410`) — the occupied-square reason. */
private const val WHY_RESIDUE = "piece moved/hand residue"

/** `"light drift"` (`tracker.py:3410`) — the empty-square reason. */
private const val WHY_DRIFT = "light drift"

/** `max_changed + 2` — the resting-hand protection ceiling (`tracker.py:3394`). */
private const val CHANGED_CEILING_SLACK = 2

private const val BGR_CHANNELS = 3

// Indices into the `intArrayOf(x0, y0, x1, y1)` of [squareRegion].
private const val R_X0 = 0

private const val R_Y0 = 1

private const val R_X1 = 2

private const val R_Y1 = 3

/** What one pass of the patcher healed, and why (the note names only the LAST reason, like Python). */
private class PatchResult(
    val patched: List<String>,
    val why: String,
)

/** Pixel layout of a plane the patcher copies into: `stride == width * channels`. */
private class RegionPlane(
    val width: Int,
    val height: Int,
    val channels: Int = 1,
)

/**
 * Nudge/drift self-healing of the reference without CNN — `_maybe_patch_anomaly`
 * (`tracker.py:3377-3420`), Spec 10 part 4.
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
 *
 * 03c calls this through its `AnomalyPatcher` seam; the wiring is `this::maybePatchAnomaly`.
 */
internal fun EngineState.maybePatchAnomaly(
    changed: Set<String>,
    bestLl: Double,
    cur: GrayImage,
    curBgr: BgrImage?,
) {
    // Maintain the timer by REBUILDING it: squares that stopped changing lose their timer, new
    // ones start now (`tracker.py:3393`).
    val timers = LinkedHashMap<String, Double>(changed.size)
    for (square in changed) timers[square] = anomalySince[square] ?: nowS
    anomalySince.clear()
    anomalySince.putAll(timers)

    val eligible = changed.isNotEmpty() && bestLl < 0.0 && changed.size <= config.maxChanged + CHANGED_CEILING_SLACK
    val ref = refGray
    if (ref != null && eligible) {
        val result = patchDueSquares(changed, ref, cur, curBgr)
        if (result.patched.isNotEmpty()) {
            for (square in result.patched) anomalySince.remove(square)
            // `refGray` was mutated IN PLACE, so the identity-keyed census cache must recode
            // (`tracker.py:3415`).
            refCensusFor = null
            note = "Reference pulled forward (${result.patched.joinToString(", ")}): ${result.why} — no move"
            if (result.patched.size == changed.size) {
                clearStuck()
                confirmer.reset()
            }
        }
    }
}

/** `tracker.py:3397-3410` — the per-square timeout loop. */
private fun EngineState.patchDueSquares(
    changed: Set<String>,
    ref: GrayImage,
    cur: GrayImage,
    curBgr: BgrImage?,
): PatchResult {
    val patched = ArrayList<String>()
    var why = ""
    for (square in changed.sorted()) {
        val occupied = board.pieceCharAt(square) != null
        val needed = if (occupied) config.nudgeTimeoutS else config.driftWindowS
        if (nowS - (anomalySince[square] ?: nowS) >= needed) {
            patchSquare(square, ref, cur, curBgr)
            patched.add(square)
            why = if (occupied) WHY_RESIDUE else WHY_DRIFT
        }
    }
    return PatchResult(patched, why)
}

/**
 * Copies one cell from the current frame into the reference.
 *
 * The region is `square_region(sq, detSize, whitePov, inset = 0.0, extend_up = overhang)` — **the
 * same pixels the diff looks at, including the overhang**. Patching only the base cell leaves the
 * extended strip above it hot forever and the healing never converges (`tracker.py:3404-3408`).
 */
private fun EngineState.patchSquare(
    square: String,
    ref: GrayImage,
    cur: GrayImage,
    curBgr: BgrImage?,
) {
    val region = squareRegion(square, detSize, whitePov, inset = 0.0, extendUp = config.overhang)
    copyRegion(ref.data, cur.data, region, RegionPlane(ref.width, ref.height))
    val refColor = refBgr
    if (curBgr != null && refColor != null) {
        copyRegion(
            refColor.data,
            curBgr.data,
            region,
            RegionPlane(refColor.width, refColor.height, BGR_CHANNELS),
        )
    }
}

/** `dst[y0:y1, x0:x1] = src[y0:y1, x0:x1]`, clipped like NumPy's slicing. */
private fun copyRegion(
    dst: ByteArray,
    src: ByteArray,
    region: IntArray,
    plane: RegionPlane,
) {
    val x0 = region[R_X0].coerceIn(0, plane.width)
    val y0 = region[R_Y0].coerceIn(0, plane.height)
    val x1 = region[R_X1].coerceIn(x0, plane.width)
    val y1 = region[R_Y1].coerceIn(y0, plane.height)
    val span = (x1 - x0) * plane.channels
    val stride = plane.width * plane.channels
    if (span > 0) {
        for (y in y0 until y1) {
            val offset = y * stride + x0 * plane.channels
            System.arraycopy(src, offset, dst, offset, span)
        }
    }
}
