package com.chesslab.tracker.service

import com.chesslab.cnn.IMAGENET_MEAN
import com.chesslab.cnn.IMAGENET_STD
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.cnn.ModelSpec
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Ohne `coverage_output` ist `pOccluded` immer 0,0 und die Hand-Pruefung haengt am modellfreien
 *  Arm — die Schwelle zu ziehen bewegt dann eine Zahl, gegen die nie etwas verglichen wird.
 *  `spec?.coverageGate?.let { … }` fragte die Spalte nie (gefunden 2026-09-15). */
class CoverageGateNeedsTheColumnTest {
    private val stored = TrackerConfig()

    private fun spec(coverageOutput: Boolean) =
        ModelSpec(
            classes = List(13) { "c$it" },
            outWidth = 80,
            outHeight = 80,
            mean = IMAGENET_MEAN,
            std = IMAGENET_STD,
            coverageOutput = coverageOutput,
            coverageGate = 0.25,
        )

    @Test
    fun `a gate without the coverage column is not applied`() {
        val spec = spec(coverageOutput = false)

        assertEquals(stored.pOccludedThr, stored.withCoverageGateOf(spec) { }.pOccludedThr)
    }

    @Test
    fun `a gate with the column is applied, as before`() {
        val spec = spec(coverageOutput = true)

        assertEquals(0.25, stored.withCoverageGateOf(spec) { }.pOccludedThr)
    }
}
