package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

private const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"

private const val AFTER_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"

/** Wie vor dem Vermerk auf der Platte: kein `hints`, kein `hint` je Ply. */
private const val OLD_GAME =
    """{"id":"2026-07-24_1822","startFen":"$STARTPOS","startedAtEpochMs":1,"finishedAtEpochMs":2,
       "profileName":"default","result":"*",
       "moves":[{"ply":1,"san":"e4","uci":"e2e4","tsEpochMs":1}]}"""

/** "Nicht aufgezeichnet" ist nicht "kein Tipp". */
class HintProvenanceTest {
    @Test
    fun anOldGameWithoutTheFieldClaimsNothing() {
        val game = decodeStoredGame(OLD_GAME)
        assertNull(game.hints)
        assertNull(game.moves.first().hint)
        val view = game.reviewView()
        assertEquals(HintStatus.NOT_RECORDED, view.hintStatusOf(view.plies.first()))
    }

    @Test
    fun aWatchedGameWithoutATipSaysThereWasNone() {
        val stored = played(hint = null, recorded = true)
        val view = stored.reviewView()
        assertEquals(HintStatus.NONE, view.hintStatusOf(view.plies.first()))
        assertEquals(HintRecord("WHITE", quota = 3, delivered = 0), stored.hints)
    }

    @Test
    fun theToldMoveCarriesTheMarkAndTheNextPlyDoesNot() {
        val stored = played(MoveHint("e4", "e2e4", followed = true), recorded = true)
        val view = stored.reviewView()
        assertEquals(HintStatus.FOLLOWED, view.hintStatusOf(view.plies[0]))
        assertEquals(HintStatus.NONE, view.hintStatusOf(view.plies[1]))
    }

    /** Ein Schnellspiel-Paar kommt aus EINER Stellung: nur der erste Ply war vorgesagt. */
    @Test
    fun aSequenceCarriesTheMarkOnItsFirstPlyOnly() {
        val game = LiveGame(STARTPOS, 1L, "default", hintsRecorded = true)
        game.onCommitted(
            listOf("e2e4", "e7e5"),
            listOf("e4", "e5"),
            AFTER_E5,
            1L,
            null,
            MoveHint("e4", "e2e4", followed = true),
        )
        val stored = game.finish("g", 2L, hints = HintRecord("WHITE", 3, 1))
        assertEquals(true, stored.moves[0].hint?.followed)
        assertNull(stored.moves[1].hint)
    }

    @Test
    fun theMarkSurvivesAJsonRoundTrip() {
        val stored = played(MoveHint("e4", "e2e4", followed = false), recorded = true)
        val text = GAMES_JSON.encodeToString(StoredGame.serializer(), stored)
        val back = decodeStoredGame(text)
        assertEquals(stored.moves.first().hint, back.moves.first().hint)
        assertEquals(stored.hints, back.hints)
    }
}

private fun played(
    hint: MoveHint?,
    recorded: Boolean,
): StoredGame {
    val game = LiveGame(STARTPOS, 1L, "default", hintsRecorded = recorded)
    game.onCommitted(listOf("e2e4"), listOf("e4"), AFTER_E4, 1L, null, hint)
    game.onCommitted(listOf("e7e5"), listOf("e5"), AFTER_E5, 2L, null, null)
    return game.finish("g", 3L, hints = if (recorded) HintRecord("WHITE", quota = 3, delivered = if (hint == null) 0 else 1) else null)
}
