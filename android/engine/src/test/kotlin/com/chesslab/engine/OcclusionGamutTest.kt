package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test

/**
 * Golden values harvested from the Python `board_color_gamut` / `occlusion_color_squares`
 * (neutral board): mu = [127.98, 129.2375, 7.4881]. Tolerances absorb the <=2 LSB difference
 * between OpenCV's fixed-point 8-bit HSV/Lab tables and our float conversions.
 */
class OcclusionGamutTest {
    private val geom = BoardGeometry(TestImages.BS, whitePov = true, extendUp = 0.25)

    @Test
    fun `gamut mean matches python within tolerance`() {
        val gamut = OcclusionGamut.boardColorGamut(TestImages.bgrNeutral(), geom)
        assertNotNull(gamut)
        assertEquals(127.98, gamut!!.mu[0], 2.0)
        assertEquals(129.2375, gamut.mu[1], 2.0)
        assertEquals(7.4881, gamut.mu[2], 2.0)
    }

    @Test
    fun `saturated occluder square is an outlier at live-tuned threshold`() {
        val gamut = OcclusionGamut.boardColorGamut(TestImages.bgrNeutral(), geom)
        val out = OcclusionGamut.occlusionColorSquares(
            TestImages.bgrNeutralOccluded(),
            gamut,
            geom,
            setOf("d5", "e4", "a8"),
            thr = 1.5,
        )
        assertEquals(setOf("d5"), out)
    }

    @Test
    fun `rainbow board never flags its own colors`() {
        val gamut = OcclusionGamut.boardColorGamut(TestImages.bgrRef(), geom)
        val out = OcclusionGamut.occlusionColorSquares(
            TestImages.bgrRef(),
            gamut,
            geom,
            setOf("d5", "e4", "a8"),
            thr = 1.5,
        )
        assertEquals(emptySet<String>(), out)
    }

    @Test
    fun `disabled threshold or missing gamut returns empty`() {
        val gamut = OcclusionGamut.boardColorGamut(TestImages.bgrNeutral(), geom)
        assertEquals(
            emptySet<String>(),
            OcclusionGamut.occlusionColorSquares(TestImages.bgrNeutralOccluded(), gamut, geom, setOf("d5"), thr = 0.0),
        )
        assertEquals(
            emptySet<String>(),
            OcclusionGamut.occlusionColorSquares(TestImages.bgrNeutralOccluded(), null, geom, setOf("d5"), thr = 1.5),
        )
    }
}
