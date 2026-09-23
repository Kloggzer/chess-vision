package com.chesslab.engine

import com.chesslab.engine.api.TrackerEvent
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** The seam no test drove: `legalMoveFor` resolved against the CURRENT position, the reply's from-square
 *  still held an enemy piece, and every pair reached the verifier as a single. The commit then anchored
 *  on a frame showing BOTH half-moves — a silent, permanent one-ply desync, only with a CNN attached. */
class VerifyPairSeamTest {
    @Test
    fun `a pending pair ignores evidence from a different position`() {
        val state = pairState(ucis = listOf("e2e4", "e7e5"))
        val after = afterFen(state, pairMoves(state, listOf("e2e4", "e7e5")))
        val cnn = PairRecovery(matchFen = after)
        val wrong = snapshotOf(state, PairObs(emptyMap())).copy(fen = after, seq = 10)
        assertTrue(VerifySingle.tick(state, cnn, wrong).isEmpty())
        assertEquals(STARTPOS, state.board.fen())
        assertNotNull(state.pending)
        assertEquals(0, state.pending!!.frames)
        val fresh = wrong.copy(fen = STARTPOS, seq = 11)
        assertTrue(VerifySingle.tick(state, cnn, fresh).any { it is TrackerEvent.SequenceCommitted })
        assertEquals(after, state.board.fen())
    }

    @Test
    fun `a pending pair reaches the pair verifier and commits both half-moves`() {
        val state = pairState(ucis = listOf("e2e4", "e7e5"))
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        val after = afterFen(state, moves)
        val cnn = PairRecovery(matchFen = after)

        val events = VerifySingle.tick(state, cnn, snapshotOf(state, PairObs(emptyMap())))

        val committed = events.filterIsInstance<TrackerEvent.SequenceCommitted>().firstOrNull()
        assertNotNull(committed, "a pair must commit as a sequence, not as its first half: $events")
        assertEquals(DECIDER_CNN_PAIR, committed!!.decider)
        assertEquals(after, state.board.fen(), "both half-moves must be on the board")
    }

    /** Dieselbe Belegtheit nach `f3e5 c6e5` und `f3e5 c6d4`: getrennt nur durch die FARBE auf e5 — live das falsche committet. */
    @Test
    fun `a pair the model contradicts on colour is discarded`() {
        val state = pairState(fen = CAPTURE_FEN, ucis = listOf("f3e5", "c6d4"))
        val moves = pairMoves(state, listOf("f3e5", "c6d4"))
        val cnn = PairRecovery(matchFen = afterFen(state, moves))
        val obs = PairObs(TOUCHED_OCCUPANCY, TOUCHED, mapOf("e5" to "bN"))

        val events = List(2) { pairTick(state, cnn, moves, obs) }.flatten()

        assertTrue(events.isEmpty(), "ein Farbwiderspruch darf nicht committen: $events")
        assertNull(state.pending, "nach zwei einigen Blicken ist der Kandidat weg")
        assertEquals(CAPTURE_FEN, state.board.fen(), "das Brett darf sich nicht bewegt haben")
    }

    /** Unter der Konfidenzschwelle darf die Farbe nicht kippen: `pairColourConflicts` las `label` ohne `labelConfident`. */
    @Test
    fun `an unsure colour reading does not reject the pair`() {
        val state = pairState(fen = CAPTURE_FEN, ucis = listOf("f3e5", "c6d4"))
        val moves = pairMoves(state, listOf("f3e5", "c6d4"))
        val cnn = PairRecovery(matchFen = afterFen(state, moves))
        val obs = PairObs(TOUCHED_OCCUPANCY, TOUCHED, mapOf("e5" to "bN"), labelSure = emptySet())

        val events = pairTick(state, cnn, moves, obs)

        assertTrue(events.isNotEmpty(), "der Belegtheits-Arm committet wie zuvor: $events")
        assertEquals(DECIDER_CNN_PAIR, state.decisionLog.last().decider)
    }

