package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * Colour gamut and Cucchiara shadow branches the clip fixtures never reach, including the
 * extended-box arm, which Python always calls with `extend_up = 0`.
 */
class GamutUnitTest {
    @Test
    fun fewerThanEightUsableSquaresYieldsNoGamut() {
        // boardSize 8 => cell 1 px, inset 0.16 => every region collapses to zero width.
        val geom = PlaneGeometry(SMALL, SMALL, SMALL, true, 0.0)
        val bgr = ByteArray(SMALL * SMALL * CHANNELS) { GREY }
        assertNull(boardColorGamut(planes(bgr, SMALL, SMALL), geom))
    }

    @Test
    fun uniformBoardStaysInvertibleThroughTheRegularizer() {
        val geom = geometry()
        val gamut = requireNotNull(boardColorGamut(planes(uniform(), BOARD, BOARD), geom))
        assertEquals(SQUARES, gamut.n)
        // Zero chroma variance => cov == 4 * I => inv == 0.25 * I.
        for (i in 0 until DIM) {
            for (j in 0 until DIM) {
                val expected = if (i == j) INV_UNIFORM else 0.0
                assertTrue(
                    abs(gamut.invCov[i * DIM + j] - expected) < EPS,
                    "invCov[$i][$j] = ${gamut.invCov[i * DIM + j]}, expected $expected",
                )
            }
        }
        // A square of the very same colour matches its own reference feature exactly.
        val cur = planes(uniform(), BOARD, BOARD)
        assertEquals(0L, occlusionColorSquares(cur, geom, gamut, ofSquares("e4"), THR))
    }

    @Test
    fun occlusionGuardsShortCircuit() {
        val geom = geometry()
        val cur = planes(checkerboard(1.0), BOARD, BOARD)
        val gamut = requireNotNull(boardColorGamut(planes(checkerboard(1.0), BOARD, BOARD), geom))
        assertEquals(0L, occlusionColorSquares(cur, geom, gamut, 0L, THR))
        assertEquals(0L, occlusionColorSquares(cur, geom, gamut, ofSquares("e4"), 0.0))
        assertEquals(0L, occlusionColorSquares(cur, geom, gamut, ofSquares("e4"), -1.0))
        assertEquals(0L, occlusionColorSquares(cur, geom, null, ofSquares("e4"), THR))
    }

    @Test
    fun aForeignColourIsAnOutlierOnBothBoxes() {
        val gamut = requireNotNull(boardColorGamut(planes(checkerboard(1.0), BOARD, BOARD), geometry()))
        val painted = checkerboard(1.0)
        paint(painted, "e4")
        // Base box only (Python's production call).
        val base = PlaneGeometry(BOARD, BOARD, BOARD, true, 0.0)
        assertEquals(ofSquares("e4"), occlusionColorSquares(planes(painted, BOARD, BOARD), base, gamut, ofSquares("e4"), THR))

        // The extended-box arm: paint only the strip ABOVE e4, so the base box stays clean.
        val above = checkerboard(1.0)
        paintStrip(above, "e4")
        val extended = PlaneGeometry(BOARD, BOARD, BOARD, true, OVERHANG)
        assertEquals(
            0L,
            occlusionColorSquares(planes(above, BOARD, BOARD), base, gamut, ofSquares("e4"), THR),
        )
        assertEquals(
            ofSquares("e4"),
            occlusionColorSquares(planes(above, BOARD, BOARD), extended, gamut, ofSquares("e4"), THR),
        )
    }

    @Test
    fun aDarkenedSquareIsShadowButARecolouredOrBrighterOneIsNot() {
        val geom = geometry()
        val ref = checkerboard(1.0)
        val refHsv = bgrToHsv(ref, BOARD, BOARD, ByteArray(ref.size))
        val candidates = ofSquares("e4")

        val darker = checkerboard(SHADOW_GAIN)
        assertEquals(
            ofSquares("e4"),
            hsvShadowSquares(refHsv, bgrToHsv(darker, BOARD, BOARD, ByteArray(ref.size)), geom, candidates),
        )

        val brighter = checkerboard(BRIGHT_GAIN)
        assertEquals(
            0L,
            hsvShadowSquares(refHsv, bgrToHsv(brighter, BOARD, BOARD, ByteArray(ref.size)), geom, candidates),
        )

        // Same darkening, but the channels rotated: V ratio is in range, the hue is not.
        val recoloured = checkerboard(SHADOW_GAIN)
        rotateChannels(recoloured)
        assertEquals(
            0L,
            hsvShadowSquares(refHsv, bgrToHsv(recoloured, BOARD, BOARD, ByteArray(ref.size)), geom, candidates),
        )

        assertEquals(0L, hsvShadowSquares(refHsv, refHsv, geom, 0L))
    }

