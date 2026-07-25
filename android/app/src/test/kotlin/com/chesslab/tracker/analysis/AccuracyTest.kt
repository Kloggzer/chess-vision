package com.chesslab.tracker.analysis

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class AccuracyTest {
    @Test
    fun classifyThresholds() {
        assertEquals(MoveQuality.BEST, classify(9))
        assertEquals(MoveQuality.GOOD, classify(10))
        assertEquals(MoveQuality.GOOD, classify(49))
        assertEquals(MoveQuality.INACCURACY, classify(50))
        assertEquals(MoveQuality.INACCURACY, classify(99))
        assertEquals(MoveQuality.MISTAKE, classify(100))
        assertEquals(MoveQuality.MISTAKE, classify(249))
        assertEquals(MoveQuality.BLUNDER, classify(250))
    }

    @Test
    fun negativeLossGradesBest() {
        assertEquals(MoveQuality.BEST, classify(-40))
    }

    @Test
    fun bookOverridesEveryBand() {
        assertEquals(MoveQuality.BOOK, classify(900, isBookPly = true))
    }

    @Test
    fun cpLossIsFromTheMoversPointOfView() {
        // White stood +50 and now stands +10: a 40 cp loss for White.
        assertEquals(40, cpLoss(beforeWhitePov = 50, afterWhitePov = 10, whiteMoved = true))
        // Black stood -50 (good for Black) and now stands -10: the same 40 cp loss, for Black.
        assertEquals(40, cpLoss(beforeWhitePov = -50, afterWhitePov = -10, whiteMoved = false))
    }
}
