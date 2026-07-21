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
        // Memo-cached packed HSV per pixel (ColorSpace.packedHsv) — identical values to the
        // former per-pixel conversions, without their cost (device shadow stage, 2026-07-22).
        val ref = refBgr.data
        val cur = curBgr.data
        val mask = (1 shl ColorSpace.PACK_MID) - 1
        for (y in box.y0 until box.y1) {
            var i = (y * refBgr.width + box.x0) * CHANNELS
            repeat(box.x1 - box.x0) {
                val pr =
                    ColorSpace.packedHsv(
                        ref[i].toInt() and mask,
                        ref[i + 1].toInt() and mask,
                        ref[i + 2].toInt() and mask,
                    )
                val pc =
                    ColorSpace.packedHsv(
                        cur[i].toInt() and mask,
                        cur[i + 1].toInt() and mask,
                        cur[i + 2].toInt() and mask,
                    )
                val vr = (pr and mask).toDouble()
                val vc = (pc and mask).toDouble()
                val ratio = vc / (vr + V_EPS)
                var dh = kotlin.math.abs(((pc ushr ColorSpace.PACK_HI) - (pr ushr ColorSpace.PACK_HI)).toDouble())
                dh = minOf(dh, HUE_RANGE - dh)
                val ds = ((pc ushr ColorSpace.PACK_MID) and mask) - ((pr ushr ColorSpace.PACK_MID) and mask)
                if (ratio in V_LO..V_HI && dh <= H_TOL && ds <= S_TOL) shadowPx++
                total++
                dv += vc - vr
                i += CHANNELS
            }
        }
        return (if (total > 0) shadowPx.toDouble() / total else 0.0) to dv
    }
}
