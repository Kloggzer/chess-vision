package com.chesslab.engine

import com.chesslab.engine.api.GrayImage

private const val WEAK_DARKENING_DIVISOR = 2.0

/**
 * Orthogonal (4-) neighbour MASK per square index, Python `_SQ_NEIGHBOURS`.
 *
 * Rank +/-1 and file +/-1 only — **never diagonals**.
 */
internal val SQ_NEIGHBOURS: LongArray =
    LongArray(Squares.COUNT) { i ->
        val file = i % Squares.N
        val rank = i / Squares.N
        var mask = 0L
        if (rank < Squares.N - 1) mask = mask.with(i + Squares.N)
        if (rank > 0) mask = mask.with(i - Squares.N)
        if (file > 0) mask = mask.with(i - 1)
        if (file < Squares.N - 1) mask = mask.with(i + 1)
        mask
    }

/**
 * The optional structural-mode inputs (Python's trailing keyword arguments).
 *
 * All absent (the default) is Python's **legacy mode**: a strong square is simply occluded, which
 * conflates hard cast shadows with hands.
 *
 * [curLab] / [curHsv] are the current BGR warp already converted by the caller; Python converts
 * inside `occlusion_color_squares`, which `:core-engine` cannot afford per call.
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
    val occluded: Long,
    val shadow: Long,
    val core: Long,
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
 * Python `_baseline_occlusion_and_shadow` — classifies strong-absdiff squares as occluder vs. cast
 * shadow against the baseline reference.
 *
 * [boxes] is the caller's `_det_boxes`, built with **`extendUp = 0.0`**; [absThr] is passed in as
 * `motionPxThr * 4` and never derived here.
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
    boardSize: Int,
    absThr: Double,
    whitePov: Boolean,
    evidence: BaselineEvidence = BaselineEvidence(),
): BaselineResult {
    require(curGray.width == refGray.width && curGray.height == refGray.height) {
        "gray size mismatch: ${curGray.width}x${curGray.height} vs ${refGray.width}x${refGray.height}"
    }
    computeMeans(curGray, refGray, boxes)
    var strong = 0L
    for (i in 0 until Squares.COUNT) {
        if (occMeans[i] > absThr) strong = strong.with(i)
    }
    val cens = censusChannel(curGray, boxes, evidence, strong)
    val chroma = if (cens == null) 0L else chromaOutliers(curGray, boardSize, whitePov, evidence, strong)
    var occluded = 0L
    var shadow = 0L
    val weakThr = absThr / WEAK_DARKENING_DIVISOR
    for (i in 0 until Squares.COUNT) {
        if (strong.has(i)) {
            if (isOccluder(i, cens, chroma, evidence.occlCensusThr)) occluded = occluded.with(i) else shadow = shadow.with(i)
        } else if (refMeans[i] - curMeans[i] > weakThr) {
            shadow = shadow.with(i)
        }
    }
    val dilatedOcc = dilate(occluded)
    // Third return: the RAW (undilated) occluded core. The ">2 squares -> occluded state" gate must
    // count THIS, not the dilated set — one genuinely strong square (a dark knight arriving on a
    // light square) dilates to 5 and locked the tracker in the occluded state, where `_try_detect`
    // (and with it the CNN move-vs-hand arbitration) never runs. Dilation still protects the
    // z-taint (entry.md invariant 3).
    return BaselineResult(dilatedOcc, dilate(shadow).without(dilatedOcc), occluded)
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
 * for Python's legacy mode.
 */
private fun censusChannel(
    curGray: GrayImage,
    boxes: SquareBoxes,
    evidence: BaselineEvidence,
    strong: Long,
): DoubleArray? {
    val refCodes = evidence.refCodes
    if (refCodes == null || evidence.occlCensusThr <= 0.0) return null
    var bandLo = Int.MAX_VALUE
    var bandHi = Int.MIN_VALUE
    strong.forEachSquare { i ->
        if (boxes.y0[i] < bandLo) bandLo = boxes.y0[i]
        if (boxes.y1[i] > bandHi) bandHi = boxes.y1[i]
    }
    // bandLo > bandHi means there is no strong square at all.
    if (bandLo > bandHi) return null
    return perSquareCensusChange(refCodes, curGray, boxes, censValues, intArrayOf(bandLo - 1, bandHi + 1))
}

/** Skin/fabric chroma outliers among the strong squares. */
private fun chromaOutliers(
    curGray: GrayImage,
    boardSize: Int,
    whitePov: Boolean,
    evidence: BaselineEvidence,
    strong: Long,
): Long {
    val gamut = evidence.gamut
    val lab = evidence.curLab
    val hsv = evidence.curHsv
    if (gamut == null || lab == null || hsv == null) return 0L
    // Python calls `occlusion_color_squares` with the DEFAULT `extend_up = 0.0` here — the base
    // box only, never the overhang box. A non-positive `colorThr` is handled in there.
    val geom = PlaneGeometry(curGray.width, curGray.height, boardSize, whitePov, extendUp = 0.0)
    return occlusionColorSquares(ColorPlanes(lab, hsv), geom, gamut, strong, evidence.colorThr)
}

private fun isOccluder(
    i: Int,
    cens: DoubleArray?,
    chroma: Long,
    occlCensusThr: Double,
): Boolean {
    if (cens == null) return true // legacy: brightness only
    // structured occluder, or a skin/fabric chroma outlier
    val structured = cens[i] > occlCensusThr || chroma.has(i)
    // otherwise a flat BRIGHTENER is still occlusion — conservative
    return structured || curMeans[i] >= refMeans[i]
}

/** [mask] grown by the orthogonal neighbours of every set square. */
private fun dilate(mask: Long): Long {
    var out = mask
    mask.forEachSquare { out = out or SQ_NEIGHBOURS[it] }
    return out
}
