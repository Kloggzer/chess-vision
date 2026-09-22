package com.chesslab.tracker.hints

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.games.GameSessionController
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.HintLedger
import com.chesslab.tracker.record.CaptureFrame
import com.chesslab.tracker.record.CaptureSource
import com.chesslab.tracker.record.FrameWriter
import com.chesslab.tracker.record.RecordingGates
import com.chesslab.tracker.record.RecordingPrefs
import com.chesslab.tracker.record.SessionCaptureController
import com.chesslab.tracker.record.SessionMeta
import com.chesslab.tracker.record.SessionRecorder
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** Narrenmatt: Weiss ist am Zug und matt, also beendet der Record die Partie von selbst. */
private const val FOOLS_MATE = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"

/** Das automatische Partieende ruft keinen Schirm: es lief ueber `onCommitted` -> `endAndSave`,
 *  raeumte den Ledger und liess Plan samt Restkontingent im `HintController` stehen — der Knopf
 *  wurde auf der beendeten Stellung weiter angeboten und sagte erst beim Druck ab. */
class HintEndsWithTheGameTest {
    @TempDir
    lateinit var dir: File

    private fun capture() =
        SessionCaptureController(
            source =
                object : CaptureSource {
                    override fun grab() = CaptureFrame(1920, 1080, FloatArray(8), FrameWriter { 0L })

                    override fun geometryNote(): String? = null
                },
            open = { SessionRecorder(File(dir, "s").also(File::mkdirs), SessionMeta("s", "default", 1920, 1080)) },
            gates = RecordingGates(),
            prefs = { RecordingPrefs(enabled = false) },
            existingBytes = { 0L },
        )

    @Test
    fun `a mate ends the quota with the record`() {
        val ledger = HintLedger()
        val hints = HintController(ledger)
        val store = GameStore(File(dir, "games"))
        val games = GameSessionController(store, capture(), { 1_700_000_000_000L }, { "g1" }, ledger, listOf(hints))
        hints.startGame(HintPlan(side = HintSide.WHITE, quota = 3))
        games.onIdle(STARTPOS, "board-a")

        games.onEvent(TrackerEvent.MoveCommitted("d8h4", "Qh4#", FOOLS_MATE, "diff", false), null)

        assertEquals(1, store.list().size, "die Partie ist von selbst gespeichert")
        assertFalse(hints.offered(FOOLS_MATE), "und danach wird kein Tipp mehr angeboten")
        assertEquals(0, hints.state.value.remaining)
    }
}
