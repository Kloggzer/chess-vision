package com.chesslab.tracker.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Pure crop-geometry checks (`config.py CropDefaults`: pad_up 0.0, pad_side 0.10 → square cell). */
class BoardCropperTest {
    private val size = 800 // cell = 100 px

    @Test
    fun `interior square is a symmetric square cell`() {
        // e4 on white POV: file e (x 400..500), rank 4 -> y 400..500.
        val r = BoardCropper.cropRect("e4", size)
        assertEquals(390, r.x) // - pad_side * cell
        assertEquals(120, r.width) // cell * (1 + 2*pad_side)
        assertEquals(390, r.y) // - (pad_up + pad_side) * cell = - pad_side * cell (pad_up 0)
        assertEquals(120, r.height) // cell * (1 + pad_up + 2*pad_side) = width -> square
    }

    @Test
    fun `edge squares clamp to the board`() {
        val a8 = BoardCropper.cropRect("a8", size) // top-left corner
        assertEquals(0, a8.x)
        assertEquals(0, a8.y)
        assertEquals(110, a8.width)
        assertEquals(110, a8.height)

        val h1 = BoardCropper.cropRect("h1", size) // bottom-right corner
        assertEquals(690, h1.x)
        assertEquals(110, h1.width)
        assertEquals(690, h1.y)
        assertEquals(110, h1.height)
    }

    @Test
    fun `all 64 crops stay inside the board`() {
        for (sq in ALL_SQUARES) {
            val r = BoardCropper.cropRect(sq, size)
            assertEquals(true, r.x >= 0 && r.y >= 0 && r.x + r.width <= size && r.y + r.height <= size, sq)
        }
    }
}
