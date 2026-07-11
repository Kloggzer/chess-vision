package com.chesslab.tracker.geometry

import kotlin.math.abs

/**
 * Dead-zone, EMA, and confirmed-jump filtering for live ArUco board corners.
 * This is the Android counterpart of the desktop MarkerTracker: raw marker
 * sub-pixel jitter must not move the homography relative to its reference image.
 */
class ArucoCornerSmoother(
    private val moveThreshold: Float = DEFAULT_MOVE_THRESHOLD,
    private val smoothAlpha: Float = DEFAULT_SMOOTH_ALPHA,
    private val jumpRejectPx: Float = DEFAULT_JUMP_REJECT_PX,
    private val jumpConfirmFrames: Int = DEFAULT_JUMP_CONFIRM_FRAMES,
) {
    private var positions: MutableList<Point>? = null
    private val pending = arrayOfNulls<Point>(BoardCorners.CORNER_COUNT)
    private val pendingCounts = IntArray(BoardCorners.CORNER_COUNT)

    fun reset(corners: BoardCorners? = null) {
        positions = corners?.toList()?.toMutableList()
        pending.fill(null)
        pendingCounts.fill(0)
    }

    fun update(detected: BoardCorners): BoardCorners {
        val found = detected.toList()
        val current = positions ?: return detected.also { reset(it) }
        for (i in current.indices) current[i] = updatePoint(i, current[i], found[i])
        return BoardCorners.of(current)
    }

    private fun updatePoint(
        index: Int,
        previous: Point,
        detected: Point,
    ): Point {
        val distance = l1(previous, detected)
        val accepted = distance > moveThreshold && (distance <= jumpRejectPx || jumpConfirmed(index, detected))
        return if (accepted) {
            clearPending(index)
            Point(
                previous.x + smoothAlpha * (detected.x - previous.x),
                previous.y + smoothAlpha * (detected.y - previous.y),
            )
        } else {
            if (distance <= moveThreshold) clearPending(index)
            previous
        }
    }

    private fun jumpConfirmed(
        index: Int,
        detected: Point,
    ): Boolean {
        val candidate = pending[index]
        pendingCounts[index] =
            if (candidate != null && l1(candidate, detected) <= jumpRejectPx) pendingCounts[index] + 1 else 1
        pending[index] = detected
        return pendingCounts[index] >= jumpConfirmFrames
    }

    private fun clearPending(index: Int) {
        pending[index] = null
        pendingCounts[index] = 0
    }

    private fun l1(
        first: Point,
        second: Point,
    ): Float = abs(first.x - second.x) + abs(first.y - second.y)

    companion object {
        const val DEFAULT_MOVE_THRESHOLD = 4f
        const val DEFAULT_SMOOTH_ALPHA = 0.35f
        const val DEFAULT_JUMP_REJECT_PX = 60f
        const val DEFAULT_JUMP_CONFIRM_FRAMES = 2
    }
}
