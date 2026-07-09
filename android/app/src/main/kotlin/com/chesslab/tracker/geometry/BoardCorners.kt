package com.chesslab.tracker.geometry

import kotlinx.serialization.Serializable

/**
 * A single 2D image point in source-frame pixels.
 *
 * Plain value type (not `android.graphics.PointF`) so all geometry math stays
 * unit-testable on the desktop JVM without Robolectric (memory contract bans
 * instrumented/Robolectric tests).
 */
@Serializable
data class Point(
    val x: Float,
    val y: Float,
)

/**
 * The four board corners in image pixels.
 *
 * Corner order is the project-wide invariant **[a8, h8, h1, a1]**
 * (`calibration.py:71`). A wrong a8 assignment silently transposes every square
 * label (CLAUDE.md pitfall), so the calibration UI (phase 04) enforces the tap
 * order and this type stores the corners already ordered.
 */
@Serializable
data class BoardCorners(
    val a8: Point,
    val h8: Point,
    val h1: Point,
    val a1: Point,
) {
    /** Corners in the canonical [a8, h8, h1, a1] order. */
    fun toList(): List<Point> = listOf(a8, h8, h1, a1)

    companion object {
        /** Build from four ordered [a8, h8, h1, a1] points. */
        fun of(ordered: List<Point>): BoardCorners {
            require(ordered.size == CORNER_COUNT) { "need exactly $CORNER_COUNT corners" }
            return BoardCorners(ordered[0], ordered[1], ordered[2], ordered.last())
        }

        const val CORNER_COUNT: Int = 4
    }
}
