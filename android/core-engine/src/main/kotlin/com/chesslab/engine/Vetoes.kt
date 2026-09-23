package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage

private const val BGR_CHANNELS = 3

/** Owned by its [EngineState]: at file scope it would be one set of buffers per process. Outside the
 *  candidate boxes the HSV planes are stale. */
internal class ShadowVetoScratch {
    var refHsv = ByteArray(0)
    var curHsv = ByteArray(0)
    val censBand = DoubleArray(Squares.COUNT)
}

/** **Invariant 2, the half that PRESERVES z:** a shadow only leaves `changed` — a VACATED square often reads
 *  as uniform darkening, and zeroing z would destroy every real move's from-evidence. */
internal fun EngineState.applyVetoes(
    cur: GrayImage,
    curBgr: BgrImage?,
    hot: Long,
) {
    shadowVetoed = 0L
    changed = hot
    var shadowVeto = 0L
    val ref = refBgr
    // AUS heisst wirklich aus: dieses Veto steht auf demselben Schalter wie der Baseline-Arm.
    if (config.baselineOcclusion && curBgr != null && ref != null && hot != 0L) {
        // Invariant 8: `censusThr` was tuned on the RAW channel; the normalized one can pull a changed destination
        // under it — the phantom-shadow-as-destination class.
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

/** Only the CANDIDATES' boxes: the conversion is per-pixel, so the answer is the same for a fraction — two
 *  full 800x800 conversions per detection frame were the veto's whole cost. */
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

/** `censusZWeight == 0`: the veto computes its own census over the candidate rows (the ±1 halo keeps the
 *  codes identical). Never when [EngineState.censRaw] exists — a second band would diverge. */
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
