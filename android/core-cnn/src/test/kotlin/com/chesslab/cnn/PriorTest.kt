package com.chesslab.cnn

import com.chesslab.engine.api.STARTPOS
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNotSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class PriorTest {
    @Test
    fun `startposition rank 3 admits pawn knight and empty`() {
        val possible = possibleLabels(STARTPOS)
        assertEquals(setOf("empty", "wP", "wN"), possible.getValue("a3"))
        assertEquals(setOf("empty", "wP"), possible.getValue("b3"))
        assertEquals(setOf("empty", "wP", "wN"), possible.getValue("h3"))
    }

    @Test
    fun `ranks black cannot reach in one white half-move stay empty`() {
        val possible = possibleLabels(STARTPOS)
        for (square in ALL_SQUARES.filter { it[1] == '5' || it[1] == '6' }) {
            assertEquals(setOf("empty"), possible.getValue(square), square)
        }
    }

    @Test
    fun `black back rank is pinned to one label each`() {
        val possible = possibleLabels(STARTPOS)
        assertEquals(setOf("bR"), possible.getValue("a8"))
        assertEquals(setOf("bK"), possible.getValue("e8"))
        assertEquals(setOf("bP"), possible.getValue("a7"))
    }

    @Test
    fun `the resting placement is always in the set`() {
        val possible = possibleLabels(STARTPOS)
        for ((square, label) in expectedLabels(boardOf(STARTPOS))) {
            assertTrue(label in possible.getValue(square), "$square lost its resting label $label")
        }
    }

    @Test
    fun `lambda 0 leaves every probability untouched`() {
        val probs = doubleArrayOf(0.6, 0.35, 0.05)
        val out = applyPrior(probs, CLASSES, setOf("empty"), 0.0)
        assertTrue(probs.contentEquals(out))
    }

    @Test
    fun `a null prior leaves every probability untouched`() {
        val probs = doubleArrayOf(0.6, 0.35, 0.05)
        assertTrue(probs.contentEquals(applyPrior(probs, CLASSES, null, 4.0)))
    }

    @Test
    fun `applyPrior never hands back the caller's row`() {
        val probs = DoubleArray(PIECES13_CLASSES.size) { 1.0 / PIECES13_CLASSES.size }

        val untouched = applyPrior(probs, PIECES13_CLASSES, allowed = null, lambda = 1.0)

        assertNotSame(probs, untouched, "a caller that mutates the result would rewrite the input row")
        assertArrayEquals(probs, untouched, 0.0)
    }

    /** Ohne Nenner kommt lauter `NaN` zurueck, und `NaN` faellt durch JEDEN Vergleich. */
    @Test
    fun `a penalty that erases the row returns the row it was given`() {
        val probs = doubleArrayOf(0.0, 0.4, 0.6)
        val out = applyPrior(probs, listOf("empty", "wP", "wN"), setOf("empty"), lambda = 800.0)

        assertTrue(out.none { it.isNaN() }, "keine NaN-Zeile: ${out.toList()}")
        assertEquals(probs.toList(), out.toList())
    }

    @Test
    fun `an illegal favourite loses to the legal runner-up`() {
        val probs = doubleArrayOf(0.05, 0.60, 0.35)
        val out = applyPrior(probs, CLASSES, setOf("empty", "bR"), 4.0)
        assertTrue(out[2] > out[1], "bR must win once bB is illegal")
        assertEquals(1.0, out.sum(), 1e-9)
    }

    @Test
    fun `a finite lambda leaves the pixels arguable`() {
        // The reserve against a wrongly committed move: lambda is an exchange rate, not a wall.
        val probs = doubleArrayOf(0.005, 0.990, 0.005)
        val soft = applyPrior(probs, CLASSES, setOf("empty"), 4.0)
        assertTrue(soft[1] > soft[0], "a confident CNN must be able to contradict a wrong prior")
        val stiff = applyPrior(probs, CLASSES, setOf("empty"), 8.0)
        assertTrue(stiff[1] < stiff[0], "a higher lambda buys the prior the same square back")
        assertNotEquals(0.0, stiff[1], 1e-12)
    }

    @Test
    fun `occluded is never penalised by the prior`() {
        val classes = listOf("empty", "bB", "occluded")
        val probs = doubleArrayOf(0.30, 0.30, 0.40)
        val out = applyPrior(probs, classes, setOf("empty"), 4.0)
        assertTrue(out[2] > 0.40, "a hand is a statement about sight, not about chess")
    }

    @Test
    fun `the coverage column rides through untouched`() {
        val probs = doubleArrayOf(0.6, 0.35, 0.05, 0.42)
        val out = applyPrior(probs, CLASSES, setOf("empty"), 4.0)
        assertEquals(0.42, out[3], 1e-12)
        assertEquals(1.0, out.take(CLASSES.size).sum(), 1e-9)
    }

    @Test
    fun `observationFromProbs defaults to the pixels alone`() {
        val rows = Array(ALL_SQUARES.size) { floatArrayOf(0.05f, 0.60f, 0.35f) }
        val plain = observationFromProbs(rows, CLASSES)
        val zeroed = observationFromProbs(rows, CLASSES, possibleLabels(STARTPOS), 0.0)
        assertEquals(plain.label, zeroed.label)
        assertEquals(plain.conf, zeroed.conf)
    }

    @Test
    fun `the prior reaches the label through observationFromProbs`() {
        val rows = Array(ALL_SQUARES.size) { floatArrayOf(0.05f, 0.60f, 0.35f) }
        val obs = observationFromProbs(rows, CLASSES, possibleLabels(STARTPOS), 4.0)
        assertEquals("empty", obs.label("a5"))
        assertEquals("bR", obs.label("a8"))
    }

    @Test
    fun `before after prior keeps an invalid pawn for recovery`() {
        val classes = listOf("empty", "wP", "wN")
        val rows = mapOf("e5" to doubleArrayOf(0.05, 0.90, 0.05))
        val possible = mapOf("e5" to setOf("empty", "wN"))

        val after = observationFromProbs(rows, classes, possible, priorLambda = 4.0)

        assertEquals("empty", after.label("e5"), "AFTER: verify sees an allowed label")
        assertEquals("wP", after.rawObservation().label("e5"), "BEFORE: recovery still sees the pawn")
        assertEquals(0.90, after.invalidMass("e5"), 1e-12, "explicit none-of-allowed evidence")
        assertTrue(after.invalidConfident("e5", 0.85))
        assertFalse(after.labelConfident("e5", 0.85), "invalid must not force the allowed label")
        assertTrue(after.rawObservation().labelConfident("e5", 0.85), "recovery keeps the confident pawn")
    }

    @Test
    fun `invalid mass exists when conditioning is disabled`() {
        val obs =
            observationFromProbs(
                mapOf("e5" to doubleArrayOf(0.05, 0.90, 0.05)),
                listOf("empty", "wP", "wN"),
                mapOf("e5" to setOf("empty", "wN")),
                priorLambda = 0.0,
            )

        assertEquals("wP", obs.label("e5"))
        assertTrue(obs.rawObservation() === obs)
        assertEquals(0.90, obs.invalidMass("e5"), 1e-12)
    }

    @Test
    fun `historical replay mode trusts the forced conditioned label`() {
        val safe =
            observationFromProbs(
                mapOf("e5" to doubleArrayOf(0.10, 0.90, 0.0)),
                listOf("empty", "wP", "wN"),
                mapOf("e5" to setOf("empty", "wN")),
                priorLambda = 4.0,
            )

        val old = safe.withoutPriorSafety()

        assertEquals("empty", old.label("e5"))
        assertTrue(old.labelConfident("e5", 0.85), "old mode accepts the prior-forced label")
        assertTrue(old.rawObservation() === old, "old recovery also receives the conditioned view")
        assertEquals(0.0, old.invalidMass("e5"), 1e-12)
    }

    private companion object {
        val CLASSES = listOf("empty", "bB", "bR")
    }
}
