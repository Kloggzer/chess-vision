package com.chesslab.tracker.ui

import androidx.compose.ui.geometry.Offset
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The zoom-loupe source-window math ([loupeSourceRect]) is the safety-critical part:
 * the returned rect is passed straight to `DrawScope.drawImage`, so it MUST stay inside
 * the bitmap or the draw crashes. These tests pin the canvas→bitmap mapping and, above
 * all, the edge/corner clamping.
 */
class CalibrationLoupeTest {
    private val bmpW = 640
    private val bmpH = 480
    private val canvas = Offset(320f, 240f) // preview shown at half the bitmap resolution
    private val win = 40

    @Test
    fun `centered tap maps to a centered source window`() {
        val rect = loupeSourceRect(Offset(160f, 120f), canvas, bmpW, bmpH, win)
        assertEquals(300, rect.left) // 320 (mapped) - 20 (half window)
        assertEquals(220, rect.top) // 240 (mapped) - 20
        assertEquals(win, rect.width)
        assertEquals(win, rect.height)
    }

    @Test
    fun `top-left corner clamps to bitmap origin`() {
        val rect = loupeSourceRect(Offset(0f, 0f), canvas, bmpW, bmpH, win)
        assertEquals(0, rect.left)
        assertEquals(0, rect.top)
        assertEquals(win, rect.width)
        assertEquals(win, rect.height)
    }

    @Test
    fun `bottom-right corner keeps the window inside the bitmap`() {
        val rect = loupeSourceRect(Offset(320f, 240f), canvas, bmpW, bmpH, win)
        assertEquals(bmpW - win, rect.left)
        assertEquals(bmpH - win, rect.top)
        assertTrue(rect.right <= bmpW) { "right ${rect.right} > $bmpW" }
        assertTrue(rect.bottom <= bmpH) { "bottom ${rect.bottom} > $bmpH" }
    }

    @Test
    fun `window never leaves the bitmap for taps sampled across the canvas`() {
        for (px in 0..canvas.x.toInt()) {
            for (py in 0..canvas.y.toInt() step 10) {
                val rect = loupeSourceRect(Offset(px.toFloat(), py.toFloat()), canvas, bmpW, bmpH, win)
                assertTrue(rect.left >= 0 && rect.top >= 0 && rect.right <= bmpW && rect.bottom <= bmpH) {
                    "rect $rect escaped bitmap at ($px,$py)"
                }
            }
        }
    }

    @Test
    fun `window shrinks to fit a bitmap smaller than the window`() {
        val rect = loupeSourceRect(Offset(10f, 10f), Offset(20f, 30f), 20, 30, win)
        assertEquals(20, rect.width)
        assertEquals(20, rect.height)
        assertTrue(rect.left >= 0 && rect.top >= 0 && rect.right <= 20 && rect.bottom <= 30)
    }

    @Test
    fun `degenerate bitmap returns an empty rect instead of crashing`() {
        val rect = loupeSourceRect(Offset(5f, 5f), canvas, 0, 0, win)
        assertEquals(0, rect.width)
        assertEquals(0, rect.height)
    }
}
