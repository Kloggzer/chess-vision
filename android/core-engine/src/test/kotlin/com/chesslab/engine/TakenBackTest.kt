package com.chesslab.engine

import com.chesslab.engine.api.TrackerEngine
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** An undo moves the APP, the CNN reads the BOARD: the same question got the same answer on the next look,
 *  and a three-move bridge was committed three times while the user pressed Undo. */
class TakenBackTest {
    private val bridge = listOf("e2e4", "e7e5", "g1f3")

    private fun looped(moves: List<String> = bridge): Pair<TrackerEngine, RecoveryEvaluator> {
        val engine = TrackerEngine(recoveryConfig(), STARTPOS)
        val cnn = RecoveryEvaluator(moves = moves, agreement = 0.95)
        engine.attachCnn(cnn)
        return engine to cnn
    }

    private fun TrackerEngine.observe(seq: Long) {
        state.armed()
        // Two snapshots per look: a bridge needs RECOVERY_MIN_VOTES agreeing glances, one snapshot is one vote.
        onCnnSnapshot(recoverySnap(state, obsForBoard(state.board), seq * 2, gray = grayFrame()))
        onCnnSnapshot(recoverySnap(state, obsForBoard(state.board), seq * 2 + 1, gray = grayFrame()))
    }

    @Test
    fun anUndoneBridgeIsNotDerivedStraightBackOntoTheBoard() {
        val (engine, _) = looped()
        val state = engine.state
        engine.observe(seq = 1)
        assertEquals(listOf("e4", "e5", "Nf3"), state.history, "precondition: the bridge committed")

        engine.undo()
        assertEquals(emptyList<String>(), state.history)

        engine.observe(seq = 2)

        assertEquals(emptyList<String>(), state.history, "the same bridge must not come back")
        assertTrue(state.note!!.startsWith(NOTE_TAKEN_BACK_PREFIX), state.note!!)
        assertTrue(state.note!!.endsWith(NOTE_TAKEN_BACK_WAY_OUT), "the note must name a way out: ${state.note}")
    }

    /** A commit is deliberately not an exit: clearing on commit is what freed the first bridge. */
    @Test
    fun anOrdinaryCommitDoesNotReleaseTheHold() {
        val (engine, _) = looped()
        val state = engine.state
        engine.observe(seq = 1)
        engine.undo()
        val held = state.takenBack
        state.commitMove(moveOf(state, "b1c3"), grayFrame(), null)
        assertEquals(held, state.takenBack, "a commit must not clear the hold")
    }

    @Test
    fun aBaselineReleasesTheHold() {
        val (engine, _) = looped()
        engine.observe(seq = 1)
        engine.undo()
        assertTrue(engine.state.takenBack != null)
        engine.captureBaseline()
        assertEquals(null, engine.state.takenBack)
    }

    /** The live shape: a move had landed on the bridge, so `lastCommitSize` was THAT move's and the bridge came back
     *  one press per ply. Only a line accumulated across consecutive presses spans it. */
    @Test
    fun theVetoSpansAPressPerPlyTakeBackWithAMoveOnTopOfTheBridge() {
        val (engine, _) = looped()
        val state = engine.state
        engine.observe(seq = 1)
        state.commitMove(moveOf(state, "b8c6"), grayFrame(), null)
        assertEquals(4, state.history.size, "precondition: three bridged plies plus one ordinary move")

        repeat(4) { engine.undo() }
        assertEquals(emptyList<String>(), state.history)
        assertEquals(STARTPOS, state.takenBack)

        engine.observe(seq = 2)

        assertEquals(emptyList<String>(), state.history, "the position undone to is held")
    }

    /** The hold is keyed to the POSITION: the CNN produced two different bridges from one standoff, and "a
     *  different line" was the same disagreement read twice. A legitimate bridge at exactly that position is
     *  held too — deliberately; nothing else is restricted. */
    @Test
    fun aDifferentLineFromTheSamePositionIsHeldToo() {
        val (engine, cnn) = looped()
        val state = engine.state
        engine.observe(seq = 1)
        engine.undo()

        cnn.moves = listOf("d2d4", "d7d5", "c2c4")
        engine.observe(seq = 2)

        assertEquals(emptyList<String>(), state.history, "any bridge is held at the position undone to")
        assertTrue(state.takenBack != null, "and the hold survives — only the user releases it")
    }

    /** An unmeant undo must not strand the tracker — "New baseline" is the way out. */
    @Test
    fun aNewBaselineReleasesTheVeto() {
        val (engine, _) = looped()
        val state = engine.state
        engine.observe(seq = 1)
        engine.undo()
        engine.observe(seq = 2)
        assertEquals(emptyList<String>(), state.history, "precondition: the veto is holding")

        engine.captureBaseline()
        assertNull(state.takenBack)
        engine.observe(seq = 3)

        assertEquals(listOf("e4", "e5", "Nf3"), state.history, "the user asserted the board is right")
    }

    @Test
    fun aFenResyncReleasesTheVeto() {
        val (engine, _) = looped()
        engine.observe(seq = 1)
        engine.undo()
        assertTrue(engine.state.takenBack != null, "precondition: a line was taken back")

        engine.setFen(STARTPOS)

        assertNull(engine.state.takenBack)
    }
}
