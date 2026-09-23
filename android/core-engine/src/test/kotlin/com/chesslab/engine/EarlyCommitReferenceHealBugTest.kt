package com.chesslab.engine

import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test

/** Die Heilung verlangt `!motionSinceRef`, feuert also nie, wenn der Gegner INNERHALB des Halts antwortet.
 *  Lasttragend: die gemessene Commit-Latenz entstand auf diesem Weg (`docs/bug-audit-2026-09-13.md` E2). */
@Disabled("BUG: E2 — a provisional reference is never healed once the opponent moves inside the hold")
class EarlyCommitReferenceHealBugTest {
    @Test
    fun aProvisionalReferenceIsHealedEvenWhenTheOpponentAnsweredInsideTheHold() {
        val state = EngineState(testConfig(), STARTPOS, whitePov = true)
        val captured = mutableListOf<GrayImage>()
        val loop =
            FrameLoop(state) { cur, curBgr ->
                captured += cur
                state.refGray = cur
                state.refBgr = curBgr
                state.refFen = state.board.fen()
            }
        feed(loop, seq = 1)
        state.refProvisionalUntil = state.nowS + HOLD_S
        state.motionSinceRef = true
        state.refHoldUntil = state.nowS

        repeat(SETTLE) { feed(loop, seq = 2L + it) }

        assertEquals(
            0.0,
            state.refProvisionalUntil,
            "the provisional reference still carries the hand: the heal is gated on `!motionSinceRef`, " +
                "and the opponent's answer set exactly that flag",
        )
    }

    private fun feed(
        loop: FrameLoop,
        seq: Long,
    ) = loop.step(
        FrameInput(
            seq = seq,
            grayDet = grayFrame(),
            bgrDet = bgrFrame(),
            corners = floatArrayOf(0f, 0f, EDGE, 0f, EDGE, EDGE, 0f, EDGE),
            motionRoiScore = 0.0,
            gridLineCoverage = 1.0,
            lumaPreClahe = LUMA,
            timestampMs = seq * FRAME_MS,
        ),
    )

    private companion object {
        const val EDGE = 400f
        const val LUMA = 128.0
        const val FRAME_MS = 100L
        const val HOLD_S = 0.2
        const val SETTLE = 8
    }
}
