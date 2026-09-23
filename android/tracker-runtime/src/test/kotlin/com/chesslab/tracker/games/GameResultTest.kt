package com.chesslab.tracker.games

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Total on purpose: nothing on the read path may throw over a game somebody wants to look at. */
class GameResultTest {
    @Test
    fun everyTagRoundTrips() {
        GameResult.entries.forEach { assertEquals(it, GameResult.of(it.tag), it.name) }
    }

    @Test
    fun theTagsAreThePgnSpellings() {
        assertEquals("1-0", GameResult.WHITE.tag)
        assertEquals("0-1", GameResult.BLACK.tag)
        assertEquals("1/2-1/2", GameResult.DRAW.tag)
        assertEquals("*", GameResult.UNFINISHED.tag)
    }

    @Test
    fun anythingUnrecognisedIsUnfinished() {
        assertEquals(GameResult.UNFINISHED, GameResult.of(""))
        assertEquals(GameResult.UNFINISHED, GameResult.of("1-O"), "a letter O for a zero")
        assertEquals(GameResult.UNFINISHED, GameResult.of("0.5-0.5"))
    }

    @Test
    fun theBoardReportsTheSameFourOutcomes() {
        assertEquals(
            GameResult.UNFINISHED,
            resultFromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"),
        )
        assertEquals(
            GameResult.BLACK,
            resultFromFen("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"),
        )
    }
}
