package com.chesslab.engine.still

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.github.bhlangonijr.chesslib.Board
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The engine driven through its own seam, because every gate it has is a chance to see nothing
 * and report nothing — which is exactly what a first replay looked like.
 */
class StillnessEngineTest {
    private val classes = listOf("empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK")
    private val size = 64
    private var seq = 0L

    /** A board picture whose cells differ per square, so a changed square changes the picture. */
    private fun picture(fen: String): BgrImage {
        val board = Board().also { it.loadFromFen(fen) }
        val data = ByteArray(size * size * 3)
        for (i in BOARD_SQUARES.indices) {
            val piece =
                board.getPiece(
                    com.github.bhlangonijr.chesslib.Square
                        .squareAt(i),
                )
            val tone = if (piece == com.github.bhlangonijr.chesslib.Piece.NONE) 40 else 200
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

    private fun reading(
        fen: String,
        forFen: String,
        atSeq: Long,
    ): CnnSnapshot {
        val board = Board().also { it.loadFromFen(fen) }
        val rows =
            BOARD_SQUARES.indices.associate { i ->
                val piece =
                    board.getPiece(
                        com.github.bhlangonijr.chesslib.Square
                            .squareAt(i),
                    )
                val label =
                    if (piece == com.github.bhlangonijr.chesslib.Piece.NONE) {
                        "empty"
                    } else {
                        (if (piece.pieceSide.name == "WHITE") "w" else "b") + piece.fenSymbol.uppercase()
                    }
                BOARD_SQUARES[i] to DoubleArray(classes.size) { c -> if (classes[c] == label) 0.99 else 0.01 / 12 }
            }
        return CnnSnapshot(FakeObservation(classes, rows), atSeq, 0L, 0.0, null, null, forFen, 0L)
    }

    private fun engine() = StillnessEngine(TrackerConfig(), STARTPOS)

    /** Settle, read the same position, and the engine says so — the "nothing happened" path. */
    @Test
    fun `a reading of the tracked position re-anchors`() {
        val engine = engine()
        var events = emptyList<TrackerEvent>()
        for (i in 0 until 10) {
            engine.onCnnSnapshot(reading(STARTPOS, STARTPOS, seq))
            events = engine.onFrame(frame(STARTPOS, i * 33L))
        }
        assertTrue(events.any { it is TrackerEvent.ReAnchored } || engine.fen() == STARTPOS)
    }

    /** The whole point: a move appears on the board and is committed once. */
    @Test
    fun `a move that appears while the board rests is committed`() {
        val engine = engine()
        val after = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
        var at = 0L
        repeat(6) {
            engine.onCnnSnapshot(reading(STARTPOS, STARTPOS, seq))
            engine.onFrame(frame(STARTPOS, at))
            at += 33
        }
        // A hand crosses: the picture changes hard enough to count as activity, then rests again.
        engine.onFrame(frame(after, at).also { at += 33 })
        val committed = mutableListOf<TrackerEvent>()
        repeat(8) {
            engine.onCnnSnapshot(reading(after, engine.fen(), seq))
            committed += engine.onFrame(frame(after, at))
            at += 33
        }
        val moves = committed.filterIsInstance<TrackerEvent.MoveCommitted>()
        assertEquals(listOf("e2e4"), moves.map { it.uci }, "events were $committed")
        assertEquals(after, engine.fen())
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
}
