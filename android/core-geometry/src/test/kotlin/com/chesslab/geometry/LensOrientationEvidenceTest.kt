package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import kotlin.math.cos
import kotlin.math.sin

/** `LensEvidence.axes` gates the whole lens fit (`BUDGET_NONE` below two). Both cases keep the
 *  budget at `BUDGET_NONE`, so `fitLens` returns before it undistorts and needs no OpenCV. */
class LensOrientationEvidenceTest {
    private val angle = Math.toRadians(-60.0)

    private fun toFrame(
        bx: Double,
        by: Double,
    ): Pair<Double, Double> = (cos(angle) * bx - sin(angle) * by + ORIGIN_X) to (sin(angle) * bx + cos(angle) * by + ORIGIN_Y)

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

    /** `gridSamples` reports raw frame pixels, so the board may lie at any angle; `orientationsIn`
     *  compared SIGNED differences where the question is about magnitudes. */
    @Test
    fun `a board lying sideways in the frame still shows two line families`() {
        val evidence = fitLens(rotatedBoardSamples(), WIDTH, HEIGHT).evidence
        assertEquals(2, evidence.axes, "a board rotated past 45 degrees must not lose its calibration")
    }

    /** `axes` counts USABLE lines; the empty case fell back to `all.isEmpty()` and reported one family. */
    @Test
    fun `no usable line means no measurable axis`() {
        // Drei Punkte je Linie liegen unter `MIN_BOW_POINTS`, also ist `bow` fuer jede null.
        val samples =
            (0..5).flatMap { line ->
                (0..2).map { step -> GridSample(axis = line % 2, line = line, x = 100.0 + step * STEP, y = 100.0 + line * STEP) }
            }

        val evidence = fitLens(samples, WIDTH, HEIGHT).evidence

        assertEquals(0, evidence.lines, "keine Linie ist messbar")
        assertEquals(0, evidence.axes, "null messbare Linien koennen keine messbare Achsenfamilie ergeben")
    }

    private companion object {
        const val ORIGIN_X = 600.0
        const val ORIGIN_Y = 400.0
        const val STEP = 100.0
        const val WIDTH = 1920
        const val HEIGHT = 1080
    }
}
