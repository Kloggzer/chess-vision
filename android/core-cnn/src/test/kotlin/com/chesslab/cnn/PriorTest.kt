package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private const val START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

class PriorTest {
    @Test
    fun `startposition rank 3 admits pawn knight and empty`() {
        val possible = possibleLabels(START_FEN)
        assertEquals(setOf("empty", "wP", "wN"), possible.getValue("a3"))
        assertEquals(setOf("empty", "wP"), possible.getValue("b3"))
        assertEquals(setOf("empty", "wP", "wN"), possible.getValue("h3"))
    }

    @Test
    fun `ranks black cannot reach in one white half-move stay empty`() {
        val possible = possibleLabels(START_FEN)
        for (square in ALL_SQUARES.filter { it[1] == '5' || it[1] == '6' }) {
            assertEquals(setOf("empty"), possible.getValue(square), square)
        }
    }

    @Test
    fun `black back rank is pinned to one label each`() {
        val possible = possibleLabels(START_FEN)
        assertEquals(setOf("bR"), possible.getValue("a8"))
        assertEquals(setOf("bK"), possible.getValue("e8"))
        assertEquals(setOf("bP"), possible.getValue("a7"))
    }

    @Test
    fun `the resting placement is always in the set`() {
        val possible = possibleLabels(START_FEN)
        for ((square, label) in expectedLabels(boardOf(START_FEN))) {
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
    fun `an illegal favourite loses to the legal runner-up`() {
        // 60 % bB against 35 % bR — today's argmax says bB and confThr 0.85 drops the square.
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
        val zeroed = observationFromProbs(rows, CLASSES, possibleLabels(START_FEN), 0.0)
        assertEquals(plain.label, zeroed.label)
        assertEquals(plain.conf, zeroed.conf)
    }

    @Test
    fun `the prior reaches the label through observationFromProbs`() {
        val rows = Array(ALL_SQUARES.size) { floatArrayOf(0.05f, 0.60f, 0.35f) }
        val obs = observationFromProbs(rows, CLASSES, possibleLabels(START_FEN), 4.0)
        // a5 can only be empty after one white half-move, so the 5 % class wins there.
        assertEquals("empty", obs.label("a5"))
        assertEquals("bR", obs.label("a8"))
    }

    private companion object {
        val CLASSES = listOf("empty", "bB", "bR")
    }
}
