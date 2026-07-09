package com.chesslab.tracker.geometry

import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.TermCriteria
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

/**
 * The two outer lines (slots 0 and 8) of one family: a real line near the
 * slot if present, otherwise an extrapolated line at the family angle.
 */
internal fun familyBorders(family: List<Line>): List<Line>? {
    val (ref, posLines) = familyPositions(family)
    val positions = posLines.map { it.pos }
    val span = positions.max() - positions.min()
    val merged = mergePositions(posLines, maxOf(MERGE_TOL_MIN, span / MERGE_TOL_SPAN_DIV))
    val prog = BoardDetector.gridProgression(merged.map { it.pos }) ?: return null
    val (base, s) = prog
    return intArrayOf(0, LAST_SLOT).map { slot ->
        val target = base + slot * s
        val near = merged.minBy { abs(it.pos - target) }
        if (abs(near.pos - target) <= s * SLOT_TOL_FRAC) Line(near.rho, near.theta) else Line(target, ref)
    }
}

/** k-means split into two angle families (on the doubled angle). Ports `_cluster_two_angle_families`. */
internal fun clusterTwoAngleFamilies(lines: List<Line>): Pair<List<Line>, List<Line>> {
    val data = Mat(lines.size, 2, CvType.CV_32F)
    lines.forEachIndexed { i, l ->
        data.put(i, 0, floatArrayOf(cos(2 * l.theta).toFloat(), sin(2 * l.theta).toFloat()))
    }
    val labels = Mat()
    val criteria = TermCriteria(TermCriteria.EPS + TermCriteria.MAX_ITER, KMEANS_ITERS, KMEANS_EPS)
    Core.kmeans(data, 2, labels, criteria, KMEANS_ATTEMPTS, Core.KMEANS_PP_CENTERS)
    val fam0 = ArrayList<Line>()
    val fam1 = ArrayList<Line>()
    lines.forEachIndexed { i, l -> if (labels.get(i, 0)[0].toInt() == 0) fam0.add(l) else fam1.add(l) }
    return fam0 to fam1
}

/** Mean family angle + each line's 1D position along the family normal. Ports `_family_positions`. */
internal fun familyPositions(family: List<Line>): Pair<Double, List<PosLine>> {
    val ref = refAngle(family)
    val out =
        family.map { l ->
            val d = normPi(l.theta - ref + Math.PI / 2) - Math.PI / 2
            val rr = if (abs(d) <= Math.PI / 2) l.rho else -l.rho
            PosLine(rr, l.rho, l.theta)
        }
    return ref to out
}

/** Mean direction of a family (via the doubled angle). */
internal fun refAngle(family: List<Line>): Double {
    val s = family.sumOf { sin(2 * it.theta) }
    val c = family.sumOf { cos(2 * it.theta) }
    return normPi(atan2(s, c) / 2.0)
}

/** Merge near-identical lines (same board line hit multiple times) by averaging. Ports `_merge_positions`. */
internal fun mergePositions(
    posLines: List<PosLine>,
    tol: Double,
): List<PosLine> {
    val merged = ArrayList<MergeAcc>()
    for (pl in posLines.sortedBy { it.pos }) {
        val last = merged.lastOrNull()
        if (last != null && abs(pl.pos - last.pos) <= tol) {
            last.absorb(pl)
        } else {
            merged.add(MergeAcc(pl.pos, pl.rho, pl.theta))
        }
    }
    return merged.map { PosLine(it.pos, it.rho, it.theta) }
}

/** Wrap an angle to [0, pi). */
internal fun normPi(a: Double): Double {
    val m = a % Math.PI
    return if (m < 0) m + Math.PI else m
}
