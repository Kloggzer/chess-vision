package com.chesslab.tracker.games

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * The result is a fact with four values; the tag is only how PGN spells it.
 *
 * [GameResult.of] is the boundary between the two, and it is total on purpose: `StoredGame.result`
 * is a plain string on disk and a file may be old, hand-edited or written by something else.
 * Nothing on the read path may throw over a game somebody wants to look at.
 */
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

    /**
     * The tags `resultFromFen` writes are exactly the ones this type knows.
     *
     * It still returns a `String` — phase 01 is what gives it the type, and this pin is what makes
     * that change a rename rather than a discovery.
     */
    @Test
    fun whatTheBoardReportsIsAlwaysAKnownTag() {
        val start = resultFromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
        assertEquals(GameResult.UNFINISHED, GameResult.of(start))
        // Fool's mate: White is mated, so Black won.
        val mated = resultFromFen("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3")
        assertEquals(GameResult.BLACK, GameResult.of(mated))
    }
}
