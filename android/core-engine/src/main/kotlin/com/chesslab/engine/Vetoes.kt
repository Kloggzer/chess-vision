package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage

private const val BGR_CHANNELS = 3

/**
 * The shadow veto's per-frame scratch, owned by the [EngineState] whose frames it holds.
 *
 * It used to sit at FILE scope, which makes it one set of buffers for the whole process. That is
 * safe only as long as no two engines are alive at once — a property of `StackSwitch.restart()`
 * closing the old tracker stack before it builds the new one, i.e. of a completely different file's
 * ordering. Per instance it is a property of this type, which is what `EngineState`'s "owned per
 * engine so two engines can never alias each other" already promised for the evidence arrays.
 *
 * Everything here is fully consumed inside one call; outside the candidate boxes the HSV planes are
 * leftovers from an earlier frame and are never read (see [hsvShadows]).
 */
internal class ShadowVetoScratch {
    var refHsv = ByteArray(0)
    var curHsv = ByteArray(0)
    val censBand = DoubleArray(Squares.COUNT)
}

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
 *
 * Only the CANDIDATES' boxes are converted. [hsvShadowSquares] looks at exactly those boxes, and
 * the conversion is per-pixel, so this is the same answer for a fraction of the pixels — two full
 * 800x800 conversions per detection frame to judge a handful of squares was the veto's whole cost.
 * Everything outside the boxes is leftover from an earlier frame and never read.
 */
private fun EngineState.hsvShadows(
    ref: BgrImage,
    cur: BgrImage,
    candidates: Long,
): Long {
    val scratch = shadowVetoScratch
    val need = cur.width * cur.height * BGR_CHANNELS
    if (scratch.refHsv.size != need) scratch.refHsv = ByteArray(need)
    if (scratch.curHsv.size != need) scratch.curHsv = ByteArray(need)
    val geom = PlaneGeometry(cur.width, cur.height, detSize, whitePov, config.overhang)
    candidates.forEachSquare { i ->
        geom.region(i, geom.extendUp)?.let { box ->
            bgrToHsvBox(ref.data, ref.width, box, scratch.refHsv)
            bgrToHsvBox(cur.data, cur.width, box, scratch.curHsv)
        }
    }
    return hsvShadowSquares(scratch.refHsv, scratch.curHsv, geom, candidates)
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
    return perSquareCensusChange(refCensusCodes(), cur, boxes, shadowVetoScratch.censBand, rows = intArrayOf(yLo - 1, yHi + 1))
}
