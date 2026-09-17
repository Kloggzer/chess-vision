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
    /*
     * Der applyPrior-Befund ist ERLEDIGT (2026-09-17): `priorOnTempered` teilt die deklarierte
     * Staerke am Aufrufer, `applyPrior` nimmt sie per Bauart im getemperten Raum. Der Vertrag
     * steht in `PriorStrengthTest`; ein @Disabled, das nie gruen werden kann, waere dieselbe
     * Falle wie ein veralteter TODO.
     */

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

    /** `PROMO_CNN_CONFIDENCE` ist eine 0,90 im Engine-Code, an keiner `calibratedConfThr` vorbei:
     *  getempert erreicht eine rohe 0,95 nur 0,759, und erst ab roh 0,989 bestaetigt sie wieder. */
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

    /** `invalidMass` ist die Summe der VERBOTENEN Klassen: sie steigt beim Tempern (0,600 auf
     *  0,714), waehrend die Schwelle auf 0,584 faellt — beide Seiten laufen aufeinander zu. */
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

    /** Eine Spitzenklasse, der Rest gleichmaessig — die Zeile, die eine Umwandlung bestaetigt. */
    private fun peak(
        at: Int,
        top: Double,
        n: Int,
    ): DoubleArray = DoubleArray(n) { if (it == at) top else (1.0 - top) / (n - 1) }

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
        const val PROMO_CONFIDENCE = 0.90
        const val SQ = "e4"
        const val TOLERANCE = 1e-9
    }
}