    /** Ein sicherer Farbwiderspruch entscheidet nie auf EINEN Blick (Invariante 13). */
    @Test
    fun `a confident wrong colour needs two agreeing glances`() {
        val state = pairState(fen = CAPTURE_FEN, ucis = listOf("f3e5", "c6d4"))
        val moves = pairMoves(state, listOf("f3e5", "c6d4"))
        val cnn = PairRecovery(matchFen = afterFen(state, moves))
        val obs = PairObs(TOUCHED_OCCUPANCY, TOUCHED, mapOf("e5" to "bN"))

        assertTrue(pairTick(state, cnn, moves, obs).isEmpty())

        assertNotNull(state.pending, "ein Blick entscheidet nicht gegen den Diff")
        assertEquals("colour", state.pending!!.voteOutcome)
    }

    /** `f3xe5 c6xe5 d4xe5`: das Paar `f3e5 c6d4` erklaert alle vier Felder und schlaegt das richtige — mit einer
     *  Figur auf d4, wo nichts steht. */
    @Test
    fun `a pair that fills a square the model reads as empty is discarded`() {
        val state = pairState(fen = CAPTURE_FEN, ucis = listOf("f3e5", "c6d4"))
        val moves = pairMoves(state, listOf("f3e5", "c6d4"))
        val cnn = PairRecovery(matchFen = afterFen(state, moves))
        val obs = PairObs(TOUCHED_OCCUPANCY + ("d4" to false), TOUCHED, mapOf("e5" to "wP"))

        val events = List(2) { pairTick(state, cnn, moves, obs) }.flatten()

        assertTrue(events.isEmpty(), "ein leer gelesenes Zielfeld darf nicht committen: $events")
        assertNull(state.pending)
        assertEquals(CAPTURE_FEN, state.board.fen(), "das Brett darf sich nicht bewegt haben")
    }

    @Test
    fun `a pair the model confirms on colour still commits`() {
        val state = pairState(fen = CAPTURE_FEN, ucis = listOf("f3e5", "c6d4"))
        val moves = pairMoves(state, listOf("f3e5", "c6d4"))
        val cnn = PairRecovery(matchFen = afterFen(state, moves))
        val obs = PairObs(TOUCHED_OCCUPANCY, TOUCHED, mapOf("e5" to "wN", "d4" to "bN"))

        val events = pairTick(state, cnn, moves, obs)

        assertTrue(events.isNotEmpty(), "ohne Widerspruch muss das Paar durchkommen")
    }

    /** DREI Halbzuege, geprueft wurden zwei: d4 fiel aus `checked`, waehrend das Modell dort sicher eine Figur las. */
    @Test
    fun `a three-ply sequence is checked on every ply`() {
        val state = pairState(fen = CAPTURE_FEN, ucis = THREE_PLY)
        val moves = state.pendingMoves(THREE_PLY)
        assertEquals(3, moves.size, "die Dreier-Folge muss legal sein")
        val cnn = PairRecovery(conflicts = listOf("d4"))
        val obs =
            PairObs(
                mapOf("f3" to false, "c6" to false, "e5" to true, "d4" to true),
                setOf("f3", "c6", "e5", "d4"),
                mapOf("e5" to "wP", "d4" to "wP"),
            )

        val events = pairTick(state, cnn, moves, obs)

        assertTrue(events.isEmpty(), "ein sicher besetztes d4 widerspricht der Folge: $events")
        assertEquals(CAPTURE_FEN, state.board.fen(), "das Brett darf sich nicht bewegt haben")
    }

    @Test
    fun `the reply survives resolution even though it is illegal before the first half-move`() {
        // e7e5 is not among White's legal moves in the start position — why the old filter lost it.
        val state = pairState(ucis = listOf("e2e4", "e7e5"))
        assertTrue(state.legalMoveFor("e7e5") == null, "the reply is illegal before the first move")
        assertEquals(2, state.pendingMoves(listOf("e2e4", "e7e5")).size)
    }

    @Test
    fun `a uci that is legal nowhere in the sequence still stops the resolution`() {
        // In sequence is not "accept anything": illegal even after the first, the candidate degrades to its single.
        val state = pairState(ucis = listOf("e2e4", "a1a8"))
        assertEquals(1, state.pendingMoves(listOf("e2e4", "a1a8")).size)
    }

    private companion object {
        const val CAPTURE_FEN = "r1bqkbnr/ppp2ppp/2n5/3pp3/3PP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4"
        val THREE_PLY = listOf("f3e5", "c6e5", "d4e5")
        val TOUCHED = setOf("f3", "e5", "c6", "d4")
        val TOUCHED_OCCUPANCY = mapOf("e5" to true, "d4" to true, "f3" to false, "c6" to false)
    }
}
