package com.chesslab.cnn

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

/**
 * The ONE test that drives [TrackerEngine] against the REAL [CnnRecovery] instead of a
 * hand-written evaluator.
 *
 * It exists because every other verify/recovery/alarm test in `:core-engine` fakes the seam, and
 * the fakes hid two defects that were fatal on the first live call: the evaluator took the
 * position as `Any` and got a `Game` from three of its four call sites (STATUS D04a-5 / D04b-3),
 * and `:core-cnn` computed `resync_check`'s move/agreement and threw them away, which made the
 * whole `cnn_overrule` rung dead code (D04a-1). `:core-cnn` is the only module that can see both
 * sides — `:core-engine` must never depend on it — so the coverage belongs here.
 */
class EngineSeamIntegrationTest {
    @Test
    fun overruleRungCommitsTheCnnsReplacementMove() {
        // The diff read e2e4; the board actually shows d2d4. e4 is under a hand, so neither the
        // ghost veto (rung 3) nor the endpoint signals can decide — only `resync_check`'s derived
        // move can, and it reaches the ladder through `ResyncResult.move`/`agreement`.
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
        // No pending candidate: `_cnn_tick` runs `boardMatchesIdentity` + `deriveMovesDeep` +
        // `resyncCheck` against the believed position. All three used to be handed the engine's
        // `Game`, which `:core-cnn` rejected — this call path threw on the first live frame.
        val rig = Rig()
        rig.captureReference()

        val events = rig.observe(observationOf(fenAfter("e2e4")))

        val committed = events.filterIsInstance<TrackerEvent.MoveCommitted>().single()
        assertEquals("e2e4", committed.uci)
        assertEquals("cnn_recovery", committed.decider)
        assertEquals(fenAfter("e2e4"), rig.engine.status().fen)
    }

    @Test
    fun alarmRaisesOnARealOccupancyConflict() {
        // A pawn that vanished is explained by no legal move, so the deep search stays silent and
        // the desync streak runs. `hasOccupancyConflict` / `guessIllegalMove` are the seam calls.
        val rig = Rig()
        rig.captureReference()
        val obs = observationOf(STARTPOS, mapOf("e2" to ("empty" to 0.99)))

        assertNull(rig.alarmOf(rig.observe(obs)), "one glance is not a desync")
        assertNull(rig.alarmOf(rig.observe(obs)), "two glances are not a desync")
        val alarm = requireNotNull(rig.alarmOf(rig.observe(obs))) { "three stable glances must alarm" }

        assertEquals("illegal_move", alarm.kind)
        assertEquals(listOf("e2"), alarm.conflicts)
        assertEquals(STARTPOS, rig.engine.status().fen, "an alarm never moves the game state")
    }

    /** A [TrackerEngine] fed synthetic warps, with the real evaluator injected. */
    private class Rig {
        val engine = TrackerEngine(seamConfig(), STARTPOS)
        private var seq = 0L

        init {
            engine.attachCnn(CnnRecovery())
        }

        /** The first stable frame becomes base truth; e2 carries the blob the move will vacate. */
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

        /** One observer result of the CURRENT position; each glance gets its own seq. */
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
        const val BOARD_SIZE = 400
        const val BASE_LEVEL = 128
        const val BLOB_LEVEL = 220
        const val CORNER_FLOATS = 8
        const val MS_PER_FRAME = 100L

        /** `square_region`'s inset, so a blob lands inside the region the evidence channel reads. */
        const val INSET = 0.16

        /**
         * Detection at full resolution on a 400 px board, one frame per stage and no motion gate:
         * the synthetic warps jump instantly, which is what the frame loop calls "moving". This
         * test is about the CNN seam, not about the settle machinery.
         */
        fun seamConfig(): TrackerConfig =
            TrackerConfig(
                boardSize = BOARD_SIZE,
                detectScale = 1.0,
                overhang = 0.0,
                minGridLineCoverage = 0.0,
                requireMotionForMove = false,
                motionThr = 100.0,
                cnnCheckIntervalS = 0.0,
                recoveryMaxPlies = 2,
                settleFramesOverride = 1,
                avgFramesOverride = 1,
                confirmFramesOverride = 1,
            )

        /** A flat board with bright blobs on the named squares (Python `_gray_frame`). */
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

        /** A model-free observation of [fen]; [overrides] are `square -> (label, confidence)`. */
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
