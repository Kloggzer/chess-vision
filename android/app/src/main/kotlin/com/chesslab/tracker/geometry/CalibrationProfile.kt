package com.chesslab.tracker.geometry

import kotlinx.serialization.Serializable

/**
 * Geometry configuration for one fixed top-mounted camera.
 *
 * Mirrors the Python `CalibrationProfile` (`calibration.py:65-84`) minus the
 * ArUco/marker fields, which are dropped by decision (manual 4-corner tap
 * calibration is the primary geometry source on Android). Not a stored
 * position: only board geometry and the resolution the corners were tapped at.
 *
 * `boardSize` is 1024 (not the desktop's 1600) for the phone CPU budget;
 * detection runs at `BoardWarper.DETECT_SCALE` (0.5) so the effective detect
 * resolution is 512 (32 px/square) — do not change (see phase 02 spec).
 */
@Serializable
data class CalibrationProfile(
    val corners: BoardCorners,
    val whitePov: Boolean,
    val boardSize: Int = DEFAULT_BOARD_SIZE,
    // Resolution (in pixels) at which `corners` were tapped.
    val sourceWidth: Int,
    val sourceHeight: Int,
) {
    /**
     * Return a copy with the corners rescaled to a new capture resolution.
     *
     * Used when the dynamic-resolution logic (phase 03) switches capture size:
     * corner coordinates scale linearly with the axis scale factors and the
     * stored source resolution is updated to match.
     */
    fun forResolution(
        width: Int,
        height: Int,
    ): CalibrationProfile {
        val sx = width.toFloat() / sourceWidth.toFloat()
        val sy = height.toFloat() / sourceHeight.toFloat()

        fun scale(p: Point) = Point(p.x * sx, p.y * sy)
        return copy(
            corners =
                BoardCorners(
                    a8 = scale(corners.a8),
                    h8 = scale(corners.h8),
                    h1 = scale(corners.h1),
                    a1 = scale(corners.a1),
                ),
            sourceWidth = width,
            sourceHeight = height,
        )
    }

    companion object {
        const val DEFAULT_BOARD_SIZE: Int = 1024
    }
}
