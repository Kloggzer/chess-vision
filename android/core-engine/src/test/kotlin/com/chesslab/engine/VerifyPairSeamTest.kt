package com.chesslab.engine

import com.chesslab.engine.api.TrackerEvent
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The seam between a pending PAIR and the pair verifier — the one route no test drove.
 *
 * `VerifyPairTest` calls `VerifyPair.tick` directly (`VerifyPairFixtures.pairTick`), so it proves
 * the verifier and says nothing about whether anything reaches it. Nothing did:
 * `VerifySingle.evaluate` resolved the pending ucis with `legalMoveFor`, which means legal in the
 * CURRENT position, and a pair's second uci is the OPPONENT's reply generated on the board after
 * the first was pushed. In the pre-move position its from-square still holds an enemy piece, so it
 * was never legal, `mapNotNull` always dropped it, and every pair arrived at the verifier as a
 * single. `VerifyPair.tick` was unreachable in production.
 *
 * The cost was not a dead branch. The commit then anchored the reference on `pend.cur` — the frame
 * that already shows BOTH half-moves — so the reply was baked into the reference and could never be
 * detected: a silent, permanent one-ply desync, on the path that exists to prevent exactly that,
 * and only with a CNN attached (`pairBeforeSingle` runs `if (cnnOn)`).
 *
 * The fixtures had it right all along: `pairMoves` resolves the second half-move on the MID board
 * and says so in its own KDoc. Production did not.
 */
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
        // Agrees with the board AFTER both half-moves — the pair verifier's positive case.
        val cnn = PairRecovery(matchFen = after)

        val events = VerifySingle.tick(state, cnn, snapshotOf(state, PairObs(emptyMap())))

        val committed = events.filterIsInstance<TrackerEvent.SequenceCommitted>().firstOrNull()
        assertNotNull(committed, "a pair must commit as a sequence, not as its first half: $events")
        assertEquals(DECIDER_CNN_PAIR, committed!!.decider)
        assertEquals(after, state.board.fen(), "both half-moves must be on the board")
    }

    /**
     * Zwei Paare, dieselbe Belegtheit: nach `f3e5 c6e5` wie nach `f3e5 c6d4` sind e5 und d4
     * besetzt und f3, c6 leer. Getrennt werden sie nur durch die FARBE auf e5, und am
     * 2026-08-30 committete der Motor live das falsche der beiden.
     */
    @Test
    fun `a pair the model contradicts on colour is discarded`() {
        val state = pairState(fen = CAPTURE_FEN, ucis = listOf("f3e5", "c6d4"))
        val moves = pairMoves(state, listOf("f3e5", "c6d4"))
        val cnn = PairRecovery(matchFen = afterFen(state, moves))
        // Schwarz auf e5 waere `c6xe5` — nicht die Stellung, die dieses Paar behauptet.
        val obs = PairObs(TOUCHED_OCCUPANCY, TOUCHED, mapOf("e5" to "bN"))

        val events = List(2) { pairTick(state, cnn, moves, obs) }.flatten()

        assertTrue(events.isEmpty(), "ein Farbwiderspruch darf nicht committen: $events")
        assertNull(state.pending, "nach zwei einigen Blicken ist der Kandidat weg")
        assertEquals(CAPTURE_FEN, state.board.fen(), "das Brett darf sich nicht bewegt haben")
    }

    /**
     * Die Farbe ist die schwaechste Achse des Modells, also darf eine Lesung UNTER der
     * Konfidenzschwelle das Paar nicht kippen — `pairColourConflicts` las `label` ohne
     * `labelConfident`, und ein 0,4-Read entschied gegen den Belegtheits-Arm.
     */
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

    /** Und ein sicherer Farbwiderspruch entscheidet nie auf EINEN Blick (Invariante 13). */
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

    /**
     * Drei schnelle Zuege auf DASSELBE Feld, und der Motor kann nur Paare: `f3xe5 c6xe5 d4xe5`
     * laesst f3, c6 und d4 leer. Das Paar `f3e5 c6d4` erklaert alle vier geaenderten Felder und
     * schlaegt damit das richtige `f3e5 c6e5`, das nur drei erklaert — es behauptet aber eine
     * Figur auf d4, wo nichts steht. Live committet am 2026-08-30.
     */
    @Test
    fun `a pair that fills a square the model reads as empty is discarded`() {
        val state = pairState(fen = CAPTURE_FEN, ucis = listOf("f3e5", "c6d4"))
        val moves = pairMoves(state, listOf("f3e5", "c6d4"))
        val cnn = PairRecovery(matchFen = afterFen(state, moves))
        // Das Modell sieht d4 leer — dort steht nach dem dritten Zug nichts mehr.
        val obs = PairObs(TOUCHED_OCCUPANCY + ("d4" to false), TOUCHED, mapOf("e5" to "wP"))

        val events = List(2) { pairTick(state, cnn, moves, obs) }.flatten()

        assertTrue(events.isEmpty(), "ein leer gelesenes Zielfeld darf nicht committen: $events")
        assertNull(state.pending)
        assertEquals(CAPTURE_FEN, state.board.fen(), "das Brett darf sich nicht bewegt haben")
    }

    /** Dieselbe Lage, aber das Modell bestaetigt die Farbe — dann bleibt der Weg frei. */
    @Test
    fun `a pair the model confirms on colour still commits`() {
        val state = pairState(fen = CAPTURE_FEN, ucis = listOf("f3e5", "c6d4"))
        val moves = pairMoves(state, listOf("f3e5", "c6d4"))
        val cnn = PairRecovery(matchFen = afterFen(state, moves))
        val obs = PairObs(TOUCHED_OCCUPANCY, TOUCHED, mapOf("e5" to "wN", "d4" to "bN"))

        val events = pairTick(state, cnn, moves, obs)

        assertTrue(events.isNotEmpty(), "ohne Widerspruch muss das Paar durchkommen")
    }

    /**
     * `f3xe5 c6xe5 d4xe5` sind DREI Halbzuege (`FAST_PLIES`), geprueft wurden nur die ersten zwei:
     * d4 fiel aus `checked`, also durfte der lokale Arm die ganze Folge committen, waehrend das
     * Modell d4 sicher besetzt las — genau der Springer, den es dort nie gab.
     */
    @Test
    fun `a three-ply sequence is checked on every ply`() {
        val state = pairState(fen = CAPTURE_FEN, ucis = THREE_PLY)
        val moves = state.pendingMoves(THREE_PLY)
        assertEquals(3, moves.size, "die Dreier-Folge muss legal sein")
        val cnn = PairRecovery(conflicts = listOf("d4"))
        // Alles wie nach der Folge, nur d4 traegt noch den weissen Bauern.
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
        // The regression in one assertion, with no verifier involved: the reply e7e5 is not among
        // White's legal moves in the start position, which is precisely why the old filter lost it.
        val state = pairState(ucis = listOf("e2e4", "e7e5"))
        assertTrue(state.legalMoveFor("e7e5") == null, "the reply is illegal before the first move")
        assertEquals(2, state.pendingMoves(listOf("e2e4", "e7e5")).size)
    }

    @Test
    fun `a uci that is legal nowhere in the sequence still stops the resolution`() {
        // Resolving in sequence must not become "accept anything": a second uci that is illegal
        // even after the first is dropped, and the candidate degrades to the single it really is.
        val state = pairState(ucis = listOf("e2e4", "a1a8"))
        assertEquals(1, state.pendingMoves(listOf("e2e4", "a1a8")).size)
    }

    private companion object {
        /** Nach 1.e4 e5 2.Nf3 Nc6 3.d4 d5, Weiss am Zug — `Nf3xe5` und danach `Nc6xd4` sind legal. */
        const val CAPTURE_FEN = "r1bqkbnr/ppp2ppp/2n5/3pp3/3PP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4"
        val THREE_PLY = listOf("f3e5", "c6e5", "d4e5")
        val TOUCHED = setOf("f3", "e5", "c6", "d4")
        val TOUCHED_OCCUPANCY = mapOf("e5" to true, "d4" to true, "f3" to false, "c6" to false)
    }
}
