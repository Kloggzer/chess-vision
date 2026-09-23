package com.chesslab.cnn

import com.chesslab.engine.RIG_CONFIG
import com.chesslab.engine.TEST_BOARD_SIZE
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.api.TrackerEvent
import com.github.bhlangonijr.chesslib.Board
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Against the REAL [CnnRecovery]: the fakes in `:core-engine` hid a `Game` passed as `Any` and a discarded
 *  `resync_check` move. Only `:core-cnn` sees both sides. */
class EngineSeamIntegrationTest {
    @Test
    fun overruleRungCommitsTheCnnsReplacementMove() {
        // Only `resync_check`'s derived move can decide, via `ResyncResult.move`/`agreement`.
        val rig = Rig()
        rig.captureReference()
        rig.frame(listOf("e4"))
        assertEquals(listOf("e2e4"), rig.pendingUcis(), "the diff must have raised a candidate")

        val obs = observationOf(fenAfter("d2d4"), mapOf("e4" to ("occluded" to 0.99)))
        assertTrue(rig.observe(obs).isEmpty(), "invariant 13: one glance never decides")
        val events = rig.observe(obs)

        val committed = events.filterIsInstance<TrackerEvent.MoveCommitted>().single()
        assertEquals("d2d4", committed.uci)
        assertEquals("cnn_overrule", committed.decider)
        assertEquals(fenAfter("d2d4"), rig.engine.status().fen)
    }

    @Test
    fun recoveryCommitsAMoveDerivedThroughTheSeam() {
        // `_cnn_tick` handed all three seam calls the engine's `Game`, which `:core-cnn` rejected on the first live frame.
        val rig = Rig()
        rig.captureReference()

        val obs = observationOf(fenAfter("e2e4"))
        assertTrue(rig.observe(obs).isEmpty(), "specs/39 phase 02: one glance never bridges")
        val events = rig.observe(obs)

        val committed = events.filterIsInstance<TrackerEvent.MoveCommitted>().single()
        assertEquals("e2e4", committed.uci)
        assertEquals("cnn_recovery", committed.decider)
        assertEquals(fenAfter("e2e4"), rig.engine.status().fen)
    }

    @Test
    fun alarmRaisesOnARealOccupancyConflict() {
        // One ply goes on the record first: `Alarm.alarmable` refuses a board that has never moved.
        val rig = Rig()
        rig.captureReference()
        val played = observationOf(fenAfter("e2e4"))
        rig.observe(played)
        rig.observe(played)
        assertEquals(fenAfter("e2e4"), rig.engine.status().fen, "precondition: a ply is committed")

        val obs = observationOf(fenAfter("e2e4"), mapOf("d2" to ("empty" to 0.99)))
        assertNull(rig.alarmOf(rig.observe(obs)), "one glance is not a desync")
        assertNull(rig.alarmOf(rig.observe(obs)), "two glances are not a desync")
        // Der Latch misst eine DAUER (`alarmMinS`); Frames dazwischen, weil `nowS` NUR im `FrameLoop` laeuft.
        var alarm: TrackerEvent.Alarm? = null
        var glances = 0
        while (alarm == null && glances < MAX_GLANCES) {
            rig.frame(listOf("e4"))
            alarm = rig.alarmOf(rig.observe(obs))
            glances += 1
        }
        requireNotNull(alarm) { "ein stehender Widerspruch muss nach alarmMinS einrasten" }
        assertTrue(glances > 1) { "nach $glances Blicken — der Latch zaehlt wieder nur Bilder" }

        assertEquals("illegal_move", alarm.kind)
        assertEquals(listOf("d2"), alarm.conflicts)
        assertEquals(fenAfter("e2e4"), rig.engine.status().fen, "an alarm never moves the game state")
    }

    private class Rig {
        val engine = TrackerEngine(seamConfig(), STARTPOS)
        private var seq = 0L

        init {
            engine.attachCnn(CnnRecovery())
        }

        fun captureReference() {
            frame(listOf("e2"))
        }

        fun frame(blobs: List<String>): List<TrackerEvent> {
            seq += 1
            return engine.onFrame(
                FrameInput(
                    seq = seq,
                    grayDet = grayBoard(blobs),
                    bgrDet = bgrBoard(),
                    corners = FloatArray(CORNER_FLOATS),
                    motionRoiScore = 0.0,
                    gridLineCoverage = 1.0,
                    lumaPreClahe = BASE_LEVEL.toDouble(),
                    timestampMs = seq * MS_PER_FRAME,
                ),
            )
        }

        fun observe(obs: OccupancyObservation): List<TrackerEvent> {
            seq += 1
            return engine.onCnnSnapshot(
                CnnSnapshot(
                    obs = obs,
                    seq = seq,
                    tsMs = seq * MS_PER_FRAME,
                    inferMs = 0.0,
                    warped = null,
                    gray = null,
                    fen = engine.status().fen,
                ),
            )
        }

        fun pendingUcis(): List<String> =
            engine
                .status()
                .pendingUci
                ?.split(" ")
                .orEmpty()

        fun alarmOf(events: List<TrackerEvent>): TrackerEvent.Alarm? = events.filterIsInstance<TrackerEvent.Alarm>().firstOrNull()
    }

    private companion object {
        const val BOARD_SIZE = TEST_BOARD_SIZE
        const val BASE_LEVEL = 128
        const val BLOB_LEVEL = 220
        const val CORNER_FLOATS = 8
        const val MS_PER_FRAME = 100L

        const val MAX_GLANCES = 40

        const val INSET = 0.16

        /** No motion gate and one frame per stage: synthetic warps jump instantly, and this is about the seam. */
        fun seamConfig(): TrackerConfig =
            RIG_CONFIG.copy(
                overhang = 0.0,
                requireMotionForMove = false,
                motionThr = 100.0,
                cnnCheckIntervalS = 0.0,
                recoveryMaxPlies = 2,
                settleFramesOverride = 1,
                avgFramesOverride = 1,
                confirmFramesOverride = 1,
            )

        fun grayBoard(blobs: List<String>): GrayImage {
            val data = ByteArray(BOARD_SIZE * BOARD_SIZE) { BASE_LEVEL.toByte() }
            val cell = BOARD_SIZE / RANKS.toDouble()
            for (square in blobs) {
                val col = square[0] - 'a'
                val row = RANKS - (square[1] - '0')
                val margin = cell * INSET
                for (y in ((row * cell + margin).toInt()) until (((row + 1) * cell - margin).toInt())) {
                    for (x in ((col * cell + margin).toInt()) until (((col + 1) * cell - margin).toInt())) {
                        data[y * BOARD_SIZE + x] = BLOB_LEVEL.toByte()
                    }
                }
            }
            return GrayImage(BOARD_SIZE, BOARD_SIZE, data)
        }

        const val RANKS = 8

        fun bgrBoard(): BgrImage = BgrImage(BOARD_SIZE, BOARD_SIZE, ByteArray(BOARD_SIZE * BOARD_SIZE * 3) { BASE_LEVEL.toByte() })

        fun observationOf(
            fen: String,
            overrides: Map<String, Pair<String, Double>> = emptyMap(),
        ): OccupancyObservation = FakeSquareClassifier(fen, overrides = overrides).observe()

        fun fenAfter(uci: String): String {
            val board = Board().also { it.loadFromFen(STARTPOS) }
            board.doMove(parseMove(board, uci))
            return board.getFen(true, true)
        }
    }
}
