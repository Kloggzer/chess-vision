package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage

private const val WEAK_DARKENING_DIVISOR = 2.0

private const val BGR_CHANNELS = 3

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
 * [curBgr] is the current BGR warp; the Lab/HSV conversion happens inside [chromaOutliers], which
 * is the only place that knows WHICH squares are strong enough to be worth converting.
 */
internal class BaselineEvidence(
    val refCodes: ByteArray? = null,
    val occlCensusThr: Double = 0.0,
    val curBgr: BgrImage? = null,
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

/**
 * The baseline-occlusion scratch, owned by the [EngineState] whose reference is being compared —
 * see [ShadowVetoScratch] for why file scope was the wrong owner.
 *
 * It is the RECEIVER of [baselineOcclusionAndShadow] rather than a parameter because the function
 * already carries seven, and an eighth would trip detekt's `LongParameterList` into demanding a
 * parameter object that means nothing. Everything here is fully consumed inside one call; the
 * per-square arrays are read by the classification loop and by [isOccluder], nowhere else.
 */
internal class BaselineScratch {
    var lab = ByteArray(0)
    var hsv = ByteArray(0)
    val occMeans = DoubleArray(Squares.COUNT)
    val curMeans = DoubleArray(Squares.COUNT)
    val refMeans = DoubleArray(Squares.COUNT)
    val censValues = DoubleArray(Squares.COUNT)
}

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
internal fun BaselineScratch.baselineOcclusionAndShadow(
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

private fun BaselineScratch.computeMeans(
    curGray: GrayImage,
    refGray: GrayImage,
    boxes: SquareBoxes,
) {
    val width = curGray.width
    absDiffMeans(curGray.data, refGray.data, width, boxes, occMeans)
    planeMeans(curGray.data, width, boxes, curMeans)
    planeMeans(refGray.data, width, boxes, refMeans)
}

/**
 * The census channel over the band of strong squares (the same fast path as the veto), or `null`
 * for Python's legacy mode.
 */
private fun BaselineScratch.censusChannel(
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

/**
 * Skin/fabric chroma outliers among the strong squares.
 *
 * The Lab and HSV conversions are done here, per strong square, and not by the caller: they are
 * needed only for squares that already cleared the absdiff gate, which on a real frame is a
 * handful — converting the whole plane up front cost 50 ms per moving frame on the phone to feed
 * a test that reads a few thousand pixels.
 */
private fun BaselineScratch.chromaOutliers(
    curGray: GrayImage,
    boardSize: Int,
    whitePov: Boolean,
    evidence: BaselineEvidence,
    strong: Long,
): Long {
    val gamut = evidence.gamut
    val bgr = evidence.curBgr ?: return 0L
    if (gamut == null) return 0L
    // Python calls `occlusion_color_squares` with the DEFAULT `extend_up = 0.0` here — the base
    // box only, never the overhang box. A non-positive `colorThr` is handled in there.
    val geom = PlaneGeometry(curGray.width, curGray.height, boardSize, whitePov, extendUp = 0.0)
    val need = bgr.width * bgr.height * BGR_CHANNELS
    if (lab.size != need) lab = ByteArray(need)
    if (hsv.size != need) hsv = ByteArray(need)
    strong.forEachSquare { i ->
        geom.region(i, 0.0)?.let { box ->
            bgrToLabBox(bgr.data, bgr.width, box, lab)
            bgrToHsvBox(bgr.data, bgr.width, box, hsv)
        }
    }
    return occlusionColorSquares(ColorPlanes(lab, hsv), geom, gamut, strong, evidence.colorThr)
}

private fun BaselineScratch.isOccluder(
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
