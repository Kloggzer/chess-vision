package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage

private const val BGR_CHANNELS = 3

/**
 * The shadow veto's per-frame scratch, owned by the [EngineState] whose frames it holds — at file scope
 * it would be one set of buffers per process, safe only while no two engines are alive at once.
 * Everything is consumed inside one call; outside the candidate boxes the HSV planes are stale.
 */
internal class ShadowVetoScratch {
    var refHsv = ByteArray(0)
    var curHsv = ByteArray(0)
    val censBand = DoubleArray(Squares.COUNT)
}

/**
 * Step 3 — the hot squares split into survivors and shadow-vetoed. **entry.md invariant 2, the half that
 * PRESERVES z:** a cast shadow only leaves `changed` and its z survives for scoring, because a VACATED
 * square often reads as a uniform darkening and zeroing z would destroy every real move's from-evidence.
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
    // `baselineOcclusion` heisst AUS wirklich aus: dieses Veto steht auf demselben Schalter wie
    // der Baseline-Arm, sonst schaltet er nur die Haelfte ab, die niemanden interessiert
    // (gemessen 2026-09-21, `docs/schattenveto-2026-09-21.md`).
    if (config.baselineOcclusion && curBgr != null && ref != null && hot != 0L) {
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
 * Only the CANDIDATES' boxes are converted to HSV: [hsvShadowSquares] looks at exactly those boxes and
 * the conversion is per-pixel, so this is the same answer for a fraction of the pixels — two full
 * 800x800 conversions per detection frame to judge a handful of squares was the veto's whole cost.
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
 * The `censusZWeight == 0` fast path: no evidence-side census channel this frame, so the veto computes
 * its own over the candidate rows, the +/-1 halo making the band-local codes identical to the full
 * transform. Never runs when [EngineState.censRaw] exists — a second band would diverge, not save.
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
