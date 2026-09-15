package com.chesslab.engine

import com.github.bhlangonijr.chesslib.Square
import com.github.bhlangonijr.chesslib.move.Move
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

// `_detect_guards` (`tracker.py`) + `_corners_jumped`.
//
// Scenarios mirrored from `tests/test_move_tracker.py`:
//   test_stale_ref_fen_forces_recapture (:839)          -> staleRefFenForcesRecapture
//   test_valid_move_advances_base_truth_with_fen (:827) -> baseTruthIsImageAndFenPair

private val SQUARE_CORNERS = floatArrayOf(0f, 0f, 400f, 0f, 400f, 400f, 0f, 400f)

class GuardsTest {
    /** With a live, matching reference and no corner history the guards let detection through. */
    @Test
    fun cleanReferencePassesTheGuards() {
        val state = testState()
        val ref = grayFrame()
        state.refGray = ref
        state.refBgr = bgrFrame()
        state.refFen = state.board.fen()

        assertTrue(state.detectGuards())
        assertSame(ref, state.refGray, "a passing guard must not touch the reference")
    }

    /** `test_stale_ref_fen_forces_recapture` — the (image, FEN) pair is dropped as ONE unit. */
    @Test
    fun staleRefFenForcesRecapture() {
        val state = testState()
        state.refGray = grayFrame()
        state.refBgr = bgrFrame()
        state.refFen = "invalid/stale fen not matching board"

        assertFalse(state.detectGuards())
        assertNull(state.refGray)
        assertNull(state.refBgr)
        assertNull(state.refFen)
    }

    /**
     * `test_valid_move_advances_base_truth_with_fen` — the guard side of it: as long as the FEN
     * stamped on the reference equals `board.fen()` the pair is valid; the moment the board moves
     * on without a new reference, it is not.
     */
    @Test
    fun baseTruthIsImageAndFenPair() {
        val state = testState()
        state.refGray = grayFrame(listOf("e2"))
        state.refBgr = bgrFrame()
        state.refFen = state.board.fen()
        assertTrue(state.detectGuards())

        state.board.push(Move(Square.E2, Square.E4))
        assertFalse(state.detectGuards(), "a reference stamped with the pre-move FEN is stale")
        assertNull(state.refGray)
        assertNull(state.refFen)
    }

    /** `:3063` — a pending verify or promotion aborts BEFORE the reference is even looked at. */
    @Test
    fun pendingAbortsWithoutTouchingTheReference() {
        val state = testState()
        val ref = grayFrame()
        state.refGray = ref
        state.refFen = "deliberately stale"
        state.pending =
            PendingVerify(
                ucis = listOf("e2e4"),
                uci = "e2e4",
                fen = STARTPOS,
                cur = grayFrame(),
                curBgr = null,
                frames = 0,
                priorUsed = false,
                seq = 1L,
            )

        assertFalse(state.detectGuards())
        assertSame(ref, state.refGray, "the pending gate must not clear the reference")
        assertNotNull(state.refFen)

        state.pending = null
        state.promoPending =
            PromoPending("e7", "e8", grayFrame(), null, STARTPOS)
        assertFalse(state.detectGuards())
        assertSame(ref, state.refGray)
    }

    /**
     * Named invariant test "geometry invalidation": the jump is measured **axis-wise**, not
     * Euclidean, so 6.1 px on a single corner's single axis already invalidates the base truth
     * while 5.9 px on both axes of every corner does not.
     */
    @Test
    fun cornerJumpBeyondSixPxClearsReference() {
        val thr = testConfig().cornerJumpPx
        assertEquals(6.0, thr, "the fixture threshold is 6.0 px")

        for (axis in 0 until SQUARE_CORNERS.size) {
            val below = testState()
            armReference(below, SQUARE_CORNERS, shift(SQUARE_CORNERS, axis, 5.9f))
            assertTrue(below.detectGuards(), "axis $axis: 5.9 px must keep the reference")
            assertNotNull(below.refGray)

            val above = testState()
            armReference(above, SQUARE_CORNERS, shift(SQUARE_CORNERS, axis, 6.1f))
            assertFalse(above.detectGuards(), "axis $axis: 6.1 px must clear the reference")
            assertNull(above.refGray)
            assertNull(above.refBgr)
            assertNull(above.refFen)
            assertEquals(NOTE_GEOMETRY_SHIFTED, above.note)
            assertEquals(0, above.confirmer.count, "a corner jump resets the confirmer")
            assertNull(above.stuckReason, "a corner jump clears the stuck state")
        }
    }

    /** `:2583-2584` — no reference corners or no current corners is never a jump. */
    @Test
    fun cornersJumpedNeedsBothCornerSets() {
        val state = testState()
        assertFalse(state.cornersJumped())
        state.refCorners = SQUARE_CORNERS
        assertFalse(state.cornersJumped(), "no live corners yet")
        state.refCorners = null
        state.lastCorners = shift(SQUARE_CORNERS, 0, 500f)
        assertFalse(state.cornersJumped(), "no reference corners yet")
    }

    /** Python's `zip(..., strict=False)` stops at the shorter list — a truncated set is not a jump. */
    @Test
    fun cornersJumpedStopsAtTheShorterList() {
        val state = testState()
        state.refCorners = SQUARE_CORNERS
        state.lastCorners = floatArrayOf(0f, 0f)
        assertFalse(state.cornersJumped())
        state.lastCorners = floatArrayOf(100f, 0f)
        assertTrue(state.cornersJumped(), "the one comparable pair still counts")
    }

    /** `_clear_stuck` also resets the recovery confirmer (`tracker.py`). */
    @Test
    fun clearStuckResetsTheRecoveryConfirmer() {
        val state = testState()
        state.markStuck("no_legal_move")
        state.markStuck("no_legal_move")
        assertEquals(2, state.stuckCount, "the streak counts repeats of the SAME reason")
        state.markStuck("too_many_changed")
        assertEquals(1, state.stuckCount, "a different reason restarts the streak at 1")
        state.recoveryConfirmer.feed("e2e4")

        state.clearStuck()
        assertNull(state.stuckReason)
        assertEquals(0, state.stuckCount)
        assertEquals(0, state.recoveryConfirmer.count)
    }

    private fun armReference(
        state: EngineState,
        refCorners: FloatArray,
        liveCorners: FloatArray,
    ) {
        state.refGray = grayFrame()
        state.refBgr = bgrFrame()
        state.refFen = state.board.fen()
        state.refCorners = refCorners
        state.lastCorners = liveCorners
        state.confirmer.feed("e2e4")
        state.markStuck("no_legal_move")
    }

    private fun shift(
        corners: FloatArray,
        index: Int,
        delta: Float,
    ): FloatArray = corners.copyOf().also { it[index] += delta }
}
