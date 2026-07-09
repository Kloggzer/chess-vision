package com.chesslab.tracker.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Pure crop-geometry checks (`config.py CropDefaults`: pad_up 0.35, pad_side 0.05). */
class BoardCropperTest {
    private val size = 800 // cell = 100 px

    @Test
    fun `interior square extends upward for the 3d lean`() {
        // e4 on white POV: file e (x 400..500), rank 4 -> y 400..500.
        val r = BoardCropper.cropRect("e4", size)
        assertEquals(395, r.x) // - pad_side
        assertEquals(110, r.width) // cell * (1 + 2*pad_side)
        assertEquals(360, r.y) // - (pad_up + pad_side) * cell
        assertEquals(145, r.height) // cell * (1 + pad_up + 2*pad_side)
    }

    @Test
    fun `edge squares clamp to the board`() {
        val a8 = BoardCropper.cropRect("a8", size) // top-left corner
        assertEquals(0, a8.x)
        assertEquals(0, a8.y)
        assertEquals(105, a8.width)
        assertEquals(105, a8.height)

        val h1 = BoardCropper.cropRect("h1", size) // bottom-right corner
        assertEquals(695, h1.x)
        assertEquals(105, h1.width)
        assertEquals(660, h1.y)
        assertEquals(140, h1.height) // bottom pad clipped at the board edge
    }

    @Test
    fun `all 64 crops stay inside the board`() {
        for (sq in ALL_SQUARES) {
            val r = BoardCropper.cropRect(sq, size)
            assertEquals(true, r.x >= 0 && r.y >= 0 && r.x + r.width <= size && r.y + r.height <= size, sq)
        }
    }
}
