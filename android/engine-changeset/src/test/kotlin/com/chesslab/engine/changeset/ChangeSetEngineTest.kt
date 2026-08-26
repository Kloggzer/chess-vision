package com.chesslab.engine.changeset

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.board.BOARD_SQUARES
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.Square
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The engine driven through its own seam.
 *
 * The readings handed in here are deliberately WRONG about identity — every piece comes back as a
 * knight of the right colour — because that is what the live camera did on 2026-08-26 and it is
 * the whole reason this engine exists. A commit that survives that is the proof.
 */
class ChangeSetEngineTest {
    private val classes = listOf("empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK")
    private val size = 64
    private var seq = 0L

    private fun pieceAt(
        fen: String,
        index: Int,
    ): Piece = Board().also { it.loadFromFen(fen) }.getPiece(Square.squareAt(index))

    /** Empty squares dark, occupied bright — so a move changes exactly two cells. */
    private fun picture(fen: String): BgrImage {
        val data = ByteArray(size * size * 3)
        for (i in BOARD_SQUARES.indices) {
            val tone = if (pieceAt(fen, i) == Piece.NONE) 40 else 200
            val cx = (i % 8) * (size / 8)
            val cy = (7 - i / 8) * (size / 8)
            for (y in cy until cy + size / 8) {
                for (x in cx until cx + size / 8) {
                    val at = (y * size + x) * 3
                    data[at] = tone.toByte()
                    data[at + 1] = tone.toByte()
                    data[at + 2] = tone.toByte()
                }
            }
        }
        return BgrImage(size, size, data)
    }

    private fun frame(
        fen: String,
        atMs: Long,
    ): FrameInput =
        FrameInput(
            seq = seq++,
            grayDet = GrayImage(size, size, ByteArray(size * size)),
            bgrDet = picture(fen),
            corners = FloatArray(8) { it.toFloat() },
            motionRoiScore = 0.0,
            gridLineCoverage = 1.0,
            lumaPreClahe = 120.0,
            timestampMs = atMs,
        )

    /** Right colour, wrong piece — every single square. Exactly the camera this engine was built for. */
    private fun blindReading(
        fen: String,
        forFen: String,
        atSeq: Long,
    ): CnnSnapshot {
        val rows =
            BOARD_SQUARES.indices.associate { i ->
                val piece = pieceAt(fen, i)
                val label =
                    when {
                        piece == Piece.NONE -> "empty"
                        piece.pieceSide.name == "WHITE" -> "wN"
                        else -> "bN"
                    }
                BOARD_SQUARES[i] to DoubleArray(classes.size) { c -> if (classes[c] == label) 0.99 else 0.01 / 12 }
            }
        return CnnSnapshot(FakeObservation(classes, rows), atSeq, 0L, 0.0, null, null, forFen, 0L)
    }

    private fun engine() = ChangeSetEngine(TrackerConfig(), STARTPOS)

    private fun settle(
        engine: ChangeSetEngine,
        fen: String,
        from: Long,
        rounds: Int = 6,
    ): Long {
        var at = from
        repeat(rounds) {
            engine.onCnnSnapshot(blindReading(fen, engine.fen(), seq))
            engine.onFrame(frame(fen, at))
            at += FRAME_MS
        }
        return at
    }

    @Test
    fun `a resting board that matches is left alone`() {
        val engine = engine()
        settle(engine, STARTPOS, 0L)
        assertEquals(STARTPOS, engine.fen())
    }

    /** The whole point: identity is useless in these readings and the move commits anyway. */
    @Test
    fun `a move commits although every piece is misidentified`() {
        val engine = engine()
        val after = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
        var at = settle(engine, STARTPOS, 0L)
        // The hand crosses: one frame of hard change, then the board rests again.
        engine.onFrame(frame(after, at))
        at += FRAME_MS
        val seen = mutableListOf<TrackerEvent>()
        repeat(8) {
            engine.onCnnSnapshot(blindReading(after, engine.fen(), seq))
            seen += engine.onFrame(frame(after, at))
            at += FRAME_MS
        }
        assertEquals(listOf("e2e4"), seen.filterIsInstance<TrackerEvent.MoveCommitted>().map { it.uci }, "events were $seen")
        assertEquals(after, engine.fen())
    }

    /**
     * A board that changed into something no legal move reaches must alarm — at ply ZERO too.
     * Its predecessor required a committed move first and so stayed silent through a whole game
     * that never got started (measured live, 2026-08-26).
     */
    @Test
    fun `an impossible change alarms before the first move`() {
        val engine = engine()
        // Three white queens on empty squares: reachable by no sequence of legal moves.
        val impossible = "rnbqkbnr/pppppppp/8/3QQQ2/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        var at = settle(engine, STARTPOS, 0L)
        engine.onFrame(frame(impossible, at))
        at += FRAME_MS
        val seen = mutableListOf<TrackerEvent>()
        // Real time, not frame count: the retry ladder waits 400 ms, then 800, then 1600, so a
        // run of 33 ms steps never reaches the second attempt however many frames it feeds.
        repeat(20) {
            engine.onCnnSnapshot(blindReading(impossible, engine.fen(), seq))
            seen += engine.onFrame(frame(impossible, at))
            at += RETRY_STEP_MS
        }
        assertTrue(seen.any { it is TrackerEvent.Alarm }, "expected an alarm, events were $seen")
        assertEquals(STARTPOS, engine.fen(), "an unexplained board must not move the position")
    }

    private class FakeObservation(
        private val names: List<String>,
        private val rows: Map<String, DoubleArray>,
    ) : CnnObservation {
        override fun occupied(square: String) = label(square) != "empty"

        override fun confident(
            square: String,
            thr: Double,
        ) = true

        override fun labelConfident(
            square: String,
            thr: Double,
        ) = true

        override fun label(square: String): String = names[rows.getValue(square).let { r -> r.indices.maxBy { r[it] } }]

        override fun conf(square: String) = rows.getValue(square).max()

        override fun pOccluded(square: String) = 0.0

        override fun classProbs(square: String) = rows[square] ?: DoubleArray(0)

        override val classNames: List<String> get() = names

        override fun occupancyOnly(): CnnObservation = this
    }

    private companion object {
        const val FRAME_MS = 33L
        const val RETRY_STEP_MS = 300L
    }
}
