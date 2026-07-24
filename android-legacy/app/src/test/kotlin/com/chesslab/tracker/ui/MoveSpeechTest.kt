package com.chesslab.tracker.ui

import com.chesslab.tracker.service.MoveSpeech
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class MoveSpeechTest {
    @Test
    fun `piece move names the side and piece`() {
        assertEquals("White plays knight f3", MoveSpeech.describe("Nf3", ply = 3))
        assertEquals("Black plays pawn e5", MoveSpeech.describe("e5", ply = 2))
    }

    @Test
    fun `castling and captures and check`() {
        assertEquals("White castles kingside", MoveSpeech.describe("O-O", ply = 5))
        assertTrue(MoveSpeech.describe("Qxe5+", ply = 1).contains("queen takes e5"))
        assertTrue(MoveSpeech.describe("Qxe5+", ply = 1).endsWith("check"))
        assertTrue(MoveSpeech.describe("e8=Q", ply = 1).contains("promotes to queen"))
        assertTrue(MoveSpeech.describe("Rd8#", ply = 1).endsWith("checkmate"))
    }
}
