package com.chesslab.engine

import com.chesslab.engine.api.GrayImage

private const val MAX_ORTHOGONAL_NEIGHBOURS = 4
private const val WEAK_DARKENING_DIVISOR = 2.0

/**
 * Orthogonal (4-) neighbours per square index, Python `_SQ_NEIGHBOURS` (`tracker.py:369`).
 *
 * Rank +/-1 and file +/-1 only — **never diagonals**. Values are indices into [Squares.ALL].
 */
internal val SQ_NEIGHBOURS: Array<IntArray> =
    Array(Squares.COUNT) { i ->
        val name = Squares.ALL[i]
        val file = Squares.FILES.indexOf(name[0])
        val rank = name[1] - '0'
        val n = ArrayList<Int>(MAX_ORTHOGONAL_NEIGHBOURS)
        if (rank < Squares.N) n.add(Squares.index("${name[0]}${rank + 1}"))
        if (rank > 1) n.add(Squares.index("${name[0]}${rank - 1}"))
        if (file > 0) n.add(Squares.index("${Squares.FILES[file - 1]}$rank"))
        if (file < Squares.N - 1) n.add(Squares.index("${Squares.FILES[file + 1]}$rank"))
        n.toIntArray()
    }

/**
 * Geometry and threshold of [baselineOcclusionAndShadow].
 *
 * @property boardSize the board edge the boxes were built for (`_det_size`).
 * @property absThr passed by the caller as `motionPxThr * 4` (`tracker.py:1614`) — never derived here.
 * @property whitePov board orientation, only consumed by the chroma-outlier test.
 */
internal class BaselineParams(
    val boardSize: Int,
    val absThr: Double,
    val whitePov: Boolean,
)

/**
 * The optional structural-mode inputs (Python's trailing keyword arguments, `tracker.py:389-390`).
 *
 * All absent (the default) is Python's **legacy mode**: a strong square is simply occluded, which
 * conflates hard cast shadows with hands.
 *
 * [curLab] / [curHsv] are the current BGR warp already converted by the caller (01c); Python
 * converts inside `occlusion_color_squares`, which `:core-engine` cannot afford per call.
 */
internal class BaselineEvidence(
    val refCodes: ByteArray? = null,
    val occlCensusThr: Double = 0.0,
    val curLab: ByteArray? = null,
    val curHsv: ByteArray? = null,
    val gamut: ColorGamut? = null,
    val colorThr: Double = 0.0,
)

/**
 * Outcome of [baselineOcclusionAndShadow]. Never collapse this to two sets.
 *
 * @property occluded DILATED occluded squares — what the z-taint uses.
 * @property shadow DILATED shadow squares MINUS the dilated occluded set.
 * @property core the **RAW UNDILATED** occluded core (entry.md invariant 3).
 */
internal class BaselineResult(
    val occluded: BooleanArray,
    val shadow: BooleanArray,
    val core: BooleanArray,
)

// Scratch, private to this file and fully consumed inside the call, so nothing can alias another
// caller's integral (see 01a's `integralBuffer` contract). The engine is single-threaded.
private var occIntegral = LongArray(0)
private var curIntegral = LongArray(0)
private var refIntegral = LongArray(0)
private val occMeans = DoubleArray(Squares.COUNT)
private val curMeans = DoubleArray(Squares.COUNT)
private val refMeans = DoubleArray(Squares.COUNT)
private val censValues = DoubleArray(Squares.COUNT)

/**
 * Python `_baseline_occlusion_and_shadow` (`tracker.py:386`) — classifies strong-absdiff squares as
 * occluder vs. cast shadow against the baseline reference.
 *
 * [boxes] is the caller's `_det_boxes`, built with **`extendUp = 0.0`** (`:820`).
 *
 * Structural mode classifies a strong square by WHAT changed: census change above
 * `occlCensusThr` (structured occluder) **or** a chroma outlier vs. the reference gamut (flat hand
 * interior) **or** brighter than the reference (an unknown flat brightener must not pass as
 * evidence) -> occluded; otherwise flat + darker + chroma-consistent -> cast shadow. Weak darkening
 * (`refMean - curMean > absThr / 2`) is shadow as well. Both sets are dilated by their orthogonal
 * neighbours; the raw core is returned undilated.
 */
internal fun baselineOcclusionAndShadow(
    curGray: GrayImage,
    refGray: GrayImage,
    boxes: SquareBoxes,
    params: BaselineParams,
    evidence: BaselineEvidence = BaselineEvidence(),
): BaselineResult {
    require(curGray.width == refGray.width && curGray.height == refGray.height) {
        "gray size mismatch: ${curGray.width}x${curGray.height} vs ${refGray.width}x${refGray.height}"
    }
    computeMeans(curGray, refGray, boxes)
    val strong = BooleanArray(Squares.COUNT)
    for (i in 0 until Squares.COUNT) {
        strong[i] = occMeans[i] > params.absThr
    }
    val cens = censusChannel(curGray, boxes, evidence, strong)
    val chroma = if (cens == null) null else chromaOutliers(curGray, params, evidence, strong)
    val split = classify(strong, cens, chroma, params.absThr, evidence.occlCensusThr)

    val dilatedOcc = dilate(split.occluded)
    val dilatedShadow = dilate(split.shadow)
    for (i in 0 until Squares.COUNT) {
        if (dilatedOcc[i]) dilatedShadow[i] = false
    }
    // Third return: the RAW (undilated) occluded core. The ">2 squares -> occluded state" gate must
    // count THIS, not the dilated set — one genuinely strong square (a dark knight arriving on a
    // light square) dilates to 5 and locked the tracker in the occluded state, where `_try_detect`
    // (and with it the CNN move-vs-hand arbitration) never runs. Dilation still protects the
    // z-taint (`tracker.py:447-453`, entry.md invariant 3).
    return BaselineResult(dilatedOcc, dilatedShadow, split.occluded)
}

