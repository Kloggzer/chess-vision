package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.record.FEN_AFTER_E4
import com.chesslab.tracker.record.captureUnder
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val AFTER_D4 = "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1"

class HintMarkOnCommitTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun aToldMovePlayedOutOfItsOwnPositionCarriesTheMark() {
        val ledger = HintLedger().apply { startGame("WHITE", quota = 3) }
        val stored = playE4(ledger)
        assertEquals(MoveHint("e4", "e2e4", followed = true), stored.moves.first().hint)
        assertEquals(HintRecord("WHITE", quota = 3, delivered = 1), stored.hints)
    }

    /** Derselbe Tipp, aber aus einer anderen Stellung gerechnet: er gehoert diesem Ply nicht. */
    @Test
    fun aTipForAnotherPositionMarksNothing() {
        val ledger = HintLedger().apply { startGame("WHITE", quota = 3) }
        val stored = playE4(ledger, tipFen = FEN_AFTER_E4)
        assertNull(stored.moves.first().hint)
        assertEquals(HintStatus.NONE, stored.reviewView().let { it.hintStatusOf(it.plies.first()) })
    }

    /** Der Tipp nannte e4, gespielt wurde d4 — ein Vermerk, aber kein vorgesagter Zug. */
    @Test
    fun aTipThatWasNotFollowedIsMarkedAsSuch() {
        val ledger = HintLedger().apply { startGame("WHITE", quota = 3) }
        val stored = play(ledger, uci = "d2d4", san = "d4", fenAfter = AFTER_D4)
        assertEquals(MoveHint("e4", "e2e4", followed = false), stored.moves.first().hint)
        assertEquals(HintStatus.GIVEN, stored.reviewView().let { it.hintStatusOf(it.plies.first()) })
    }

    /** Ohne Ledger wurde nichts BEOBACHTET — und der Record sagt genau das, nicht "kein Tipp". */
    @Test
    fun aGamePlayedWithoutTheLedgerRecordsNothingAndClaimsNothing() {
        val stored = playE4(ledger = null)
        assertNull(stored.hints)
        assertNull(stored.moves.first().hint)
        assertEquals(HintStatus.NOT_RECORDED, stored.reviewView().let { it.hintStatusOf(it.plies.first()) })
    }

    /** Das naechste Spiel erbt nichts: `endAndSave` raeumt den Ledger an der Record-Grenze. */
    @Test
    fun theLedgerIsClearedWithTheRecordItBelongsTo() {
        val ledger = HintLedger().apply { startGame("WHITE", quota = 3) }
        ledger.delivered(STARTPOS, "e4", "e2e4")
        val controller = controller(ledger)
        controller.onIdle(STARTPOS, "default")
        controller.endAndSave()
        assertNull(ledger.markFor(STARTPOS, "e2e4"), "der Tipp der alten Partie darf keinen Ply mehr treffen")
    }

    private fun playE4(
        ledger: HintLedger?,
        tipFen: String = STARTPOS,
    ) = play(ledger, "e2e4", "e4", FEN_AFTER_E4, tipFen)

    private fun play(
        ledger: HintLedger?,
        uci: String,
        san: String,
        fenAfter: String,
        tipFen: String = STARTPOS,
    ): StoredGame {
        ledger?.delivered(tipFen, "e4", "e2e4")
        val store = GameStore(File(dir, "games").also(File::mkdirs))
        val controller = controller(ledger, store)
        controller.onIdle(STARTPOS, "default")
        controller.onEvent(TrackerEvent.MoveCommitted(uci, san, fenAfter, "pair", priorUsed = false), status = null)
        val saved = controller.endAndSave()
        return store.open(saved!!.id)!!
    }

    private fun controller(
        ledger: HintLedger?,
        store: GameStore = GameStore(File(dir, "games").also(File::mkdirs)),
    ) = GameSessionController(
        store = store,
        capture = captureUnder(dir, enabled = false),
        now = { 0L },
        idFor = { "g$it" },
        hints = ledger,
    )
}
