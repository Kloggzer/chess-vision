package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test
import kotlin.math.ln

/** Zwei WEITERE Verbraucher der getemperten Wahrscheinlichkeiten; Engine-Verhalten, also rot und
 *  `@Disabled` statt still gefixt. */
class TemperatureParityTest {
    // applyPrior ist erledigt (`PriorStrengthTest`); ein @Disabled, das nie gruen werden kann, waere eine Falle.

    /** `calibratedConfThr` eicht EINE Spitzenklasse, also `pEmpty`; `confident` misst auch `pOcc`, die Summe
     *  von 12 Klassen — die tempert GEGENlaeufig (0,85 zu 0,879), die Huerde faellt effektiv auf 0,33. */
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

    /** `PROMO_CNN_CONFIDENCE` 0,90 geht an keiner `calibratedConfThr` vorbei: getempert erreicht roh 0,95 nur 0,759. */
    @Disabled("Engine-Verhalten: die 0,90 in PromotionConfirm ist ungeeicht")
    @Test
    fun `the hard-coded promotion confidence means the same thing after the temperature`() {
        val classes = PIECES13_CLASSES
        val raw = peak(classes.indexOf("wQ"), 0.95, classes.size)
        val hot = softmaxAt(FloatArray(classes.size) { ln(raw[it]).toFloat() }, T_SHIPPED)

        val cold = observationFromProbs(mapOf(SQ to raw), classes)
        val warm = observationFromProbs(mapOf(SQ to DoubleArray(classes.size) { hot[it].toDouble() }), classes)

        assertEquals(
            cold.labelConfident(SQ, PROMO_CONFIDENCE),
            warm.labelConfident(SQ, PROMO_CONFIDENCE),
            "0,95 auf wQ ist unter beiden Eichungen dieselbe Aussage",
        )
    }

    /** `invalidMass` steigt beim Tempern (0,600 auf 0,714), waehrend die Schwelle auf 0,584 faellt. */
    @Disabled("Engine-Verhalten: die Legalitaets-Sicherung greift viel frueher")
    @Test
    fun `the invalid-mass safety is the same demand after the temperature`() {
        val classes = PIECES13_CLASSES
        val allowed = setOf("empty", "wP")
        val raw = doubleArrayOf(0.35, 0.05) + DoubleArray(classes.size - 2) { 0.60 / (classes.size - 2) }
        val hot = softmaxAt(FloatArray(classes.size) { ln(raw[it]).toFloat() }, T_SHIPPED)
        val possible = mapOf(SQ to allowed)

        val cold = observationFromProbs(mapOf(SQ to raw), classes, possible, LAMBDA)
        val warm = observationFromProbs(mapOf(SQ to DoubleArray(classes.size) { hot[it].toDouble() }), classes, possible, LAMBDA)

        assertEquals(
            cold.invalidConfident(SQ, ENGINE_THR),
            warm.invalidConfident(SQ, calibratedConfThr(ENGINE_THR, T_SHIPPED, classes.size)),
            "dieselbe verbotene Masse, dieselbe Forderung",
        )
    }

    private fun peak(
        at: Int,
        top: Double,
        n: Int,
    ): DoubleArray = DoubleArray(n) { if (it == at) top else (1.0 - top) / (n - 1) }

    private fun row(
        pOcc: Double,
        n: Int,
    ): DoubleArray = DoubleArray(n) { if (it == 0) 1.0 - pOcc else pOcc / (n - 1) }

    private companion object {
        const val T_SHIPPED = 1.495
        const val LAMBDA = 4.0
        const val ENGINE_THR = 0.85
        const val PROMO_CONFIDENCE = 0.90
        const val SQ = "e4"
        const val TOLERANCE = 1e-9
    }
}
