package com.chesslab.tracker.geometry

import org.opencv.core.Mat
import kotlin.math.hypot
import kotlin.math.max

/** Outcome of a [CornerDriftMonitor] check. */
sealed interface DriftResult {
    /** Detected corners are within the jump threshold of the reference. */
    data object Ok : DriftResult

    /** Corners moved beyond the threshold; carries the freshly detected corners. */
    data class Drifted(
        val corners: BoardCorners,
    ) : DriftResult

    /** No consistent grid was detected this frame. */
    data object Undetected : DriftResult
}

/**
 * EXPERIMENTAL: periodically re-runs [BoardDetector] and flags when the board
 * corners have drifted from the calibrated [reference] by more than
 * [cornerJumpPx] pixels (Python corner-jump guard, `tracker.py:1696`).
 *
 * Not wired into anything here — phase 04 drives it behind the experimental toggle.
 */
class CornerDriftMonitor(
    private val reference: BoardCorners,
    private val cornerJumpPx: Double = DEFAULT_CORNER_JUMP_PX,
) {
    /** Run the detector on [frame] (using the reference as prior) and classify the result. */
    fun check(frame: Mat): DriftResult = evaluate(BoardDetector.detect(frame, reference))

    /** Pure classification of a detection result — unit-testable without OpenCV. */
    internal fun evaluate(detected: BoardCorners?): DriftResult {
        if (detected == null) return DriftResult.Undetected
        return if (maxCornerShift(reference, detected) > cornerJumpPx) {
            DriftResult.Drifted(detected)
        } else {
            DriftResult.Ok
        }
    }

    companion object {
        const val DEFAULT_CORNER_JUMP_PX: Double = 6.0

        /** Largest per-corner Euclidean displacement between two corner sets (same order). */
        internal fun maxCornerShift(
            a: BoardCorners,
            b: BoardCorners,
        ): Double {
            var m = 0.0
            for ((pa, pb) in a.toList().zip(b.toList())) {
                m = max(m, hypot((pa.x - pb.x).toDouble(), (pa.y - pb.y).toDouble()))
            }
            return m
        }
    }
}
