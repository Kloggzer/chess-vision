package com.chesslab.tracker.geometry

// Internal value types and ported constants shared by the markerless board
// detector (BoardDetector) and its helpers. See calibration.py:656-786.

/** A Hough line in normal form (rho, theta). */
internal data class Line(
    val rho: Double,
    val theta: Double,
)

/** A line position along its family normal: (position, rho, theta). */
internal data class PosLine(
    val pos: Double,
    val rho: Double,
    val theta: Double,
)

/** A 2D point in working/frame pixels. */
internal data class V2(
    val x: Double,
    val y: Double,
)

/** Running average accumulator for merging near-identical lines. */
internal class MergeAcc(
    var pos: Double,
    var rho: Double,
    var theta: Double,
) {
    private var n = 1

    fun absorb(pl: PosLine) {
        pos = (pos * n + pl.pos) / (n + 1)
        rho = (rho * n + pl.rho) / (n + 1)
        theta = (theta * n + pl.theta) / (n + 1)
        n += 1
    }
}

// --- ported constants (see calibration.py:656-786) ---
internal const val WORK_WIDTH: Double = 960.0
internal const val GAUSS_KERNEL: Double = 5.0
internal const val CANNY_LO: Double = 40.0
internal const val CANNY_HI: Double = 120.0
internal const val HOUGH_RHO: Double = 1.0
internal const val HOUGH_THETA_STEPS: Double = 360.0
internal val HOUGH_THETA: Double = Math.PI / HOUGH_THETA_STEPS
internal const val THR_FRAC_0: Double = 0.30
internal const val THR_FRAC_1: Double = 0.24
internal const val THR_FRAC_2: Double = 0.19
internal const val MIN_RAW_LINES: Int = 12
internal const val MAX_LINES: Int = 250
internal const val MIN_FAMILY_LINES: Int = 6
internal const val MIN_ANGLE_DIFF_DEG: Double = 35.0
internal const val MERGE_TOL_MIN: Double = 3.0
internal const val MERGE_TOL_SPAN_DIV: Double = 40.0
internal const val GRID_MIN_SLOTS: Int = 6
internal const val GRID_LINES: Int = 9
internal const val LAST_SLOT: Int = 8
internal const val SPAN_S_LO_DIV: Double = 9.0
internal const val SPAN_S_HI_DIV: Double = 4.0
internal const val MIN_SPACING: Double = 2.0
internal const val SLOT_TOL_FRAC: Double = 0.15
internal const val BOUNDS_MARGIN: Double = 0.2
internal const val AREA_MIN_FRAC: Double = 0.05
internal const val DET_EPS: Double = 1e-9
internal const val KMEANS_ITERS: Int = 30
internal const val KMEANS_EPS: Double = 1e-3
internal const val KMEANS_ATTEMPTS: Int = 5
