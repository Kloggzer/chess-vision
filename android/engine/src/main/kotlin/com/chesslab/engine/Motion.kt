package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage

/** Motion gate + baseline occlusion/shadow classification (ports tracker.py:299,327). */
object Motion {
    private const val PERCENT = 100.0

    /**
     * Robust frame-to-frame motion: PERCENT of pixels whose brightness changed by more than
     * `pxThr` (0..100). A hand produces a compact region of strong diffs; global sub-pixel
     * wobble produces many tiny diffs, all below `pxThr` -> score ~0.
     */
    fun motionScore(
        prevGray: GrayImage,
        curGray: GrayImage,
        pxThr: Double,
    ): Double {
        var hits = 0
        for (i in curGray.data.indices) {
            if (kotlin.math.abs(curGray.data[i].px() - prevGray.data[i].px()) > pxThr) hits++
        }
        return hits.toDouble() / curGray.data.size * PERCENT
    }

    /** Result of [baselineOcclusionAndShadow]: dilated occlusion, dilated shadow, RAW occluded core. */
    data class OcclusionShadow(
        val occluded: Set<String>,
        val shadow: Set<String>,
        val core: Set<String>,
    )

    /**
     * Structural-mode inputs of [baselineOcclusionAndShadow]; null = legacy brightness-only
     * classification. The chroma check is active only with a non-null [gamut] and `colorThr > 0`.
     */
    class StructuralInputs(
        val refCodes: ByteArray,
        val occlCensusThr: Double,
        val curBgr: BgrImage? = null,
        val gamut: OcclusionGamut.Gamut? = null,
        val colorThr: Double = 0.0,
    )

    /**
     * (occluded, shadow, raw core) square sets from absdiff vs the baseline reference
     * (ports tracker.py:379 `_baseline_occlusion_and_shadow`).
     *
     * Legacy mode (`occlCensusThr` == 0 or no `refCodes`): occlusion = mean absdiff > absThr —
     * which conflates hard cast shadows with hands. Structural mode: a strong-absdiff square
     * is classified by WHAT changed:
     * - census change > `occlCensusThr` → structured occluder → occluded;
     * - else chroma outlier vs the reference board gamut → flat hand interior → occluded;
     * - else darker than reference → flat, chroma-consistent darkening = CAST SHADOW;
     * - else (brighter, flat, chroma-consistent) → occluded (conservative).
     * Weak darkening (absdiff <= thr but mean drop > thr/2) stays shadow as before.
     * Occluded/shadow are dilated by one orthogonal neighbour; `core` is the RAW (undilated)
     * occluded set — the ">2 squares → occluded state" gate must count THIS, not the dilated
     * set (one strong square dilates to 5 and locked the tracker in the occluded state).
     */
    fun baselineOcclusionAndShadow(
        curGray: GrayImage,
        refGray: GrayImage,
        geom: BoardGeometry,
        absThr: Double,
        structural: StructuralInputs? = null,
    ): OcclusionShadow {
        val base = BoardGeometry(geom.boardSize, geom.whitePov)
        val boxes = Squares.boxes(base)
        val w = curGray.width
        val absDiff =
            IntArray(curGray.data.size) {
                kotlin.math.abs(curGray.data[it].px() - refGray.data[it].px())
            }
        val occMeans = SquareDiff.regionMeans(SquareDiff.integral(absDiff, w, curGray.height), w, boxes)
        val curVals = IntArray(curGray.data.size) { curGray.data[it].px() }
        val refVals = IntArray(refGray.data.size) { refGray.data[it].px() }
        val curMeans = SquareDiff.regionMeans(SquareDiff.integral(curVals, w, curGray.height), w, boxes)
        val refMeans = SquareDiff.regionMeans(SquareDiff.integral(refVals, w, refGray.height), w, boxes)
        val strong = Squares.all.filterIndexed { idx, _ -> occMeans[idx] > absThr }.toSet()
        val occluded = mutableSetOf<String>()
        val shadow = mutableSetOf<String>()
        val classifier = structuralClassifier(refGray, curGray, base, strong, structural)
        for ((idx, sq) in Squares.all.withIndex()) {
            if (occMeans[idx] > absThr) {
                if (classifier == null || classifier(sq, curMeans[idx] >= refMeans[idx])) {
                    occluded.add(sq)
                } else {
                    shadow.add(sq) // flat + darker + chroma-consistent
                }
            } else if (refMeans[idx] - curMeans[idx] > absThr / 2) {
                shadow.add(sq)
            }
        }
        val dilatedOcc = dilate(occluded)
        return OcclusionShadow(dilatedOcc, dilate(shadow) - dilatedOcc, occluded)
    }

    /**
     * Per-square "is this strong-absdiff square an occluder?" predicate of the structural
     * mode, or null for legacy brightness-only classification (any strong absdiff = occluded).
     */
    private fun structuralClassifier(
        refGray: GrayImage,
        curGray: GrayImage,
        base: BoardGeometry,
        strong: Set<String>,
        structural: StructuralInputs?,
    ): ((String, Boolean) -> Boolean)? {
        if (structural == null || structural.occlCensusThr <= 0 || strong.isEmpty()) return null
        val cens = Census.perSquareChange(refGray, curGray, base, refCodes = structural.refCodes)
        val chromaOut =
            if (structural.curBgr != null && structural.gamut != null && structural.colorThr > 0) {
                OcclusionGamut.occlusionColorSquares(
                    structural.curBgr,
                    structural.gamut,
                    base,
                    strong,
                    structural.colorThr,
                )
            } else {
                emptySet()
            }
        return { sq, notDarker -> cens.getValue(sq) > structural.occlCensusThr || sq in chromaOut || notDarker }
    }

    private fun dilate(squares: Set<String>): Set<String> {
        val out = squares.toMutableSet()
        for (sq in squares) out.addAll(Squares.neighbours.getValue(sq))
        return out
    }
}
