package com.chesslab.tracker.speech

import com.chesslab.tracker.speech.SpeechVerbosity.LETTERS
import com.chesslab.tracker.speech.SpeechVerbosity.WORDS
import com.chesslab.tracker.speech.SpeechVerbosity.WORDS_WITH_SIDE
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** SAN is the only input the announcer gets; everything a listener hears is decided here. */
class MovePhraseTest {
    @Test
    fun phraseWordsMode() {
        assertEquals("Knight f3", MovePhrase.of("Nf3", 1, WORDS))
        // The pawn is not named: "e takes d5" is how a player says it, "pawn e takes d5" is not.
        assertEquals("e takes d5", MovePhrase.of("exd5", 2, WORDS))
        assertEquals("e4", MovePhrase.of("e4", 1, WORDS))
    }

    @Test
    fun phraseLettersMode() {
        assertEquals("N f 3", MovePhrase.of("Nf3", 1, LETTERS))
        assertEquals("e takes d 5", MovePhrase.of("exd5", 2, LETTERS))
    }

    @Test
    fun phraseCastling() {
        assertEquals("castles kingside", MovePhrase.of("O-O", 1, WORDS))
        assertEquals("castles kingside", MovePhrase.of("0-0", 1, LETTERS))
        assertEquals("castles queenside", MovePhrase.of("O-O-O", 2, WORDS))
        assertEquals("castles queenside", MovePhrase.of("0-0-0", 2, WORDS))
        // No "plays" in front of a castle.
        assertEquals("White castles kingside", MovePhrase.of("O-O", 1, WORDS_WITH_SIDE))
    }

    @Test
    fun phraseCheckAndMate() {
        assertEquals("Knight f3, check", MovePhrase.of("Nf3+", 1, WORDS))
        assertEquals("Queen h7, checkmate", MovePhrase.of("Qh7#", 1, WORDS))
        assertEquals("castles kingside, check", MovePhrase.of("O-O+", 1, WORDS))
    }

    @Test
    fun phrasePromotion() {
        assertEquals("e8 promotes to queen, check", MovePhrase.of("e8=Q+", 1, WORDS))
        assertEquals("e 8 promotes queen, check", MovePhrase.of("e8=Q+", 1, LETTERS))
        assertEquals("d takes e8 promotes to knight", MovePhrase.of("dxe8=N", 1, WORDS))
    }

    @Test
    fun phraseDisambiguation() {
        assertEquals("Knight b d2", MovePhrase.of("Nbd2", 1, WORDS))
        assertEquals("Rook 1 e2", MovePhrase.of("R1e2", 1, WORDS))
        assertEquals("Queen h4 takes e1", MovePhrase.of("Qh4xe1", 2, WORDS))
    }

    @Test
    fun phraseSideFromPlyParity() {
        assertEquals("White plays knight f3", MovePhrase.of("Nf3", 1, WORDS_WITH_SIDE))
        assertEquals("Black plays knight f3", MovePhrase.of("Nf3", 2, WORDS_WITH_SIDE))
        assertEquals("White plays knight f3", MovePhrase.of("Nf3", 3, WORDS_WITH_SIDE))
    }

    @Test
    fun phraseGerman() {
        assertEquals("Springer f3", MovePhrase.of("Nf3", 1, WORDS, "de-DE"))
        assertEquals("e schlägt d5, Schach", MovePhrase.of("exd5+", 2, WORDS, "de"))
        assertEquals("kurze Rochade", MovePhrase.of("O-O", 1, WORDS, "de-DE"))
        assertEquals("und 3 weitere Züge", MovePhrase.moreMoves(3, "de-DE"))
    }

    @Test
    fun phraseUnknownLocaleFallsBackToEnglish() {
        assertEquals("Knight f3", MovePhrase.of("Nf3", 1, WORDS, "fr-CA"))
        assertEquals("and 7 more moves", MovePhrase.moreMoves(7, "fr-CA"))
    }
}
