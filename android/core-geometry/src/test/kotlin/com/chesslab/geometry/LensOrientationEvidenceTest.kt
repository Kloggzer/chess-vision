package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import kotlin.math.cos
import kotlin.math.sin

/**
 * `LensEvidence.axes` gates the whole lens fit (`budget` is `BUDGET_NONE` below two), and how the
 * board lies in the FRAME is evidence about nothing: `gridSamples` reports raw frame pixels, so the
 * camera may hold it at any angle. Four lines keep the budget at `BUDGET_NONE` either way, so
 * `fitLens` returns before it undistorts anything and no native OpenCV is needed.
 */
class LensOrientationEvidenceTest {
    private val angle = Math.toRadians(-60.0)

    private fun toFrame(
        bx: Double,
        by: Double,
    ): Pair<Double, Double> =
        (cos(angle) * bx - sin(angle) * by + ORIGIN_X) to (sin(angle) * bx + cos(angle) * by + ORIGIN_Y)

    private fun rotatedBoardSamples(): List<GridSample> {
        val out = mutableListOf<GridSample>()
        for (line in 0..1) {
            for (step in 0..3) {
                val along = step * STEP
                val across = line * STEP
                val (vx, vy) = toFrame(across, along)
                out += GridSample(axis = 0, line = line, x = vx, y = vy)
                val (hx, hy) = toFrame(along, across)
                out += GridSample(axis = 1, line = line, x = hx, y = hy)
            }
        }
        return out
    }

    @Test
    fun `a board lying sideways in the frame still shows two line families`() {
        val evidence = fitLens(rotatedBoardSamples(), WIDTH, HEIGHT).evidence
        assertEquals(
            2,
            evidence.axes,
            "the samples carry both grid families (${evidence.lines} usable lines), but `orientationsIn` " +
                "compares SIGNED differences (`first.x - last.x < first.y - last.y`) where the question is " +
                "about MAGNITUDES. At -60 degrees both families answer that predicate alike, so the count " +
                "comes out 0 or all and the fit reports ONE axis - which makes `LensEvidence.budget` " +
                "BUDGET_NONE and refuses the lens outright. Every board rotated past 45 degrees in the " +
                "frame loses its calibration this way, silently.",
        )
    }

    private companion object {
        const val ORIGIN_X = 600.0
        const val ORIGIN_Y = 400.0
        const val STEP = 100.0
        const val WIDTH = 1920
        const val HEIGHT = 1080
    }
}
