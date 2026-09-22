package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.io.defaultSideFiles
import com.chesslab.tracker.io.sideFiles
import com.chesslab.tracker.record.CaptureFrame
import com.chesslab.tracker.record.CaptureSource
import com.chesslab.tracker.record.FrameWriter
import com.chesslab.tracker.record.RecordingGates
import com.chesslab.tracker.record.RecordingPrefs
import com.chesslab.tracker.record.SessionCaptureController
import com.chesslab.tracker.record.SessionMeta
import com.chesslab.tracker.record.SessionRecorder
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"

/** `GameStore.save` schreibt drei fuer sich atomare Artefakte — die PARTIE ist keine Transaktion.
 *  Der Controller gab sie trotzdem auf, bevor das Schreiben durch war: scheiterte das PGN oder
 *  der Index, war die einzige verbliebene Kopie der verlorene `live`-Zustand. */
class SaveBeforeDropTest {
    @TempDir
    lateinit var dir: File

    private val store by lazy { GameStore(File(dir, "games")) }

    @AfterEach
    fun restoreSideFiles() {
        sideFiles = defaultSideFiles
    }

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
    fun `a game whose pgn cannot be written is still live afterwards`() {
        val controller = GameSessionController(store, capture(), { 1_700_000_000_000L }, { "g1" })
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(TrackerEvent.MoveCommitted("e2e4", "e4", AFTER_E4, "diff", false), null)
        // Die Nebendatei des PGN landet in einem Verzeichnis, das es nicht gibt: `save` wirft,
        // NACHDEM die `<id>.json` steht und bevor der Index sie kennt.
        sideFiles = { f -> if (f.name.endsWith(".pgn")) File(dir, "weg/x.tmp") else defaultSideFiles(f) }

        assertTrue(runCatching { controller.endAndSave() }.isFailure, "das Schreiben muss scheitern")

        assertEquals(1, controller.state.value.moveCount, "der Zug steht noch im Zustand")
        sideFiles = defaultSideFiles
        val saved = controller.endAndSave()
        assertNotNull(saved, "und sie muss sich ein zweites Mal speichern lassen")
        assertEquals(listOf("e4"), store.open(saved!!.id)?.moves?.map { it.san })
    }
}
