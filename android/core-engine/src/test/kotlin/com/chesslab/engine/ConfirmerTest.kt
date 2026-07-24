package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** The `confirm_frames` streak voter (`tracker.py:639`). */
class ConfirmerTest {
    @Test
    fun theSameKeyConfirmsAfterConfirmFrames() {
        val confirmer = Confirmer(2)
        assertFalse(confirmer.feed("a"), "one feed is not enough at confirmFrames = 2")
        assertEquals(1, confirmer.count)
        assertEquals("a", confirmer.key)
        assertTrue(confirmer.feed("a"), "the second identical feed confirms")
        assertEquals(2, confirmer.count)
    }

    @Test
    fun aDifferentKeyRestartsTheStreakAtOne() {
        val confirmer = Confirmer(2)
        confirmer.feed("a")
        confirmer.feed("a")
        assertFalse(confirmer.feed("b"), "a different key restarts at 1, it does not confirm")
        assertEquals(1, confirmer.count)
        assertEquals("b", confirmer.key)
    }

    @Test
    fun feedNullClearsTheCandidateAndTheNextFeedStartsOver() {
        val confirmer = Confirmer(2)
        confirmer.feed("b")
        assertFalse(confirmer.feed(null), "feed(null) never confirms")
        assertEquals(0, confirmer.count)
        assertEquals(null, confirmer.key)
        assertFalse(confirmer.feed("b"), "the streak restarted, so one feed is not enough")
        assertEquals(1, confirmer.count)
    }

    @Test
    fun confirmFramesOfOneConfirmsOnTheFirstFeed() {
        val confirmer = Confirmer(1)
        assertTrue(confirmer.feed("a"))
        assertEquals(1, confirmer.count)
        assertTrue(confirmer.feed("b"), "a fresh key also confirms immediately")
    }

    @Test
    fun resetDropsTheCountMidStreak() {
        val confirmer = Confirmer(3)
        confirmer.feed("a")
        confirmer.feed("a")
        assertEquals(2, confirmer.count)
        confirmer.reset()
        assertEquals(0, confirmer.count)
        assertEquals(null, confirmer.key)
        assertFalse(confirmer.feed("a"), "after reset the streak starts at 1 again")
        assertEquals(1, confirmer.count)
    }

    @Test
    fun aConfirmedStreakKeepsCountingWhileTheKeyStays() {
        val confirmer = Confirmer(2)
        confirmer.feed("a")
        assertTrue(confirmer.feed("a"))
        assertTrue(confirmer.feed("a"), "it stays confirmed")
        assertEquals(3, confirmer.count)
    }
}
