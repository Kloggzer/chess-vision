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
        // Two distinct snapshots per "look at the board": a bridge needs RECOVERY_MIN_VOTES
        // agreeing glances since specs/39 phase 02, and one snapshot is one vote.
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

    /** …and the user's own resolutions are. */
    @Test
    fun aBaselineReleasesTheHold() {
        val (engine, _) = looped()
        engine.observe(seq = 1)
        engine.undo()
        assertTrue(engine.state.takenBack != null)
        engine.captureBaseline()
        assertEquals(null, engine.state.takenBack)
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
        assertEquals(STARTPOS, state.takenBack)

        engine.observe(seq = 2)

        assertEquals(emptyList<String>(), state.history, "the position undone to is held")
    }

    /**
     * REVERSED on the evening it shipped, by the phone.
     *
     * This used to assert the opposite — that a different line from the same position still commits,
     * on the reasoning that a new line is new evidence. The live game says no: the CNN produced two
     * different four-move bridges from the same standoff (`g3h3 d6d5 h3f3 d5e4`, then
     * `h5f3 c8h3 f3g3 a8c8`), the line-keyed veto never fired once, and the second bridge committing
     * also cleared the record guarding the first. "A different line" was not new evidence; it was
     * the same disagreement read a second way.
     *
     * So the hold is keyed to the POSITION. An undo says "the game is here", and nothing derived
     * from the CNN may move it away from there until the user resolves the disagreement.
     *
     * The cost is real and deliberate: a legitimate bridge offered at exactly that position is held
     * too, and the tracker stalls with a note naming the way out instead of running away. Multi-ply
     * bridges are NOT restricted anywhere else — `recoveryMaxPlies` is untouched and a hold only
     * exists at a position an undo returned to.
     */
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
}
