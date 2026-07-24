package com.chesslab.cnn

import com.chesslab.engine.api.BgrImage
import com.github.bhlangonijr.chesslib.Board
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class FakeSquareClassifierTest {
    @Test
    fun `the fake observes exactly its own FEN`() {
        val fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
        val obs = FakeSquareClassifier(fen).observe()
        val board = Board().also { it.loadFromFen(fen) }
        assertEquals(expectedLabels(board), obs.label, "labels")
        assertEquals(expectedOccupancy(board), ALL_SQUARES.associateWith { obs.occupied(it) }, "occupancy")
        assertTrue(obs.confidentSquares(0.85).size == ALL_SQUARES.size, "all squares confident at 0.99")
    }

    @Test
    fun `classify returns one probability row per crop in allSquares order`() {
        val fake = FakeSquareClassifier("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
        val crops = List(ALL_SQUARES.size) { BgrImage(1, 1, ByteArray(3)) }
        val probs = fake.classify(crops)
        assertEquals(ALL_SQUARES.size, probs.size)
        assertEquals(EXPECTED_CLASSES.size, probs.first().size)
        val obs = observationFromProbs(probs, fake.classes)
        assertEquals("wR", obs.label("a1"))
        assertEquals("empty", obs.label("a4"))
    }

    @Test
    fun `overrides model a chronic misread`() {
        val fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        val obs = FakeSquareClassifier(fen, overrides = mapOf("g1" to ("wB" to 0.9))).observe()
        assertEquals("wB", obs.label("g1"))
        assertClose(0.9, obs.conf("g1"), "override confidence")
        assertEquals("wN", obs.label("b1"), "other squares are untouched")
    }
}
