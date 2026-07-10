package com.chesslab.tracker.geometry

import org.opencv.core.Mat

/**
 * Self-calibration helper: while the tracker is in preview-only mode, this runs
 * [ArucoCornerDetector] on incoming frames (throttled) and, once the four board
 * markers are found, produces a [CalibrationProfile] so tracking can start without
 * a manual corner-tap step. ArUco markers are the project's primary geometry source.
 */
class ArucoAutoCalibrator(
    private val detector: ArucoCornerDetector = ArucoCornerDetector(),
    private val intervalNs: Long = DEFAULT_INTERVAL_NS,
) {
    private var lastAttemptNs = 0L

    /**
     * Attempt detection on [frame] (a full-res BGR Mat, not released here). Returns a
     * white-POV [CalibrationProfile] anchored at [width]×[height] when the four markers
     * are found, or null when throttled or no board is visible.
     */
    fun tryDetect(
        frame: Mat,
        width: Int,
        height: Int,
        nowNs: Long,
        margin: Double,
    ): CalibrationProfile? {
        if (nowNs - lastAttemptNs < intervalNs) return null
        lastAttemptNs = nowNs
        return detector.detect(frame)?.let { corners ->
            CalibrationProfile(
                corners = corners,
                whitePov = true,
                sourceWidth = width,
                sourceHeight = height,
                margin = margin.toFloat(),
            )
        }
    }

    private companion object {
        const val DEFAULT_INTERVAL_NS = 500_000_000L // ~2 attempts/sec
    }
}
