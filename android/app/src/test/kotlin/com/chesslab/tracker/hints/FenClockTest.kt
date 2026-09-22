package com.chesslab.tracker.hints

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Was auf dem Geraet entscheidet, ob eine Stellung das Rueckzieher-Fenster ueberlebt hat. */
class FenClockTest {
    @Test
    fun aStandingPositionAccumulatesTime() {
        var now = 1_000L
        val clock = FenClock { now }
        assertEquals(0L, clock.steadyMs(FEN))
        now += HINT_SETTLE_MS
        assertEquals(HINT_SETTLE_MS, clock.steadyMs(FEN))
    }

    @Test
    fun aNewPositionRestartsTheStamp() {
        var now = 1_000L
        val clock = FenClock { now }
        clock.steadyMs(FEN)
        now += 10_000L
        assertEquals(0L, clock.steadyMs(OTHER))
        now += 1L
        assertEquals(1L, clock.steadyMs(OTHER))
    }
}

private const val FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1"

private const val OTHER = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 2"
