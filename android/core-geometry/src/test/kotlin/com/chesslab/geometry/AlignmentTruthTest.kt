package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import java.util.Random
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.sin
import kotlin.math.tan

/**
 * Alignment on a synthetic board whose true geometry is known exactly.
 *
 * The board is rendered rectified and then displaced by a chosen transform, so "where the grid
 * really is" is not an estimate here — it is the matrix the frame was built from.
 *
 * **Everything on the truth side of these assertions is computed independently of the code under
 * test.** The 3x3 helpers below duplicate `Alignment.kt`'s; that duplication is the point. A truth
 * test that borrows the implementation's own arithmetic can only prove self-consistency, and
 * self-consistency is precisely what the tilt-blind version had: it reported 0.01 px for a 3.05 px
 * shear, passed every directional test ("the shear is visible"), and certified 302 frames whose
 * grid the eye can see is wrong.
 *
 * Mirrors `tests/test_alignment.py`, including the bars: half a pixel on the bare board, one pixel
 * once pieces sit on the grooves and genuinely drag their centroids.
 */
@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class AlignmentTruthTest {
    // --- the frame the board is seen through ---------------------------------------------------

    private fun geometry() = BoardGeometry(boardSize = BS, margin = margins4(0.0))

    /**
     * A rectified board with a [BORDER] px surround: alternating squares, a dark groove on every
     * cell boundary, and the same groove on the playing-field boundary itself.
     *
     * The border is not decoration. Since 2026-08-03 `gridLines` MEASURES the two outer lines per
     * axis instead of pinning them at 0 and `boardSize`, and a fixture without a surround would
     * exercise a path no real frame takes — as well as making
     * [aUniformScaleIsReportedAtItsTrueSize] impossible, which is the test that used to assert the
     * blind spot instead of closing it.
     */
    private fun board(): Mat {
        val n = BS + 2 * BORDER
        val img = Mat(n, n, CvType.CV_8UC3, Scalar(SURROUND, SURROUND, SURROUND))
        img.submat(BORDER, BORDER + BS, BORDER, BORDER + BS).setTo(Scalar(LIGHT, LIGHT, LIGHT))
        for (f in 0 until 8) {
            for (r in 0 until 8) {
                if ((f + r) % 2 != 0) continue
                val x = BORDER + (f * CELL).toInt()
                val y = BORDER + (r * CELL).toInt()
                img.submat(y, y + CELL.toInt(), x, x + CELL.toInt()).setTo(Scalar(DARK, DARK, DARK))
            }
        }
        for (k in 0..8) {
            val p = BORDER + Math.round(k * CELL).toInt()
            img.rowRange(p - GROOVE, p + GROOVE + 1).setTo(Scalar(GROOVE_V, GROOVE_V, GROOVE_V))
            img.colRange(p - GROOVE, p + GROOVE + 1).setTo(Scalar(GROOVE_V, GROOVE_V, GROOVE_V))
        }
        Imgproc.GaussianBlur(img, img, Size(0.0, 0.0), 1.0)
        return img
    }

    /**
     * The padded board displaced by [m], which keeps meaning what it means in RECTIFIED
     * coordinates — the transform is conjugated by the pad shift, which is what `trueWorst`
     * computes against.
     */
    private fun displaced(m: DoubleArray): Mat {
        val n = BS + 2 * BORDER
        val out = Mat()
        val mat = mat3(mul3(mul3(padShift(BORDER), m), padShift(-BORDER)))
        Imgproc.warpPerspective(
            board(),
            out,
            mat,
            Size(n.toDouble(), n.toDouble()),
            Imgproc.INTER_LINEAR,
            Core.BORDER_REPLICATE,
            Scalar(0.0),
        )
        mat.release()
        return out
    }

    private fun padShift(px: Int) = doubleArrayOf(1.0, 0.0, px.toDouble(), 0.0, 1.0, px.toDouble(), 0.0, 0.0, 1.0)

    /** The synthetic board, border and all, seen through [quad] in a camera frame. */
    private fun frame(quad: List<DoubleArray> = TRUTH): Mat {
        val h = homography(quad)
        val inv = inv3(h)!!
        val out = Mat()
        val mat = mat3(mul3(inv, padShift(-BORDER)))
        Imgproc.warpPerspective(board(), out, mat, Size(FRAME_W.toDouble(), FRAME_H.toDouble()))
        mat.release()
        return out
    }

    /** The quad whose warp shows the board displaced by the rectified-space transform [m]. */
    private fun bend(
        quad: List<DoubleArray>,
        m: DoubleArray,
    ): List<DoubleArray> {
        val h = homography(quad)
        val t = mul3(mul3(inv3(h)!!, inv3(m)!!), h)
        return quad.map { p ->
            val x = t[0] * p[0] + t[1] * p[1] + t[2]
            val y = t[3] * p[0] + t[4] * p[1] + t[5]
            val w = t[6] * p[0] + t[7] * p[1] + t[8]
            doubleArrayOf(x / w, y / w)
        }
    }

    private fun homography(quad: List<DoubleArray>): DoubleArray {
        val h = computeHomography(quad, BS, margins4(0.0))
        val out = DoubleArray(9)
        h.get(0, 0, out)
        h.release()
        return out
    }

    // --- what the metric OWES, from geometry alone ---------------------------------------------

    /** Where the image of nominal line [k] of [axis] under [h] crosses [coord] on the other axis. */
    private fun lineAt(
        h: DoubleArray,
        k: Int,
        axis: Int,
        coord: Double,
    ): Double {
        val a = if (axis == 0) doubleArrayOf(k * CELL, 0.0) else doubleArrayOf(0.0, k * CELL)
        val b = if (axis == 0) doubleArrayOf(k * CELL, BS.toDouble()) else doubleArrayOf(BS.toDouble(), k * CELL)
        val (x0, y0) = project(h, a)
        val (x1, y1) = project(h, b)
        return if (axis == 0) {
            if (abs(y1 - y0) > 1e-9) x0 + (x1 - x0) * (coord - y0) / (y1 - y0) else x0
        } else {
            if (abs(x1 - x0) > 1e-9) y0 + (y1 - y0) * (coord - x0) / (x1 - x0) else y0
        }
    }

    /**
     * What `squareOffsets` owes for a board displaced by [h].
     *
     * Mirrors the metric's own DEFINITION — the largest displacement of any square edge, evaluated
     * where that edge passes the square — while sharing none of its code. That is what makes this a
     * calibration rather than a restatement.
     */
    private fun trueWorst(h: DoubleArray): Double {
        var worst = 0.0
        for (f in 0 until 8) {
            for (r in 0 until 8) {
                val cy = (7.5 - r) * CELL
                val cx = (f + 0.5) * CELL
                val edges =
                    doubleArrayOf(
                        lineAt(h, f, 0, cy),
                        lineAt(h, f + 1, 0, cy),
                        lineAt(h, 7 - r, 1, cx),
                        lineAt(h, 8 - r, 1, cx),
                    )
                val want = doubleArrayOf(f * CELL, (f + 1) * CELL, (7 - r) * CELL, (8 - r) * CELL)
                for (i in edges.indices) worst = max(worst, abs(edges[i] - want[i]))
            }
        }
        return worst
    }

    /** Dark discs centred on cells. They overlap the grooves, which is the whole difficulty. */
    private fun withPieces(img: Mat): Mat {
        val out = img.clone()
        val cells = listOf(0 to 0, 1 to 0, 3 to 1, 5 to 0, 7 to 1, 2 to 6, 4 to 7, 6 to 6, 3 to 3, 4 to 4)
        for ((f, r) in cells) {
            Imgproc.circle(
                out,
                Point(
                    (BORDER + ((f + 0.5) * CELL).toInt()).toDouble(),
                    (BORDER + ((r + 0.5) * CELL).toInt()).toDouble(),
                ),
                (CELL * 0.46).toInt(),
                Scalar(PIECE, PIECE, PIECE),
                -1,
            )
        }
        Imgproc.GaussianBlur(out, out, Size(0.0, 0.0), 1.2)
        val rng = Random(42)
        val buf = ByteArray(out.rows() * out.cols() * out.channels())
        out.get(0, 0, buf)
        for (i in buf.indices) {
            val v = (buf[i].toInt() and 0xFF) + rng.nextGaussian() * NOISE_SIGMA
            buf[i] = v.coerceIn(0.0, 255.0).toInt().toByte()
        }
        out.put(0, 0, buf)
        return out
    }

    // --- the measurement -----------------------------------------------------------------------

    /** The whole point of the padded warp: index 0 and 8 are MEASURED, not put there. */
    @Test
    fun gridLinesMeasuresAllEighteenIncludingTheOuterOnes() {
        val grid = gridLines(board(), BS, pad = BORDER)
        assertEquals(0, grid.unread)
        for (axis in 0..1) {
            for (k in 0..8) {
                val line = grid.at(axis, k)!!
                assertTrue(
                    abs(line.offset - (BORDER + k * CELL)) < 0.6,
                    "axis $axis line $k at ${line.offset}, expected ${BORDER + k * CELL}",
                )
                assertTrue(abs(line.slope) < 0.004, "axis $axis line $k tilted ${line.slope}")
            }
        }
    }

    /** No surrounding board, no window to search in — reported missing, never assumed. */
    @Test
    fun gridLinesRefusesTheOuterOnesWithoutAPad() {
        val full = board()
        val inner = full.submat(BORDER, BORDER + BS, BORDER, BORDER + BS)
        val grid = gridLines(inner, BS)
        full.release()
        assertNull(grid.at(0, 0))
        assertNull(grid.at(0, 8))
        assertNull(grid.at(1, 0))
        assertNull(grid.at(1, 8))
        for (k in 1..7) {
            assertNotNull(grid.at(0, k))
            assertNotNull(grid.at(1, k))
        }
    }

    @Test
    fun offsetsAreNearZeroOnTheTruthBoard() {
        val result = squareOffsets(board(), BS, BORDER)
        assertEquals(0, result.unread)
        assertEquals(64, result.offsets.size)
        assertTrue(result.worst < 1.5, "truth board reads ${result.worst}")
    }

    /**
     * The calibration: the reported number against the analytic one, over the three families of
     * error that behave differently.
     *
     * A directional test passes for a metric that reports a third of the error, which is exactly
     * what the whole-board collapse did — exact on a translation, silent on rotation and shear. A
     * number that is right for one family and blind to another is worse than no number, because it
     * reads as a verdict.
     */
    @Test
    fun theReportedNumberIsTheTrueNumber() {
        val cases =
            listOf(
                "shift 2 px" to shift(2.0, 0.0),
                "shift 10 px" to shift(10.0, 0.0),
                "rotation 0.10 deg" to rot(0.10),
                "rotation 0.50 deg" to rot(0.50),
                "rotation 1.00 deg" to rot(1.00),
                "shear 0.25 deg" to shear(0.25),
                "shear 0.50 deg" to shear(0.50),
                "scale 1.005" to scale(1.005),
                "scale 0.990" to scale(0.990),
                "perspective x" to persp(0.010, 0.0),
                "perspective xy" to persp(0.006, -0.008),
            )
        for ((name, m) in cases) {
            val bare = displaced(m)
            val truth = trueWorst(m)
            val reported = squareOffsets(bare, BS, BORDER).worst
            assertTrue(
                abs(reported - truth) < 0.5,
                "$name: reported $reported, truth $truth (bare board, bar 0.5 px)",
            )
            val cluttered = withPieces(bare)
            val withPiecesReported = squareOffsets(cluttered, BS, BORDER).worst
            assertTrue(
                abs(withPiecesReported - truth) < 1.0,
                "$name: reported $withPiecesReported, truth $truth (pieces on the grooves, bar 1.0 px)",
            )
            bare.release()
            cluttered.release()
        }
    }

    /**
     * The blind spot that used to be recorded here as structural, closed by measuring the edges.
     *
     * `linePositions` pinned index 0 and 8 at 0 and `boardSize` because the warp puts them there by
     * construction. A scale error is largest at exactly those outer edges, so the metric saw only
     * what was left at the innermost measurable lines and reported three quarters of it — this test
     * asserted `0.75 * truth` and passed. `gridLines` looks for those lines in a padded warp.
     */
    @Test
    fun aUniformScaleIsReportedAtItsTrueSize() {
        val m = scale(1.005)
        val img = displaced(m)
        val reported = squareOffsets(img, BS, BORDER).worst
        img.release()
        assertTrue(trueWorst(m) > 1.9, "the fixture must carry a real error, not a rounding one")
        assertTrue(abs(reported - trueWorst(m)) < 0.5, "reported $reported against ${trueWorst(m)}")
    }

    @Test
    fun gridLinesReportsTheTilt() {
        val geom = geometry()
        val f = frame()
        val (warped, pad) = warpForGrid(f, geom, bend(TRUTH, shear(0.7)))
        val grid = gridLines(warped, BS, pad)
        warped.release()
        f.release()
        val expected = tan(Math.toRadians(0.7))
        val slope = grid.at(0, 1)!!.slope
        assertTrue(abs(abs(slope) - expected) < 0.004, "slope $slope against $expected")
    }

    /** The verdict: absolute, and a FAILURE when a line could not be found. */
    @Test
    fun theVerdictPassesTheTruthAndFailsABentQuad() {
        val geom = geometry()
        val f = frame()
        val good = alignmentOf(f, TRUTH, geom)
        assertTrue(good.ok, "the truth quad read ${good.worst} / ${good.reason}")
        assertEquals(0, good.unread)
        val bad = alignmentOf(f, bend(TRUTH, shift(9.0, 0.0)), geom)
        f.release()
        assertTrue(!bad.ok && bad.worst > bad.limit, "a 9 px shift read ${bad.worst}")
    }

    @Test
    fun theVerdictFailsWhenALineCouldNotBeFound() {
        val geom = geometry()
        val blank = Mat(FRAME_H, FRAME_W, CvType.CV_8UC3, Scalar(128.0, 128.0, 128.0))
        val verdict = alignmentOf(blank, TRUTH, geom)
        blank.release()
        assertTrue(!verdict.ok, "a featureless frame must never pass")
    }

    /**
     * A CONSISTENTLY wrong quad must fail. The script path's `quadSpread` scored exactly this case
     * at p90 0.93 px, because every frame carries the same displacement and they all agree with
     * each other. The verdict is not a measure of agreement.
     */
    @Test
    fun theVerdictIsAbsoluteNotASpreadAboutItsOwnMedian() {
        val geom = geometry()
        val bent = bend(TRUTH, shift(9.0, 0.0))
        repeat(3) {
            val f = frame()
            assertTrue(!alignmentOf(f, bent, geom).ok)
            f.release()
        }
    }

    // --- through a camera frame ----------------------------------------------------------------

    @Test
    fun aShiftIsReportedAtItsTrueSizeThroughTheFrame() {
        val geom = geometry()
        val f = frame()
        assertTrue(worstOffset(f, TRUTH, geom) < 1.5, "the truth quad must read quiet")
        val loud = worstOffset(f, bend(TRUTH, shift(7.0, 0.0)), geom)
        f.release()
        assertTrue(loud in 5.5..8.5, "a 7 px shift read as $loud")
    }

    /** The whole point of measuring band by band: a collapsed profile cannot see this. */
    @Test
    fun aShearIsVisibleAtAll() {
        val geom = geometry()
        val f = frame()
        val quiet = worstOffset(f, TRUTH, geom)
        val loud = worstOffset(f, bend(TRUTH, shear(0.7)), geom)
        f.release()
        assertTrue(loud - quiet > 2.5, "shear moved the number only from $quiet to $loud")
    }

    // --- the correction ------------------------------------------------------------------------

    @Test
    fun correctQuadWalksABentQuadBack() {
        val geom = geometry()
        val f = frame()
        val cases =
            listOf(
                "shift" to shift(6.0, -4.0),
                "shear" to shear(0.6),
                "both" to mul3(shift(5.0, 5.0), shear(-0.5)),
                "perspective" to persp(0.012, 0.004),
                "perspective and shift" to mul3(persp(-0.010, 0.010), shift(4.0, -3.0)),
            )
        for ((name, m) in cases) {
            val bent = bend(TRUTH, m)
            assertTrue(worstOffset(f, bent, geom) > 3.0, "$name: the bent quad must be out of tolerance")
            val fixed = correctQuad(f, bent, geom)
            assertNotNull(fixed, "$name: the fit gave up on a measurable frame")
            assertTrue(worstOffset(f, fixed!!, geom) < 1.5, "$name: still off by ${worstOffset(f, fixed, geom)}")
            val drift = fixed.indices.maxOf { i -> max(abs(fixed[i][0] - TRUTH[i][0]), abs(fixed[i][1] - TRUTH[i][1])) }
            assertTrue(drift < 3.0, "$name: corners landed $drift px from the truth quad")
        }
        f.release()
    }

    /** The contract the callers rely on: write the result unconditionally, stay safe. */
    @Test
    fun improveQuadNeverHandsBackAWorseQuad() {
        val geom = geometry()
        val f = frame()
        val result = improveQuad(f, TRUTH, geom)
        f.release()
        assertTrue(result.before < 1.5, "the truth quad read ${result.before}")
        val quad = result.quad ?: return
        assertTrue(result.after < result.before, "kept a quad that did not improve")
        val drift = quad.indices.maxOf { i -> max(abs(quad[i][0] - TRUTH[i][0]), abs(quad[i][1] - TRUTH[i][1])) }
        assertTrue(drift < 1.0, "an already-correct quad was moved $drift px")
    }

    /**
     * The correction has to SURVIVE live alignment, which is what makes the refinement more than
     * decoration.
     *
     * `boardCornersForFrame` re-derives the quad from the ArUco markers every three frames and
     * knows nothing about grooves, so a refined quad written into the pipeline is overwritten
     * within ~0.2 s. Re-measuring at that cadence is not affordable; re-applying is four points
     * through a 3x3. This asserts the cheap path reproduces the expensive one.
     */
    @Test
    fun theCorrectionReappliedReproducesTheRefinement() {
        val geom = geometry()
        val f = frame()
        val bent = bend(TRUTH, shear(0.6))
        val refinedQuad = correctQuad(f, bent, geom)!!
        val correction = gridCorrection(bent, refinedQuad, geom)
        assertNotNull(correction, "the two quads must define a usable correction")

        val reapplied = applyGridCorrection(correction!!, bent, geom)
        assertNotNull(reapplied)
        val drift =
            reapplied!!.indices.maxOf { i ->
                max(abs(reapplied[i][0] - refinedQuad[i][0]), abs(reapplied[i][1] - refinedQuad[i][1]))
            }
        assertTrue(drift < 0.01, "re-applying the correction landed $drift px away from the refinement")
        f.release()
    }

    /**
     * And it has to hold on a quad the correction was NOT measured on — that is the live case: the
     * markers move a little between aligns, and the grid residual is a property of the board and
     * the lens, not of where the quad currently sits.
     */
    @Test
    fun theCorrectionTransfersToAQuadItWasNotMeasuredOn() {
        val geom = geometry()
        val f = frame()
        val bent = bend(TRUTH, shear(0.6))
        val correction = gridCorrection(bent, correctQuad(f, bent, geom)!!, geom)!!

        // The same board seen through a quad nudged the way a marker re-detection nudges it.
        val nudged = bent.map { doubleArrayOf(it[0] + 1.5, it[1] - 1.0) }
        val corrected = applyGridCorrection(correction, nudged, geom)
        assertNotNull(corrected)
        assertTrue(
            worstOffset(f, corrected!!, geom) < worstOffset(f, nudged, geom),
            "the carried correction made a fresh quad worse, not better",
        )
        f.release()
    }

    @Test
    fun correctQuadGivesUpOnABlankFrame() {
        val geom = geometry()
        val blank = Mat(FRAME_H, FRAME_W, CvType.CV_8UC3, Scalar(128.0, 128.0, 128.0))
        assertNull(correctQuad(blank, TRUTH, geom), "a featureless frame must not yield a fit")
        assertNull(improveQuad(blank, TRUTH, geom).quad)
        blank.release()
    }

    // --- test-local 3x3 arithmetic, deliberately not the production one ------------------------

    private fun shift(
        dx: Double,
        dy: Double,
    ) = doubleArrayOf(1.0, 0.0, dx, 0.0, 1.0, dy, 0.0, 0.0, 1.0)

    private fun shear(deg: Double): DoubleArray {
        val t = tan(Math.toRadians(deg))
        return centred(doubleArrayOf(1.0, t, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0))
    }

    private fun rot(deg: Double): DoubleArray {
        val t = Math.toRadians(deg)
        return centred(doubleArrayOf(cos(t), -sin(t), 0.0, sin(t), cos(t), 0.0, 0.0, 0.0, 1.0))
    }

    private fun scale(s: Double) = centred(doubleArrayOf(s, 0.0, 0.0, 0.0, s, 0.0, 0.0, 0.0, 1.0))

    /**
     * A pure PROJECTIVE displacement — the family an affine correction cannot remove.
     *
     * A three-marker quad is `getAffineTransform`'s parallelogram standing in for a perspective
     * view of a plane, so this is the shape of its error and the reason `ProjectiveFit.kt` replaced
     * the affine one.
     */
    private fun persp(
        kx: Double,
        ky: Double,
    ): DoubleArray {
        val c = BS / 2.0
        val k = 1.0 + (kx + ky) / 2.0
        val m = doubleArrayOf(1.0, 0.0, c - k * c, 0.0, 1.0, c - k * c, kx / BS, ky / BS, 1.0)
        return DoubleArray(9) { m[it] / m[8] }
    }

    /** The same linear part, about the board's centre instead of its origin. */
    private fun centred(m: DoubleArray): DoubleArray {
        val c = BS / 2.0
        val out = m.copyOf()
        out[2] = c - (m[0] * c + m[1] * c)
        out[5] = c - (m[3] * c + m[4] * c)
        return out
    }

    private fun mul3(
        a: DoubleArray,
        b: DoubleArray,
    ): DoubleArray {
        val out = DoubleArray(9)
        for (r in 0 until 3) {
            for (c in 0 until 3) {
                var s = 0.0
                for (k in 0 until 3) s += a[r * 3 + k] * b[k * 3 + c]
                out[r * 3 + c] = s
            }
        }
        return out
    }

    private fun inv3(m: DoubleArray): DoubleArray? {
        val mat = mat3(m)
        val out = Mat()
        val ok = Core.invert(mat, out) != 0.0
        val flat = DoubleArray(9)
        if (ok) out.get(0, 0, flat)
        mat.release()
        out.release()
        return if (ok) flat else null
    }

    @Suppress("SpreadOperator")
    private fun mat3(m: DoubleArray): Mat {
        val mat = Mat(3, 3, CvType.CV_64F)
        mat.put(0, 0, *m)
        return mat
    }

    private fun project(
        h: DoubleArray,
        p: DoubleArray,
    ): Pair<Double, Double> {
        val x = h[0] * p[0] + h[1] * p[1] + h[2]
        val y = h[3] * p[0] + h[4] * p[1] + h[5]
        val w = h[6] * p[0] + h[7] * p[1] + h[8]
        return (x / w) to (y / w)
    }

    private companion object {
        const val BS = 800
        const val CELL = BS / 8.0
        const val FRAME_W = 1400
        const val FRAME_H = 1200
        const val LIGHT = 205.0
        const val DARK = 70.0
        const val SURROUND = 175.0

        /** Cells of board rendered outside the playing field, wider than `GRID_PAD_CELLS`. */
        val BORDER = (0.8 * CELL).toInt()
        const val GROOVE_V = 20.0
        const val PIECE = 35.0

        /** Half-width of a drawn groove: 2 mm on the reference board is ~5.5 px of a 100 px cell. */
        const val GROOVE = 2

        const val NOISE_SIGMA = 4.0

        /** a8, h8, h1, a1 — deliberately not a rectangle, so the frame carries real perspective. */
        val TRUTH: List<DoubleArray> =
            listOf(
                doubleArrayOf(240.0, 180.0),
                doubleArrayOf(1180.0, 200.0),
                doubleArrayOf(1150.0, 1060.0),
                doubleArrayOf(210.0, 1020.0),
            )
    }
}
