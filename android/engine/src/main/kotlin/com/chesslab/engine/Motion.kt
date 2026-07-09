package com.chesslab.engine

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

    /**
     * (occluded, shadow) square sets from absdiff vs the baseline reference.
     * Occlusion: mean absdiff > absThr. Shadow: mean pixel value decreased by more than
     * absThr/2 AND not already occluded. Both dilated by one orthogonal neighbour;
     * dilated shadow minus dilated occlusion (ports tracker.py:327).
     */
    fun baselineOcclusionAndShadow(
        curGray: GrayImage,
        refGray: GrayImage,
        geom: BoardGeometry,
        absThr: Double,
    ): Pair<Set<String>, Set<String>> {
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
        val occluded = mutableSetOf<String>()
        val shadow = mutableSetOf<String>()
        for ((idx, sq) in Squares.all.withIndex()) {
            if (occMeans[idx] > absThr) {
                occluded.add(sq)
            } else if (refMeans[idx] - curMeans[idx] > absThr / 2) {
                shadow.add(sq)
            }
        }
        val dilatedOcc = dilate(occluded)
        return dilatedOcc to (dilate(shadow) - dilatedOcc)
    }

    private fun dilate(squares: Set<String>): Set<String> {
        val out = squares.toMutableSet()
        for (sq in squares) out.addAll(Squares.neighbours.getValue(sq))
        return out
    }
}
