package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.cnn.ModelSpec
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** `set:pOccludedThr=` wird vom `coverage_gate` des Modells ueberschrieben — stillschweigend, bis
 *  ein A/B daran identische Zahlen misst und "die Schwelle ist egal" daraus schliesst. */
class CoverageGateOverrideTest {
    private val classes =
        listOf("empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK")

    private fun spec(gate: Double): ModelSpec =
        ModelSpec.parse(
            """{"backbone":"x","classes":${classes.joinToString(",", "[", "]") { "\"$it\"" }},
               "out_size":[80,80],"normalize":{"mean":[0.485,0.456,0.406],"std":[0.229,0.224,0.225]},
               "coverage_output":true,"coverage_gate":$gate}""",
        )

    @Test
    fun `ein gesetzter pOccludedThr wird verworfen, und der Lauf sagt es`() {
        val warnings = mutableListOf<String>()

        val out =
            TrackerConfig(pOccludedThr = 0.25)
                .withCoverageGateOf(spec(0.35), setOf("pOccludedThr")) { warnings += it }

        assertEquals(0.35, out.pOccludedThr, 0.0, "das Modell gewinnt weiterhin — Verhalten gleich")
        assertTrue(warnings.any { "pOccludedThr" in it }, "aber es muss gesagt werden: $warnings")
    }

    @Test
    fun `ohne gesetzten Knopf keine Warnung`() {
        val warnings = mutableListOf<String>()

        TrackerConfig().withCoverageGateOf(spec(0.35), emptySet()) { warnings += it }

        assertTrue(warnings.isEmpty(), "Gegenprobe: sonst warnt jeder Lauf grundlos — $warnings")
    }
}
