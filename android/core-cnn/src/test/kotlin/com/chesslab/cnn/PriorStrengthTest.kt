package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Die Staerke ist eine Zahl auf den ROHEN Logits; getempert angewandt wurde sie still mit `T`
 *  multipliziert. `priorOnTempered` teilt sie zurueck, damit sie bedeutet, was sie sagt. */
class PriorStrengthTest {
    private val classes = listOf("empty", "wP", "wN", "wB")
    private val allowed = setOf("empty", "wP")
    private val logits = doubleArrayOf(-0.1, -2.4, -5.0, -3.3)

    private fun penalisedThenTempered(
        lambda: Double,
        t: Double,
    ): FloatArray = softmaxAt(FloatArray(4) { (logits[it] - if (classes[it] in allowed) 0.0 else lambda).toFloat() }, t)

    @Test
    fun `the declared strength is the one that lands on the raw logits`() {
        val tempered = softmaxAt(FloatArray(4) { logits[it].toFloat() }, T_SHIPPED)
        val got =
            applyPrior(
                DoubleArray(4) { tempered[it].toDouble() },
                classes,
                allowed,
                priorOnTempered(LAMBDA, T_SHIPPED),
            )

        val want = penalisedThenTempered(LAMBDA, T_SHIPPED)
        for (i in classes.indices) assertEquals(want[i].toDouble(), got[i], TOLERANCE) { classes[i] }
    }

    @Test
    fun `without a temperature nothing is divided`() {
        assertEquals(LAMBDA, priorOnTempered(LAMBDA, 1.0), TOLERANCE)
    }

    /** Die Staerke darf nicht mitwandern, wenn ein neues Modell eine andere Temperatur bringt. */
    @Test
    fun `the same declared strength survives a different temperature`() {
        for (t in listOf(1.2603, 1.495, 1.7551)) {
            val tempered = softmaxAt(FloatArray(4) { logits[it].toFloat() }, t)
            val got =
                applyPrior(
                    DoubleArray(4) { tempered[it].toDouble() },
                    classes,
                    allowed,
                    priorOnTempered(LAMBDA, t),
                )
            val want = penalisedThenTempered(LAMBDA, t)
            for (i in classes.indices) assertEquals(want[i].toDouble(), got[i], TOLERANCE) { "T=$t ${classes[i]}" }
        }
    }

    private companion object {
        const val T_SHIPPED = 1.495
        const val LAMBDA = 4.0

        /** `softmaxAt` rechnet in Float: der Hin- und Rueckweg kostet ~6e-9, nicht mehr. */
        const val TOLERANCE = 1e-7
    }
}
