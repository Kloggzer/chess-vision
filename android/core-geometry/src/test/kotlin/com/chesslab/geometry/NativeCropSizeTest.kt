package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Der Crop-Kasten muss NATIV auf der Modellgroesse landen: groesser schneiden und mit `INTER_AREA`
 *  herunterrechnen kostete 0,25 Punkte `piece_acc` (gemessen 2026-08-29). */
class NativeCropSizeTest {
    private fun boxWidth(geom: BoardGeometry): Int {
        val box = squareToCropBox("d4", geom, clamp = false)
        return box[2] - box[0]
    }

    @Test
    fun `the crop box lands exactly on the model size`() {
        for (out in listOf(64, 80, 96, 112, 128)) {
            val geom = BoardGeometry(boardSize = 1008, padSide = 0.05, outW = out, outH = out)
            assertEquals(out, boxWidth(geom.forNativeCrops()), "outW $out")
        }
    }

    @Test
    fun `128 px reproduces the number the real export cuts with`() {
        // CLAUDE.md 0.1: "board_size 928, cell 116, pad_side 0.05 gives 127.6 px, factor 1.000".
        val geom = BoardGeometry(boardSize = 1600, padSide = 0.05, outW = 128, outH = 128)
        assertEquals(928, geom.forNativeCrops().boardSize)
    }

    @Test
    fun `the cell stays whole so all 64 boxes share one geometry`() {
        for (out in listOf(64, 80, 96, 128)) {
            val geom =
                BoardGeometry(boardSize = 1008, padSide = 0.05, outW = out, outH = out)
                    .forNativeCrops()
            assertEquals(0, geom.boardSize % 8, "boardSize ${geom.boardSize} ist kein Vielfaches von 8")
            val widths =
                allSquares()
                    .map { square ->
                        val box = squareToCropBox(square, geom, clamp = false)
                        box[2] - box[0]
                    }.toSet()
            assertEquals(setOf(out), widths, "alle 64 Kaesten muessen genau $out breit sein")
        }
    }

    @Test
    fun `a wider pad demands a bigger raster`() {
        val narrow = BoardGeometry(padSide = 0.05, outW = 80, outH = 80).forNativeCrops()
        val wide = BoardGeometry(padSide = 0.10, outW = 80, outH = 80).forNativeCrops()
        assertTrue(
            wide.boardSize < narrow.boardSize,
            "mehr Rand heisst weniger Zelle fuer dieselben 80 px",
        )
        assertEquals(80, boxWidth(wide))
    }

    @Test
    fun `it saves warp pixels against the calibrated size`() {
        val calibrated = BoardGeometry(boardSize = 1248, padSide = 0.05, outW = 80, outH = 80)
        val native = calibrated.forNativeCrops()
        val saved = 1.0 - (native.boardSize.toDouble() / calibrated.boardSize).let { it * it }
        assertTrue(saved > 0.7, "erwartet ueber 70 % weniger Pixel, gemessen ${saved * 100}")
    }
}
