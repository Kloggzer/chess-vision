package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage

private const val BGR_CHANNELS = 3

// Per-frame scratch. Private to this file, fully consumed inside the call, and the engine is
// single-threaded (entry.md hard rule 2), so nothing can alias a caller's array (01a's D01a-2).
private var refHsvBuf = ByteArray(0)
private var curHsvBuf = ByteArray(0)
private var censBandBuf = DoubleArray(Squares.COUNT)

/**
 * Step 3 of `_try_detect` — Python `_apply_vetoes`. Takes the hot squares and writes the survivors
 * to [EngineState.changed] and the vetoed ones to [EngineState.shadowVetoed].
 *
 * **entry.md invariant 2, the half that PRESERVES z.** A cast shadow (Cucchiara HSV + a census
 * confirmation) only removes the square from `changed`, i.e. from the gates; its z-value survives
 * untouched for scoring. A VACATED square very often reads as a uniform darkening to the HSV test —
 * the piece left and the board colour shows through — so zeroing z here would destroy the
 * from-evidence of every real move. The opposite semantics (z zeroed) belong to the occlusion
 * taint in `Taint.kt`.
 *
 * Python's unused `z` parameter is not carried over (STATUS D03b-1); nothing in this function reads
 * or writes z, which is exactly the property the phase's acceptance grep checks.
 */
internal fun EngineState.applyVetoes(
    cur: GrayImage,
    curBgr: BgrImage?,
    hot: Long,
) {
    shadowVetoed = 0L
    changed = hot
    var shadowVeto = 0L
    val ref = refBgr
    if (curBgr != null && ref != null && hot != 0L) {
        // Invariant 8: `censusThr` (40.0) was live-tuned on the RAW census channel. The normalized
        // channel serves scoring and noise learning; using it here lets normalization pull a
        // structurally changed destination square under the threshold, which is the
        // phantom-shadow-as-destination class.
        val censForVeto = censRaw ?: bandCensusForVeto(cur, hot)
        val shadows = hsvShadows(ref, curBgr, hot)
        val thr = config.censusThr
        shadows.forEachSquare { i -> if (censForVeto[i] < thr) shadowVeto = shadowVeto.with(i) }
        if (shadowVeto != 0L) {
            changed = hot.without(shadowVeto)
            shadowVetoed = shadowVeto
        }
    }
}

/**
 * `hsv_shadow_squares(self.ref_bgr, cur_bgr, ...)`.
 *
 * Python hands `cv2.cvtColor` the two BGR planes on every call; this port takes the converted HSV
 * planes, so the conversion happens here, into reusable buffers.
 */
private fun EngineState.hsvShadows(
    ref: BgrImage,
    cur: BgrImage,
    candidates: Long,
): Long {
    val need = cur.width * cur.height * BGR_CHANNELS
    if (refHsvBuf.size != need) refHsvBuf = ByteArray(need)
    if (curHsvBuf.size != need) curHsvBuf = ByteArray(need)
    bgrToHsv(ref.data, ref.width, ref.height, refHsvBuf)
    bgrToHsv(cur.data, cur.width, cur.height, curHsvBuf)
    val geom = PlaneGeometry(cur.width, cur.height, detSize, whitePov, config.overhang)
    return hsvShadowSquares(refHsvBuf, curHsvBuf, geom, candidates)
}

/**
 * The `censusZWeight == 0` fast path: no evidence-side census channel exists this frame, so the
 * veto computes its own over the candidate rows only.
 *
 * `rows = (min y0 - 1, max y1 + 1)` over the candidates' extended boxes — the +/-1 halo is what
 * makes the band-local census codes identical to the full transform inside the band. The locally
 * computed channel **is raw already**, so it needs no `censRaw` counterpart.
 *
 * This never runs when [EngineState.censRaw] is available: a second census evaluation over a
 * different band would be a divergent channel, not a cheaper one.
 */
private fun EngineState.bandCensusForVeto(
    cur: GrayImage,
    changed: Long,
): DoubleArray {
    val boxes = evidenceBoxes
    var yLo = Int.MAX_VALUE
    var yHi = Int.MIN_VALUE
    changed.forEachSquare { i ->
        if (boxes.y0[i] < yLo) yLo = boxes.y0[i]
        if (boxes.y1[i] > yHi) yHi = boxes.y1[i]
    }
    return perSquareCensusChange(refCensusCodes(), cur, boxes, censBandBuf, rows = intArrayOf(yLo - 1, yHi + 1))
}
