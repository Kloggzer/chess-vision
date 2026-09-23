package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.cnn.ModelSpec
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * Der Zwilling in `:app` steigt ohne `coverage_output` aus (`CoverageGateConfigTest.withCoverageGateOfIgnoresAGateWithoutTheColumn`),
 * dieser hier fragt die Spalte nie. Faellt die Entscheidung andersherum, gehoert der Fix dorthin.
 */
class CoverageGateColumnParityTest {
    private val classes =
        listOf("empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK")

    private fun specWithoutColumn(): ModelSpec =
        ModelSpec.parse(
            """{"backbone":"x","classes":${classes.joinToString(",", "[", "]") { "\"$it\"" }},
               "out_size":[80,80],"normalize":{"mean":[0.485,0.456,0.406],"std":[0.229,0.224,0.225]},
               "coverage_output":false,"coverage_gate":0.25,"temperature":1.42}""",
        )

    @Test
    fun `ohne die Coverage-Spalte bleibt die Schwelle stehen`() {
        val stored = TrackerConfig()

        assertEquals(stored.pOccludedThr, stored.withCoverageGateOf(specWithoutColumn()) { }.pOccludedThr)
    }

    @Test
    fun `ohne die Coverage-Spalte bleibt auch die Konfidenz-Huerde stehen`() {
        val stored = TrackerConfig(cnnConfThr = 0.85)

        assertEquals(0.85, stored.withCoverageGateOf(specWithoutColumn()) { }.cnnConfThr, 1e-12)
    }
}
