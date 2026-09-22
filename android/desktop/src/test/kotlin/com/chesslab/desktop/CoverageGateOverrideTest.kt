package com.chesslab.desktop

import com.chesslab.cnn.calibratedConfThr
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.cnn.ModelSpec
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** `set:pOccludedThr=` wird vom `coverage_gate` des Modells ueberschrieben — stillschweigend, bis
 *  ein A/B daran identische Zahlen misst und "die Schwelle ist egal" daraus schliesst. */
class CoverageGateOverrideTest {
    private val classes =
        listOf("empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK")

    private fun spec(
        gate: Double,
        temperature: Double = 1.0,
    ): ModelSpec =
        ModelSpec.parse(
            """{"backbone":"x","classes":${classes.joinToString(",", "[", "]") { "\"$it\"" }},
               "out_size":[80,80],"normalize":{"mean":[0.485,0.456,0.406],"std":[0.229,0.224,0.225]},
               "coverage_output":true,"coverage_gate":$gate,"temperature":$temperature}""",
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

    /** Die zweite Achse derselben Bewegung: alle sieben Modelle sind ueberkonfident, also fordert
     *  `cnnConfThr = 0.85` je Modell eine ANDERE echte Wahrscheinlichkeit. Ohne die Uebersetzung
     *  misst der Desktop eine Huerde, die das Telefon nie faehrt. */
    @Test
    fun `die Konfidenz-Huerde wird durch die Temperatur des Modells uebersetzt`() {
        val roh = TrackerConfig(cnnConfThr = 0.85)

        val out = roh.withCoverageGateOf(spec(0.35, temperature = 1.42)) { }

        assertNotEquals(0.85, out.cnnConfThr, "T = 1,42 darf die Huerde nicht stehen lassen")
        assertEquals(
            calibratedConfThr(0.85, 1.42, classes.size),
            out.cnnConfThr,
            1e-12,
            "und zwar genau um die eigene Temperatur",
        )
    }

    /** Gegenprobe: ein kalibriertes Modell (T = 1) laesst die Zahl, die dasteht. */
    @Test
    fun `ohne Ueberkonfidenz bleibt die Huerde, wie sie dasteht`() {
        assertEquals(0.85, TrackerConfig(cnnConfThr = 0.85).withCoverageGateOf(spec(0.35)) { }.cnnConfThr, 1e-12)
    }

    @Test
    fun `ohne gesetzten Knopf keine Warnung`() {
        val warnings = mutableListOf<String>()

        TrackerConfig().withCoverageGateOf(spec(0.35), emptySet()) { warnings += it }

        assertTrue(warnings.isEmpty(), "Gegenprobe: sonst warnt jeder Lauf grundlos — $warnings")
    }
}
