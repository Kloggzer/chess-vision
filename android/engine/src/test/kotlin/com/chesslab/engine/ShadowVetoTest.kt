package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Golden decisions harvested from the Python `hsv_shadow_squares`. */
class ShadowVetoTest {
    private val geom = BoardGeometry(TestImages.BS, whitePov = true, extendUp = 0.25)
    private val candidates = setOf("a8", "e4", "e2", "h1", "d5")

    @Test
    fun `uniform darkening is flagged as cast shadow`() {
        val out = ShadowVeto.shadowSquares(TestImages.bgrRef(), TestImages.bgrShadow(), geom, candidates)
        assertEquals(candidates, out)
    }

    @Test
    fun `identical image is not shadow`() {
        // ratio 1.0 > V_HI on average is false, but mean V did not decrease -> rejected.
        val out = ShadowVeto.shadowSquares(TestImages.bgrRef(), TestImages.bgrRef(), geom, candidates)
        assertEquals(emptySet<String>(), out)
    }

    @Test
    fun `saturated occluder is not shadow`() {
        val out =
            ShadowVeto.shadowSquares(
                TestImages.bgrNeutral(),
                TestImages.bgrNeutralOccluded(),
                geom,
                setOf("d5", "e4"),
            )
        assertEquals(emptySet<String>(), out)
    }
}