private fun computeMeans(
    curGray: GrayImage,
    refGray: GrayImage,
    boxes: SquareBoxes,
) {
    val width = curGray.width
    val height = curGray.height
    occIntegral = integralBuffer(width, height, occIntegral)
    curIntegral = integralBuffer(width, height, curIntegral)
    refIntegral = integralBuffer(width, height, refIntegral)
    val occ = integralAbsDiff(curGray.data, refGray.data, width, height, occIntegral)
    regionMeans(occ, width, boxes, occMeans)
    regionMeans(integral(curGray.data, width, height, curIntegral), width, boxes, curMeans)
    regionMeans(integral(refGray.data, width, height, refIntegral), width, boxes, refMeans)
}

/**
 * The census channel over the band of strong squares (the same fast path as the veto), or `null`
 * for Python's legacy mode (`tracker.py:419`).
 */
private fun censusChannel(
    curGray: GrayImage,
    boxes: SquareBoxes,
    evidence: BaselineEvidence,
    strong: BooleanArray,
): DoubleArray? {
    val refCodes = evidence.refCodes
    var result: DoubleArray? = null
    if (refCodes != null && evidence.occlCensusThr > 0.0) {
        var bandLo = Int.MAX_VALUE
        var bandHi = Int.MIN_VALUE
        for (i in 0 until Squares.COUNT) {
            if (!strong[i]) continue
            if (boxes.y0[i] < bandLo) bandLo = boxes.y0[i]
            if (boxes.y1[i] > bandHi) bandHi = boxes.y1[i]
        }
        if (bandLo <= bandHi) { // at least one strong square
            val rows = intArrayOf(bandLo - 1, bandHi + 1)
            result = perSquareCensusChange(refCodes, curGray, boxes, censValues, rows)
        }
    }
    return result
}

/** Skin/fabric chroma outliers among the strong squares (`tracker.py:426-428`). */
private fun chromaOutliers(
    curGray: GrayImage,
    params: BaselineParams,
    evidence: BaselineEvidence,
    strong: BooleanArray,
): BooleanArray? {
    val width = curGray.width
    val height = curGray.height
    val lab = evidence.curLab
    val hsv = evidence.curHsv
    val gamut = evidence.gamut
    var mask: BooleanArray? = null
    if (gamut != null && evidence.colorThr > 0.0) {
        if (lab != null && hsv != null) {
            // Python calls `occlusion_color_squares` with the DEFAULT `extend_up = 0.0` here
            // (`tracker.py:427`) — the base box only, never the overhang box.
            val geom = PlaneGeometry(width, height, params.boardSize, params.whitePov, extendUp = 0.0)
            val outliers =
                occlusionColorSquares(
                    ColorPlanes(lab, hsv),
                    geom,
                    gamut,
                    Squares.maskToSet(strong),
                    evidence.colorThr,
                )
            mask = Squares.setToMask(outliers)
        }
    }
    return mask
}

private class Split(
    val occluded: BooleanArray,
    val shadow: BooleanArray,
)

private fun classify(
    strong: BooleanArray,
    cens: DoubleArray?,
    chroma: BooleanArray?,
    absThr: Double,
    occlCensusThr: Double,
): Split {
    val occluded = BooleanArray(Squares.COUNT)
    val shadow = BooleanArray(Squares.COUNT)
    val weakThr = absThr / WEAK_DARKENING_DIVISOR
    for (i in 0 until Squares.COUNT) {
        if (strong[i]) {
            if (isOccluder(i, cens, chroma, occlCensusThr)) occluded[i] = true else shadow[i] = true
        } else if (refMeans[i] - curMeans[i] > weakThr) {
            shadow[i] = true
        }
    }
    return Split(occluded, shadow)
}

private fun isOccluder(
    i: Int,
    cens: DoubleArray?,
    chroma: BooleanArray?,
    occlCensusThr: Double,
): Boolean {
    if (cens == null) return true // legacy: brightness only
    // structured occluder, or a skin/fabric chroma outlier
    val structured = cens[i] > occlCensusThr || (chroma != null && chroma[i])
    // otherwise a flat BRIGHTENER is still occlusion — conservative
    return structured || curMeans[i] >= refMeans[i]
}

/** [mask] grown by the orthogonal neighbours of every set square. */
private fun dilate(mask: BooleanArray): BooleanArray {
    val out = mask.copyOf()
    for (i in 0 until Squares.COUNT) {
        if (!mask[i]) continue
        for (n in SQ_NEIGHBOURS[i]) {
            out[n] = true
        }
    }
    return out
}
