package com.chesslab.engine

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.tryDetect
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class EndpointCandidateTest {
    /** Asserts the DESTINATION, as Python does: `b8c6` and `c7c6` score identically, and a tie is not
     *  order-comparable between chesslib and python-chess. Adding a tie-break Python lacks is forbidden. */
    @Test
    fun unambiguousEndpoint() {
        val state = hypothesisState(AFTER_E4)
        val z = zOf("c6" to HOT)
        val scored = loglikScores(state.board, z, state.config.zThr, LL_K)

        val move = state.singleEndpointCandidate(z, scored, DUMMY_GRAY, null)

        assertNotNull(move)
        assertEquals("c6", Squares.ALL[move!!.to.ordinal])
    }

    @Test
    fun noneWhenMultipleStrongSquares() {
        val state = hypothesisState()
        val z = zOf("c6" to HOT, "e4" to HOT)
        val scored = loglikScores(state.board, z, state.config.zThr, LL_K)

        assertNull(state.singleEndpointCandidate(z, scored, DUMMY_GRAY, null))
    }

    @Test
    fun noneWhenNoStrongSquare() {
        val state = hypothesisState(AFTER_E4)
        val z = zOf("c6" to state.config.zThr - 0.01)
        val scored = loglikScores(state.board, z, state.config.zThr, LL_K)

        assertNull(state.singleEndpointCandidate(z, scored, DUMMY_GRAY, null))
    }

    @Test
    fun shadowVetoedDestinationYieldsNull() {
        val state = hypothesisState(AFTER_E4)
        val z = zOf("c6" to HOT)
        val scored = loglikScores(state.board, z, state.config.zThr, LL_K)
        state.shadowVetoed = ofSquares("c6")

        assertNull(state.singleEndpointCandidate(z, scored, DUMMY_GRAY, null))
    }

    /** Rivals to the SAME destination do not make it ambiguous. `cands` holds only the ONE strong square, so
     *  Python's "different destination" loop can never fire — asserted from both sides. */
    @Test
    fun rivalsToTheSameDestinationDoNotBlock() {
        val state = hypothesisState(TWO_KNIGHTS)
        val z = zOf("d2" to HOT)
        val scored = loglikScores(state.board, z, state.config.zThr, LL_K)

        val move = state.singleEndpointCandidate(z, scored, DUMMY_GRAY, null)

        assertNotNull(move)
        assertEquals("d2", Squares.ALL[move!!.to.ordinal])
        val rivals = scored.filter { it.second > 0.0 && Squares.ALL[it.first.to.ordinal] == "d2" }
        assertTrue(rivals.size > 1, "the position must offer several ways to reach d2")
        assertTrue(
            rivals.all { Squares.ALL[it.first.to.ordinal] == "d2" },
            "with one strong square every candidate shares its destination",
        )
    }

    /** `vote = false` skips confirmer and LL floor: the CNN verify IS its confirmation. */
    @Test
    fun voteFalseSkipsConfirmerAndFloor() {
        val state = cnnState(AFTER_E4)
        val z = zOf("c6" to HOT)
        state.armDetection(changed = setOf("c6"))
        val moves = state.scoreViableMoves(z)
        assertNull(moves.obsMove, "no single move fits — the origin is below the viability gate")

        val cand = state.generateHypothesis(z, moves, DUMMY_GRAY, null)

        assertNotNull(cand)
        assertFalse(cand!!.vote)
        assertEquals(1, cand.moves.size)
        assertEquals("c6", Squares.ALL[cand.moves[0].to.ordinal])
        assertEquals(false, cand.priorUsed)
        assertTrue(cand.note!!.startsWith("low-contrast move "))
        assertTrue(cand.note!!.endsWith("? verifying via CNN…"))
    }

    /** `a7a8{q,r,b,n}` sind ueber Belegtheit identisch: CNN-Verify haette die Variante des Generators bestaetigt. */
    @Test
    fun aPromotionEndpointAsksInsteadOfHandingOneVariantToVerify() {
        val state = cnnState(PROMOTION)
        val z = zOf("a8" to HOT)
        val scored = loglikScores(state.board, z, state.config.zThr, LL_K)

        assertNull(state.singleEndpointCandidate(z, scored, DUMMY_GRAY, null))
        assertEquals("a7", state.promoPending?.from)
        assertEquals("a8", state.promoPending?.to)
    }

    @Test
    fun aPromotionEndpointRaisesThePromptThroughTryDetect() {
        val state = detectState(fen = PROMOTION, ref = grayFrame())
        state.cnnRun = true

        val events = state.tryDetect(grayFrame(listOf("a8")), null, seq = 1)

        assertNull(state.pending, "no occupancy-identical variant may reach the verifier")
        assertEquals("a7", state.promoPending?.from)
        assertTrue(events.any { it is TrackerEvent.PromotionPending }, "events were $events")
    }

    @Test
    fun withoutCnnThereIsNoEndpointCandidate() {
        val state = hypothesisState(AFTER_E4)
        val z = zOf("c6" to HOT)
        state.armDetection(changed = setOf("c6"))
        val moves = state.scoreViableMoves(z)

        val cand = state.generateHypothesis(z, moves, DUMMY_GRAY, null)

        assertNull(cand)
        assertEquals(STUCK_NO_LEGAL_MOVE, state.stuckReason)
    }

    private companion object {
        const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
        const val TWO_KNIGHTS = "rnbqkb1r/ppp2ppp/4pn2/3p4/3P4/4PN2/PPP2PPP/RNBQKB1R w KQkq - 0 4"
        const val PROMOTION = "8/P6k/8/8/8/8/7K/8 w - - 0 1"
    }
}

internal fun cnnState(fen: String = STARTPOS): EngineState {
    val state = EngineState(TrackerConfig(cnnVerify = true), fen, whitePov = true)
    state.cnnRun = true
    return state
}
