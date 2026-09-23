package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import kotlin.math.abs

/** A grid distorted by a KNOWN k1: the rig can only say "the bow got smaller", which is what the
 *  fit optimises and therefore cannot be its own proof. */
@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class LensFitTest {
    @Test
    fun aStraightRunOfPointsHasNoBow() {
        val straight = (0..7).map { doubleArrayOf(100.0 + it * 50.0, 300.0) }
        assertEquals(0.0, bow(straight)!!, 1e-9)
    }

    @Test
    fun tooFewPointsIsUnjudgeableRatherThanPerfect() {
        // The trap this exists to prevent: two points are exactly collinear, so a bow of 0 would be
        // arithmetically true and would tell the fit that the least-observed line is its best one.
        assertNull(bow(listOf(doubleArrayOf(0.0, 0.0), doubleArrayOf(500.0, 0.0))))
        assertNull(bow(listOf(doubleArrayOf(0.0, 0.0), doubleArrayOf(1.0, 0.0), doubleArrayOf(2.0, 0.0))))
        // And a run of points too short to say anything about curvature is refused as well.
        assertNull(bow((0..5).map { doubleArrayOf(it * 2.0, 0.0) }))
    }

    @Test
    fun aKnownBarrelIsRecovered() {
        val fit = fitLens(distortedGrid(TRUE_K1, lines = 9), WIDTH, HEIGHT)
        assertNull(fit.rejected, "the full grid should be enough to fit")
        assertTrue(fit.ok, "bow ${fit.bowAfter} should beat ${fit.bowBefore}")
        assertTrue(
            abs(fit.k1 - TRUE_K1) < K1_TOLERANCE,
            "k1 ${fit.k1} should be near $TRUE_K1 (evidence ${fit.evidence})",
        )
    }

    @Test
    fun moreLinesFitBetter() {
        val errors =
            listOf(6, 9).map { lines ->
                val fit = fitLens(distortedGrid(TRUE_K1, lines), WIDTH, HEIGHT)
                assertNull(fit.rejected, "$lines lines should be fittable")
                abs(fit.k1 - TRUE_K1)
            }
        assertTrue(errors.last() <= errors.first() + SLACK, "more lines must not fit worse: $errors")
    }

    @Test
    fun tooLittleEvidenceIsRefusedRatherThanGuessed() {
        val fit = fitLens(distortedGrid(TRUE_K1, lines = 2), WIDTH, HEIGHT)
        assertNotNull(fit.rejected, "two lines per axis cannot carry a lens fit")
        assertEquals(0.0, fit.k1, "a refused fit must not report a distortion it did not measure")
    }

    @Test
    fun oneOrientationAloneIsRefused() {
        // A tilt and a lens both bow one family of lines; only the second family separates them.
        val vertical = distortedGrid(TRUE_K1, lines = 9).filter { it.axis == 0 }
        assertNotNull(fitLens(vertical, WIDTH, HEIGHT).rejected)
    }

    /** Forward through the Brown model on purpose: the fit inverts it, so the inverse here would
     *  test the generator against itself. */
    private fun distortedGrid(
        k1: Double,
        lines: Int,
    ): List<GridSample> {
        val cx = WIDTH / 2.0
        val cy = HEIGHT / 2.0
        val focal = WIDTH.toDouble()

        fun sample(
            axis: Int,
            line: Int,
            band: Int,
        ): GridSample {
            val along = MARGIN + (HEIGHT - 2 * MARGIN) * band / (BANDS - 1.0)
            val across = MARGIN + (WIDTH - 2 * MARGIN) * line / (lines - 1.0)
            val nx = ((if (axis == 0) across else along) - cx) / focal
            val ny = ((if (axis == 0) along else across) - cy) / focal
            val scale = 1 + k1 * (nx * nx + ny * ny)
            return GridSample(axis, line, cx + nx * scale * focal, cy + ny * scale * focal)
        }
        return (0..1).flatMap { axis ->
            (0 until lines).flatMap { line -> (0 until BANDS).map { band -> sample(axis, line, band) } }
        }
    }

    private companion object {
        const val WIDTH = 2560
        const val HEIGHT = 1440
        const val BANDS = 8
        const val MARGIN = 200.0
        const val TRUE_K1 = -0.18
        const val K1_TOLERANCE = 0.05
        const val SLACK = 0.01
    }
}
