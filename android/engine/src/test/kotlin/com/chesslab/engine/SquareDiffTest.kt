package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Golden values harvested from the Python reference (tracker.py) via `uv run python`. */
class SquareDiffTest {
    private val geom = BoardGeometry(TestImages.BS, whitePov = true, extendUp = 0.25)

    @Test
    fun `square regions match python square_region`() {
        assertEquals(Box(1, 0, 6, 6), Squares.region("a8", geom))
        assertEquals(Box(33, 31, 38, 38), Squares.region("e4", geom))
        assertEquals(Box(33, 47, 38, 54), Squares.region("e2", geom))
        assertEquals(Box(57, 55, 62, 62), Squares.region("h1", geom))
        assertEquals(Box(33, 33, 38, 38), Squares.region("e4", geom.copy(extendUp = 0.0)))
    }

    @Test
    fun `per square diff matches python golden values`() {
        val d = SquareDiff.perSquareDiff(TestImages.grayA(), TestImages.grayB(), geom)
        assertEquals(0.0, d.getValue("a8"), 1e-6)
        assertEquals(47.4, d.getValue("e4"), 1e-6)
        assertEquals(51.428571, d.getValue("e2"), 1e-6)
        assertEquals(0.0, d.getValue("h1"), 1e-6)
        assertEquals(0.0, d.getValue("d5"), 1e-6)
    }

    @Test
    fun `normalize subtracts the upper median and clamps at zero`() {
        val d = SquareDiff.perSquareDiff(TestImages.grayA(), TestImages.grayB(), geom)
        val nd = SquareDiff.normalizeDiffs(d)
        assertEquals(47.4, nd.getValue("e4"), 1e-6)
        assertEquals(0.0, nd.getValue("a8"), 1e-6)
        // Global offset: median removes it entirely.
        val shifted = d.mapValues { (_, v) -> v + 5.0 }
        val norm = SquareDiff.normalizeDiffs(shifted)
        assertEquals(47.4, norm.getValue("e4"), 1e-6)
        assertEquals(0.0, norm.getValue("h1"), 1e-6)
    }

    @Test
    fun `jitter tolerance absorbs a 1px wobble but keeps a real change`() {
        val bs = TestImages.BS
        // High-contrast vertical stripes: a 1px horizontal shift flips every edge pixel.
        fun stripes(shift: Int): GrayImage {
            val g = ByteArray(bs * bs)
            for (y in 0 until bs) {
                for (x in 0 until bs) {
                    g[y * bs + x] = (if (((x + shift) / 2) % 2 == 0) 200 else 40).toByte()
                }
            }
            return GrayImage(bs, bs, g)
        }
        val ref = stripes(0)
        val wobbled = stripes(1)
        val exact = SquareDiff.perSquareDiff(ref, wobbled, geom)
        val tolerant = SquareDiff.perSquareDiff(ref, wobbled, geom, jitterPx = 1)
        // Without tolerance the wobble reads as a massive whole-board diff; with it, ~zero.
        assertTrue(exact.getValue("e4") > 50.0, "wobble must trip the exact diff (got ${exact.getValue("e4")})")
        assertEquals(0.0, tolerant.getValue("e4"), 1e-6)

        // A real blob change (piece-sized region flipped) survives the min-shift erosion.
        val changed = stripes(1)
        val box = Squares.region("e4", geom)
        for (y in box.y0 until box.y1) {
            for (x in box.x0 until box.x1) changed.data[y * bs + x] = 120.toByte()
        }
        val tolerantChanged = SquareDiff.perSquareDiff(ref, changed, geom, jitterPx = 1)
        assertTrue(
            tolerantChanged.getValue("e4") > 20.0,
            "a real piece-sized change must survive jitter tolerance (got ${tolerantChanged.getValue("e4")})",
        )
    }

    @Test
    fun `illumination cancel absorbs a brightness gradient but keeps a piece blob`() {
        val bs = TestImages.BS
        fun flat(v: Int): GrayImage = GrayImage(bs, bs, ByteArray(bs * bs) { v.toByte() })
        val ref = flat(100)
        // Lighting gradient: left quarter +30, rest +5 — the global median (5) leaves the
        // bright quarter at +25, so median normalization alone cannot cancel it.
        val lit = flat(100)
        for (y in 0 until bs) {
            for (x in 0 until bs) {
                lit.data[y * bs + x] = (100 + if (x < bs / 4) 30 else 5).toByte()
            }
        }
        val exact = SquareDiff.normalizeDiffs(SquareDiff.perSquareDiff(ref, lit, geom))
        val cancelled = SquareDiff.normalizeDiffs(SquareDiff.perSquareDiff(ref, lit, geom, illumCancel = true))
        assertTrue(exact.values.max() > 10.0, "gradient must trip the exact diff (got ${exact.values.max()})")
        assertEquals(0.0, cancelled.values.max(), 1e-6)

        // A piece-sized blob (unpadded core cell) survives the per-square mean removal because
        // it fills the pad_up-extended scoring box only PARTIALLY — structure, not a uniform shift.
        val moved = flat(100)
        val core = Squares.region("e4", geom.copy(extendUp = 0.0))
        for (y in core.y0 until core.y1) {
            for (x in core.x0 until core.x1) moved.data[y * bs + x] = 220.toByte()
        }
        val d = SquareDiff.perSquareDiff(ref, moved, geom, illumCancel = true)
        assertTrue(d.getValue("e4") > 10.0, "piece blob must survive illum cancel (got ${d.getValue("e4")})")
    }

    @Test
    fun `colRow rotates 180 degrees for black pov`() {
        assertEquals(4 to 4, Squares.colRow("e4", true))
        assertEquals(3 to 3, Squares.colRow("e4", false))
        assertEquals(0 to 0, Squares.colRow("a8", true))
        assertEquals(7 to 7, Squares.colRow("a8", false))
    }
}
