package com.chesslab.engine

import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.api.TrackerEvent
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test

/** White to move with a pawn one step from promoting — the only position this bug can be read on. */
private const val PROMOTION_FEN = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1"

/** Bug-Audit E1: `choosePromotion` geht direkt in `commitMove` und sieht weder LL-Boden noch
 *  Bewegungs- noch Hand-Gatter. Lasttragend — jede Replay-Bilanz entstand mit diesem Weg offen,
 *  also erst nach dem A/B am Regressionssatz (`docs/bug-audit-2026-09-13.md`). */
@Disabled("BUG: E1 — the promotion answer commits without the LL floor, motion and hand gates")
class PromotionSkipsCommitGatesBugTest {
    @Test
    fun aPromotionAnsweredOnEvidenceBelowTheFloorIsNotCommitted() {
        val config = testConfig().copy(commitLlFloor = FLOOR)
        val engine = TrackerEngine(config, PROMOTION_FEN)
        val state = engine.state
        state.nowS = 1000.0
        state.bestScore = FLOOR / 2
        state.raisePromotionPrompt(state.legalMoveFor("a7a8q")!!, grayFrame(), bgrFrame())

        val events = engine.choosePromotion('q')

        assertTrue(
            events.none { it is TrackerEvent.MoveCommitted },
            "evidence below the commit floor committed anyway, because the promotion answer never " +
                "passes `commitGates` — it calls `commitMove` directly",
        )
    }

    private companion object {
        const val FLOOR = 1.0
    }
}
