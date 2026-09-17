package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test
import kotlin.math.ln

/**
 * Die gefittete `temperature` wurde 2026-09-16 verdrahtet und `cnnConfThr` dagegen nachgezogen
 * (`calibratedConfThr`). Zwei WEITERE Verbraucher derselben Wahrscheinlichkeiten wurden es nicht.
 * Beides ist Engine-Verhalten, also rot und `@Disabled` statt still gefixt.
 */
class TemperatureParityTest {
    /**
     * `applyPrior` rechnet auf GETEMPERTEN Wahrscheinlichkeiten, sein KDoc verspricht aber
     * `logProb + lambda * logPrior`. Effektiv ist es `lambda * T` — 4,0 x 1,495 = 5,98, und die
     * verbotene Masse faellt dadurch von 0,0087 auf 0,0023.
     */
    @Disabled("Engine-Verhalten: aendert die Legalitaets-Kondition, braucht den Regressionssatz")
    @Test
    fun `the legality prior is the same strength with and without the fitted temperature`() {
        val classes = listOf("empty", "wP", "wN", "wB")
        val allowed = setOf("empty", "wP")
        val logProbs = doubleArrayOf(-0.1, -2.4, -5.0, -3.3)

        // Was der Code tut: erst tempern, dann das Lambda auf die Wahrscheinlichkeiten.
        val tempered = softmaxAt(FloatArray(4) { logProbs[it].toFloat() }, T_SHIPPED)
        val onTempered = applyPrior(DoubleArray(4) { tempered[it].toDouble() }, classes, allowed, LAMBDA)

        // Was das KDoc zusagt: das Lambda auf die Log-Wahrscheinlichkeiten, dann tempern.
        val penalised = FloatArray(4) { (logProbs[it] - if (classes[it] in allowed) 0.0 else LAMBDA).toFloat() }
        val onLogits = softmaxAt(penalised, T_SHIPPED)

        for (i in classes.indices) {
            assertEquals(onLogits[i].toDouble(), onTempered[i], TOLERANCE) { "Klasse ${classes[i]}" }
        }
    }

    /**
     * `calibratedConfThr` eicht EINE Spitzenklasse gegen gleichmaessigen Rest, also `pEmpty`.
     * `confident` misst aber auch `pOcc`, die Summe von 12 Klassen — die tempert in die
     * GEGENRICHTUNG (0,85 zu 0,879, nicht zu 0,584), und die Huerde faellt effektiv auf 0,33.
     */
    @Disabled("Engine-Verhalten: verschiebt die Besetzt-Huerde, braucht den Regressionssatz")
    @Test
    fun `the occupancy gate survives the temperature like the identity gate does`() {
        val classes = PIECES13_CLASSES
        val raw = row(pOcc = 0.50, classes.size)
        val hot = softmaxAt(FloatArray(classes.size) { ln(raw[it]).toFloat() }, T_SHIPPED)

        val cold = observationFromProbs(mapOf(SQ to raw), classes)
        val warm = observationFromProbs(mapOf(SQ to DoubleArray(classes.size) { hot[it].toDouble() }), classes)

        assertEquals(
            cold.confident(SQ, ENGINE_THR),
            warm.confident(SQ, calibratedConfThr(ENGINE_THR, T_SHIPPED, classes.size)),
            "0,50 besetzt ist unter beiden Eichungen dieselbe Aussage",
        )
    }

    /** `empty` zuerst, der Rest der Masse gleichmaessig auf die 12 Figuren — [PIECES13_CLASSES]. */
    private fun row(
        pOcc: Double,
        n: Int,
    ): DoubleArray = DoubleArray(n) { if (it == 0) 1.0 - pOcc else pOcc / (n - 1) }

    private companion object {
        /** `p4a-80-clahe`, die Vorgabe; `TrackerStack.priorLambda`; `TrackerConfig.cnnConfThr`. */
        const val T_SHIPPED = 1.495
        const val LAMBDA = 4.0
        const val ENGINE_THR = 0.85
        const val SQ = "e4"
        const val TOLERANCE = 1e-9
    }
}
