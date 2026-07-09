package com.chesslab.engine

import com.chesslab.engine.api.BgrImage

/**
 * Cast-shadow detection per Cucchiara in HSV (ports tracker.py:198 `hsv_shadow_squares`):
 * a square is "shadow" if its pixels, compared to the reference, keep the hue (circular),
 * are not more saturated, and are darker (V ratio in [V_LO, V_HI]). A hand shadow satisfies
 * this; a real piece does not (different color/structure). Thresholds are the live-tuned
 * Python defaults and intentionally not configurable.
 */
object ShadowVeto {
    private const val V_LO = 0.35
    private const val V_HI = 0.97
    private const val H_TOL = 15.0
    private const val S_TOL = 40.0
    private const val FRAC = 0.5
    private const val HUE_RANGE = 180.0
    private const val V_EPS = 1e-3

    /** Only `candidates` (already marked as changed) are checked. */
    fun shadowSquares(
        refBgr: BgrImage,
        curBgr: BgrImage,
        geom: BoardGeometry,
        candidates: Set<String>,
    ): Set<String> {
        val out = mutableSetOf<String>()
        for (sq in candidates) {
            val box = Squares.region(sq, geom)
            if (box.area <= 0) continue
            val (shadowFrac, dv) = boxStats(refBgr, curBgr, box)
            if (shadowFrac >= FRAC && dv < 0) out.add(sq)
        }
        return out
    }

    /** (fraction of shadow-classified pixels, sum of V decrease) over one box. */
    private fun boxStats(
        refBgr: BgrImage,
        curBgr: BgrImage,
        box: Box,
    ): Pair<Double, Double> {
        var shadowPx = 0
        var total = 0
        var dv = 0.0
        for (y in box.y0 until box.y1) {
            for (x in box.x0 until box.x1) {
                val i = (y * refBgr.width + x) * CHANNELS
                val hr = ColorSpace.bgrToHsv(refBgr.data[i].px(), refBgr.data[i + 1].px(), refBgr.data[i + 2].px())
                val hc = ColorSpace.bgrToHsv(curBgr.data[i].px(), curBgr.data[i + 1].px(), curBgr.data[i + 2].px())
                val ratio = hc[2] / (hr[2] + V_EPS)
                var dh = kotlin.math.abs(hc[0] - hr[0])
                dh = minOf(dh, HUE_RANGE - dh)
                val ds = hc[1] - hr[1]
                if (ratio in V_LO..V_HI && dh <= H_TOL && ds <= S_TOL) shadowPx++
                total++
                dv += hc[2] - hr[2]
            }
        }
        return (if (total > 0) shadowPx.toDouble() / total else 0.0) to dv
    }
}
