package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage

private const val WEAK_DARKENING_DIVISOR = 2.0

private const val BGR_CHANNELS = 3

/** Orthogonal rank/file neighbours only; never diagonals. */
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

/** Without structural inputs, every strong square is conservatively treated as occluded. */
internal class BaselineEvidence(
    val refCodes: ByteArray? = null,
    val occlCensusThr: Double = 0.0,
    val curBgr: BgrImage? = null,
    val gamut: ColorGamut? = null,
    val colorThr: Double = 0.0,
)

/**
 * @property occluded dilated squares used for z-taint.
 * @property shadow dilated shadows minus dilated occlusion.
 * @property core raw undilated occlusion (entry.md invariant 3).
 */
internal class BaselineResult(
    val occluded: Long,
    val shadow: Long,
    val core: Long,
)

/** Scratch belongs to the [EngineState] whose reference is being compared. */
internal class BaselineScratch {
    var lab = ByteArray(0)
    var hsv = ByteArray(0)
    val occMeans = DoubleArray(Squares.COUNT)
    val curMeans = DoubleArray(Squares.COUNT)
    val refMeans = DoubleArray(Squares.COUNT)
    val censValues = DoubleArray(Squares.COUNT)
}

/**
 * Base boxes use `extendUp=0.0`; strong structure, chroma outliers, or brightening mean occlusion.
 * Flat chroma-consistent darkening is shadow; weak darkening starts above [absThr]/2.
 * Both results dilate orthogonally, while core stays raw (entry.md invariant 3).
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
    // Count raw core for the occluded-state gate; dilation can turn one square into five.
    // Dilation still protects z-taint (entry.md invariant 3).
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
    if (bandLo > bandHi) return null
    return perSquareCensusChange(refCodes, curGray, boxes, censValues, intArrayOf(bandLo - 1, bandHi + 1))
}

/** Converts only strong squares; a full-plane conversion cost 50 ms per moving frame on-phone. */
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
    // Chroma occlusion uses the base box only, never overhang.
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
    val structured = cens[i] > occlCensusThr || chroma.has(i)
    // A flat brightener remains occlusion conservatively.
    return structured || curMeans[i] >= refMeans[i]
}

private fun dilate(mask: Long): Long {
    var out = mask
    mask.forEachSquare { out = out or SQ_NEIGHBOURS[it] }
    return out
}
