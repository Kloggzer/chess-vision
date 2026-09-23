package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.parity.ParityCensusCrop
import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.ParityFrame
import com.chesslab.engine.parity.assertClose
import com.chesslab.engine.parity.assertCloseMap
import com.chesslab.engine.parity.assertConsumed
import com.chesslab.engine.parity.meanOf
import com.chesslab.engine.parity.toTrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Census channel parity, asserted against `tierA.censusRaw` (entry.md invariant 8: normalization is the caller's business). */
class CensusParityTest {
    @Test
    fun censusCodesMatchPython() {
        var checked = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val size = clip.meta.detSize
            val planes = clip.grayPlanes()
            val codes = ByteArray(size * size)
            for (frame in clip.tierAFrames()) {
                val tierA = requireNotNull(frame.tierA)
                val crop = tierA.censusCodeCrop
                // The crop origin is square_region("e2")[0:2], clamped into the plane.
                val region = squareRegion(Squares.index("e2"), size, clip.meta.whitePov)
                assertEquals(region[0].coerceIn(0, size - crop.w), crop.x0, "$name: crop x0")
                assertEquals(region[1].coerceIn(0, size - crop.h), crop.y0, "$name: crop y0")

                val cur = GrayImage(size, size, planes.meanOf(tierA.curFrames))
                censusTransform(cur, out = codes)
                assertCrop(codes, size, crop, "$name/${frame.frame}")
                checked++
            }
        }
        assertConsumed(checked, "censusCodeCrop frames")
    }

    @Test
    fun perSquareCensusChangeMatchesPython() {
        var checked = 0
        forEachReconstructableFrame { ctx, frame ->
            val tierA = requireNotNull(frame.tierA)
            perSquareCensusChange(ctx.refCodes, ctx.cur, ctx.boxes, ctx.out)
            assertCloseMap(tierA.censusRaw, ctx.out.asSquareMap(), "${ctx.name}/${frame.frame}: censusRaw")
            checked++
        }
        assertConsumed(checked, "perSquareCensusChange frames")
    }

    @Test
    fun bandFastPathMatchesPythonBand() {
        var checked = 0
        var inBandSquares = 0
        forEachReconstructableFrame { ctx, frame ->
            val tierA = requireNotNull(frame.tierA)
            // Python `_apply_vetoes` (`tracker.py`): candidate rows with a +/-1 px halo.
            val rows = squareBand(tierA.vetoCandidates, ctx) ?: return@forEachReconstructableFrame
            perSquareCensusChange(ctx.refCodes, ctx.cur, ctx.boxes, ctx.out, rows)
            val yLo = maxOf(0, rows[0])
            val yHi = minOf(ctx.size, rows[1])
            for (i in 0 until SQUARES) {
                val what = "${ctx.name}/${frame.frame}: band census[${Squares.ALL[i]}]"
                if (inBand(ctx.boxes, i, yLo, yHi, ctx.size)) {
                    // With the +/-1 halo the banded codes are identical to the full transform,
                    // so the band result must reproduce Python's full-path censusRaw.
                    assertClose(tierA.censusRaw.getValue(Squares.ALL[i]), ctx.out[i], what)
                    inBandSquares++
                } else {
                    assertEquals(0.0, ctx.out[i], what)
                }
            }
            checked++
        }
        assertConsumed(checked, "band census frames")
        assertConsumed(inBandSquares, "in-band squares")
    }

    @Test
    fun bandInteriorEqualsFullTransform() {
        var checked = 0
        val full = DoubleArray(SQUARES)
        forEachReconstructableFrame { ctx, frame ->
            // A band unrelated to the frame's candidates: the middle two ranks, +/-1 px halo.
            val rows = squareBand(listOf("a4", "h5"), ctx) ?: return@forEachReconstructableFrame
            perSquareCensusChange(ctx.refCodes, ctx.cur, ctx.boxes, full)
            perSquareCensusChange(ctx.refCodes, ctx.cur, ctx.boxes, ctx.out, rows)
            val yLo = maxOf(0, rows[0])
            val yHi = minOf(ctx.size, rows[1])
            var interior = 0
            for (i in 0 until SQUARES) {
                if (!inBand(ctx.boxes, i, yLo, yHi, ctx.size)) continue
                assertClose(full[i], ctx.out[i], "${ctx.name}/${frame.frame}: interior[${Squares.ALL[i]}]")
                interior++
            }
            assertTrue(interior >= SQUARES / 4, "${ctx.name}/${frame.frame}: only $interior interior squares")
            checked++
        }
        assertConsumed(checked, "band-interior frames")
    }

    // -----------------------------------------------------------------------------------

    /** Byte-exact comparison of the fixture's 16x16 census-code crop. */
    private fun assertCrop(
        codes: ByteArray,
        size: Int,
        crop: ParityCensusCrop,
        what: String,
    ) {
        for (k in crop.codes.indices) {
            val dy = k / crop.w
            val dx = k % crop.w
            val actual = codes[(crop.y0 + dy) * size + crop.x0 + dx].toInt() and BYTE_MASK
            assertEquals(crop.codes[k], actual, "$what: censusCodeCrop[$dy][$dx]")
        }
    }

    /** Everything a frame comparison needs; [cur] and [refCodes] are refreshed per frame. */
    private class Ctx(
        val name: String,
        val size: Int,
        val whitePov: Boolean,
        val overhang: Double,
        val boxes: SquareBoxes,
    ) {
        lateinit var cur: GrayImage
        lateinit var refCodes: ByteArray
        val out = DoubleArray(SQUARES)
    }

    /** Frames with `refFrames == null` had `ref_gray` mutated in place by `_maybe_patch_anomaly` (D01a-6). */
    private fun forEachReconstructableFrame(body: (Ctx, ParityFrame) -> Unit) {
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val cfg = clip.meta.effectiveConfig.toTrackerConfig()
            val size = clip.meta.detSize
            val ctx = Ctx(name, size, clip.meta.whitePov, cfg.overhang, squareBoxes(size, clip.meta.whitePov, cfg.overhang))
            val planes = clip.grayPlanes()
            val codes = ByteArray(size * size)
            for (frame in clip.tierAFrames()) {
                val tierA = requireNotNull(frame.tierA)
                val refFrames = tierA.refFrames ?: continue
                ctx.cur = GrayImage(size, size, planes.meanOf(tierA.curFrames))
                ctx.refCodes = censusTransform(GrayImage(size, size, planes.meanOf(refFrames)), out = codes)
                body(ctx, frame)
            }
        }
    }

    /** Candidate rows with a +/-1 px halo, exactly as `_apply_vetoes` builds them. */
    private fun squareBand(
        squares: List<String>,
        ctx: Ctx,
    ): IntArray? {
        if (squares.isEmpty()) return null
        var lo = Int.MAX_VALUE
        var hi = Int.MIN_VALUE
        for (square in squares) {
            val box = squareRegion(Squares.index(square), ctx.size, ctx.whitePov, extendUp = ctx.overhang)
            lo = minOf(lo, box[1])
            hi = maxOf(hi, box[3])
        }
        return intArrayOf(lo - 1, hi + 1)
    }

    /** The `:242` guard, verbatim: box fully inside the band, clear of a replicated edge. */
    private fun inBand(
        boxes: SquareBoxes,
        i: Int,
        yLo: Int,
        yHi: Int,
        boardSize: Int,
    ): Boolean =
        boxes.area[i] > 0 &&
            boxes.y0[i] >= yLo + (if (yLo > 0) 1 else 0) &&
            boxes.y1[i] <= yHi - (if (yHi < boardSize) 1 else 0)

    private companion object {
        const val SQUARES = 64
        const val BYTE_MASK = 0xFF
    }
}
