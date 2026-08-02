package com.chesslab.engine

import com.chesslab.engine.api.TrackerEngine
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The runaway of 2026-08-02, read out of the phone's decision log: a three-move CNN recovery bridge
 * (`b5c4 a3c5 c4c5`) was committed at plies 100–102, taken back, and derived and committed again —
 * byte-identically, three times over, with descending rejection plies in between where the user was
 * pressing Undo. *"I tried to recover but it's impossible."*
 *
 * The mechanism is not a threshold: an undo moves the APP's position, the CNN reads the BOARD, and
 * an undo does not move a physical board. The same question therefore gets the same correct answer
 * on the very next observation. Nothing carried the human rejection into the recovery path, so the
 * loop could not be won by any number of presses.
 */
class TakenBackTest {
    private val bridge = listOf("e2e4", "e7e5", "g1f3")

    /** The board never changes, so the stub derives the same bridge from whatever it is asked. */
    private fun looped(moves: List<String> = bridge): Pair<TrackerEngine, RecoveryEvaluator> {
        val engine = TrackerEngine(recoveryConfig(), STARTPOS)
        val cnn = RecoveryEvaluator(moves = moves, agreement = 0.95)
        engine.attachCnn(cnn)
        return engine to cnn
    }

    private fun TrackerEngine.observe(seq: Long) {
        state.armed()
        onCnnSnapshot(recoverySnap(state, obsForBoard(state.board), seq, gray = grayFrame()))
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

    /**
     * The live shape, which is harder than the one above: an ordinary move had already landed on top
     * of the bridge, so `lastCommitSize` belonged to THAT move and the bridge came back one press
     * per ply — which is what the log's descending ply numbers 103, 102, 101 were. Only a line that
     * accumulates across consecutive presses spans a take-back like that.
     */
    @Test
    fun theVetoSpansAPressPerPlyTakeBackWithAMoveOnTopOfTheBridge() {
        val (engine, _) = looped()
        val state = engine.state
        engine.observe(seq = 1)
        state.commitMove(moveOf(state, "b8c6"), grayFrame(), null)
        assertEquals(4, state.history.size, "precondition: three bridged plies plus one ordinary move")

        repeat(4) { engine.undo() }
        assertEquals(emptyList<String>(), state.history)
        assertEquals(listOf("e2e4", "e7e5", "g1f3", "b8c6"), state.takenBack!!.ucis)

        engine.observe(seq = 2)

        // The bridge is a strict PREFIX of what was taken back, which is the normal case: the user
        // unwinds more than the recovery re-derives.
        assertEquals(emptyList<String>(), state.history, "a prefix of the taken-back line is still rejected")
    }

    /**
     * The mechanism exists because a hand over the board genuinely hides plies, and the user needs
     * three- and four-ply bridges to work. The veto is keyed to the exact line that was rejected, so
     * anything the CNN newly sees from the same position is still committed.
     */
    @Test
    fun aDifferentLineFromTheSamePositionStillCommits() {
        val (engine, cnn) = looped()
        val state = engine.state
        engine.observe(seq = 1)
        engine.undo()

        cnn.moves = listOf("d2d4", "d7d5", "c2c4")
        engine.observe(seq = 2)

        assertEquals(listOf("d4", "d5", "c4"), state.history, "a legitimate bridge must still fire")
        assertNull(state.takenBack, "and committing ends the take-back")
    }

    /** An undo the user did not mean must not strand the tracker — "New baseline" is the way out. */
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

    /** A resync redefines the position, so nothing about the old line describes anything. */
    @Test
    fun aFenResyncReleasesTheVeto() {
        val (engine, _) = looped()
        engine.observe(seq = 1)
        engine.undo()
        assertTrue(engine.state.takenBack != null, "precondition: a line was taken back")

        engine.setFen(STARTPOS)

        assertNull(engine.state.takenBack)
    }

    /**
     * A press that does not continue the previous one starts a new line rather than extending a
     * stale one — otherwise a take-back would grow a tail of moves that were never adjacent to it.
     */
    @Test
    fun aTakeBackFromSomewhereElseReplacesTheLineInsteadOfExtendingIt() {
        val state = recoveryState()
        state.board.push(moveOf(state, "e2e4"))
        state.history.add("e4")
        state.takeBack(plies = 1)
        assertEquals(listOf("e2e4"), state.takenBack!!.ucis)

        state.board.push(moveOf(state, "d2d4"))
        state.history.add("d4")
        state.takeBack(plies = 1)

        assertEquals(listOf("d2d4"), state.takenBack!!.ucis, "a stale line must not grow a tail")
    }
}