    // -----------------------------------------------------------------------------------

    private fun geometry() = PlaneGeometry(BOARD, BOARD, BOARD, true, 0.0)

    private fun planes(
        bgr: ByteArray,
        width: Int,
        height: Int,
    ) = ColorPlanes(
        bgrToLab(bgr, width, height, ByteArray(bgr.size)),
        bgrToHsv(bgr, width, height, ByteArray(bgr.size)),
    )

    private fun uniform(): ByteArray = ByteArray(BOARD * BOARD * CHANNELS) { GREY }

    /** A light/dark board with a slight per-square colour drift, so the covariance is non-trivial. */
    private fun checkerboard(gain: Double): ByteArray {
        val data = ByteArray(BOARD * BOARD * CHANNELS)
        val cell = BOARD / Squares.N
        for (y in 0 until BOARD) {
            for (x in 0 until BOARD) {
                val col = x / cell
                val row = y / cell
                val light = (col + row) % 2 == 0
                val base = if (light) LIGHT else DARK
                val idx = (y * BOARD + x) * CHANNELS
                data[idx] = scaled(base + col, gain)
                data[idx + 1] = scaled(base + TINT_G + row, gain)
                data[idx + 2] = scaled(base + TINT_R, gain)
            }
        }
        return data
    }

    /** Fills [square]'s base box with the skin-toned occluder colour. */
    private fun paint(
        data: ByteArray,
        square: String,
    ) {
        fill(data, requireNotNull(geometry().region(Squares.index(square), 0.0)))
    }

    /** Fills only the band the `extendUp` overhang adds above [square]'s base box. */
    private fun paintStrip(
        data: ByteArray,
        square: String,
    ) {
        val base = requireNotNull(geometry().region(Squares.index(square), 0.0))
        val ext =
            requireNotNull(PlaneGeometry(BOARD, BOARD, BOARD, true, OVERHANG).region(Squares.index(square), OVERHANG))
        fill(data, intArrayOf(ext[0], ext[1], ext[2], base[1]))
    }

    private fun fill(
        data: ByteArray,
        box: IntArray,
    ) {
        val x0 = box[0]
        val y0 = box[1]
        val x1 = box[2]
        val y1 = box[3]
        for (y in y0 until y1) {
            for (x in x0 until x1) {
                val idx = (y * BOARD + x) * CHANNELS
                data[idx] = SKIN_B
                data[idx + 1] = SKIN_G
                data[idx + 2] = SKIN_R
            }
        }
    }

    private fun rotateChannels(data: ByteArray) {
        for (idx in data.indices step CHANNELS) {
            val b = data[idx]
            data[idx] = data[idx + 1]
            data[idx + 1] = data[idx + 2]
            data[idx + 2] = b
        }
    }

    private fun scaled(
        value: Int,
        gain: Double,
    ): Byte = (value * gain).roundToInt().coerceIn(0, U8_MAX).toByte()

    private companion object {
        const val BOARD = 320
        const val SMALL = 8
        const val SQUARES = 64
        const val DIM = 3
        const val CHANNELS = 3
        const val U8_MAX = 255
        const val GREY: Byte = 100
        const val LIGHT = 190
        const val DARK = 90
        const val TINT_G = 12
        const val TINT_R = 25
        const val THR = 3.0
        const val OVERHANG = 0.25
        const val SHADOW_GAIN = 0.7
        const val BRIGHT_GAIN = 1.15
        const val INV_UNIFORM = 0.25
        const val EPS = 1e-9
        const val SKIN_B: Byte = 0
        const val SKIN_G: Byte = 120

        /** 245 as a signed byte. */
        const val SKIN_R: Byte = -11
    }
}
