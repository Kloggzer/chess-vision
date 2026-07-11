package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerState
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.random.Random

/**
 * End-to-end synthetic game (spec 01 acceptance): 512x512 rendered boards, flat squares,
 * pieces as filled circles, Gaussian-ish pixel noise. 8 plies incl. a capture (Nxe4), a
 * castling (O-O) and an occlusion (hand) interlude -> full SAN history must be correct.
 */
class TrackerEngineTest {
    private val bs = 512
    private val cell = 64
    private val rng = Random(42)
    private var tsNs = 0L
    private val dtNs = 250_000_000L // 0.25 s per frame

    private fun render(
        game: Game,
        hand: Boolean = false,
    ): Pair<GrayImage, BgrImage> {
        val g = ByteArray(bs * bs)
        for (sq in Squares.all) drawSquare(g, sq, game.pieceCharAt(sq))
        if (hand) {
            for (y in 160 until 420) for (x in 160 until 420) g[y * bs + x] = 250.toByte()
        }
        for (i in g.indices) g[i] = (g[i].px() + rng.nextInt(-2, 3)).coerceIn(0, 255).toByte()
        val bgr = ByteArray(bs * bs * 3)
        for (i in g.indices) {
            bgr[i * 3] = g[i]
            bgr[i * 3 + 1] = g[i]
            bgr[i * 3 + 2] = g[i]
        }
        return GrayImage(bs, bs, g) to BgrImage(bs, bs, bgr)
    }

    private fun drawSquare(
        g: ByteArray,
        sq: String,
        piece: Char?,
    ) {
        val (col, row) = Squares.colRow(sq, true)
        val bg = if ((col + row) % 2 == 0) 150 else 90
        for (y in row * cell until (row + 1) * cell) {
            for (x in col * cell until (col + 1) * cell) g[y * bs + x] = bg.toByte()
        }
        if (piece != null) drawPiece(g, col, row, if (piece.isUpperCase()) 235 else 30)
    }

    private fun drawPiece(
        g: ByteArray,
        col: Int,
        row: Int,
        v: Int,
    ) {
        val cx = col * cell + cell / 2
        val cy = row * cell + cell / 2
        for (y in cy - 20..cy + 20) {
            for (x in cx - 20..cx + 20) {
                if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= 20 * 20) g[y * bs + x] = v.toByte()
            }
        }
    }

    private fun feed(
        engine: TrackerEngine,
        game: Game,
        frames: Int,
        hand: Boolean = false,
    ): List<TrackerEvent> {
        val events = mutableListOf<TrackerEvent>()
        repeat(frames) {
            val (gray, bgr) = render(game, hand)
            tsNs += dtNs
            events += engine.onFrame(gray, bgr, tsNs)
        }
        return events
    }

    @Test
    fun `synthetic game with capture, castling and occlusion interlude`() {
        val engine = TrackerEngine()
        val game = Game()
        feed(engine, game, 8) // reference capture
        assertEquals(TrackerState.TRACKING, engine.status.state)

        val plies = listOf("e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6")
        for (uci in plies) {
            game.push(game.legalMoves().first { uciOf(it) == uci })
            val committed = feed(engine, game, 8).filterIsInstance<TrackerEvent.MoveCommitted>()
            assertEquals(1, committed.size, "expected exactly one commit for $uci")
        }

        // Occlusion interlude: a hand covers the board center — no commit, base truth kept.
        val during = feed(engine, game, 6, hand = true)
        assertTrue(during.filterIsInstance<TrackerEvent.MoveCommitted>().isEmpty())
        assertTrue(engine.status.state in setOf(TrackerState.STUCK, TrackerState.OCCLUDED))
        feed(engine, game, 8) // hand leaves -> quiet re-anchor
        assertEquals(TrackerState.TRACKING, engine.status.state)

        for (uci in listOf("e1g1", "f6e4")) { // castling, then a capture
            game.push(game.legalMoves().first { uciOf(it) == uci })
            val committed = feed(engine, game, 8).filterIsInstance<TrackerEvent.MoveCommitted>()
            assertEquals(1, committed.size, "expected exactly one commit for $uci")
        }

        assertEquals(listOf("e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "O-O", "Nxe4"), engine.status.history)
        assertEquals(game.fen(), engine.status.fen)
    }

    @Test
    fun `undo pops the move and queues a hard-negative feedback record`() {
        val engine = TrackerEngine()
        val game = Game()
        feed(engine, game, 8)
        game.push(game.legalMoves().first { uciOf(it) == "e2e4" })
        feed(engine, game, 8)
        assertEquals(listOf("e4"), engine.status.history)
        assertTrue(engine.undo())
        assertEquals(emptyList<String>(), engine.status.history)
        val next = feed(engine, game, 1)
        val fb = next.filterIsInstance<TrackerEvent.FeedbackRecorded>()
        assertEquals(1, fb.size)
        assertEquals("e4", fb.first().san)
        assertEquals("bad", fb.first().label)
        assertEquals(false, engine.undo())
    }

    @Test
    fun `no commit without motion since the reference (drift guard)`() {
        val engine = TrackerEngine()
        val game = Game()
        feed(engine, game, 8)
        // Sneak a "move" into the reference-anchored board WITHOUT any motion spike is
        // impossible frame-to-frame (the change itself is motion) — instead verify the
        // status flag: right after re-anchor no motion has been seen since the reference.
        assertEquals(false, engine.status.motionSinceRef)
    }

    @Test
    fun `reset clears history and re-arms reference capture`() {
        val engine = TrackerEngine()
        val game = Game()
        feed(engine, game, 8)
        game.push(game.legalMoves().first { uciOf(it) == "e2e4" })
        feed(engine, game, 8)
        engine.reset()
        assertEquals(emptyList<String>(), engine.status.history)
        assertEquals(TrackerState.WAITING_BOARD, engine.status.state)
        feed(engine, game, 8)
        assertEquals(TrackerState.TRACKING, engine.status.state)
        assertEquals(engine.status.fen, engine.status.refFen)
    }

    @Test
    fun `debug images preserve the actual baseline and consecutive frame deltas`() {
        val engine = TrackerEngine()
        var debugTs = 0L
        val debugDt = 250_000_000L
        val baseGray = GrayImage(8, 8, ByteArray(64) { 40 })
        val baseBgr = BgrImage(8, 8, ByteArray(64 * 3) { 40 })
        repeat(8) { engine.onFrame(baseGray, baseBgr, debugTs.also { debugTs += debugDt }) }

        val changedGray = GrayImage(8, 8, ByteArray(64) { if (it == 9) 90 else 40 })
        val changedBgr = BgrImage(8, 8, ByteArray(64 * 3) { 40 })
        engine.onFrame(changedGray, changedBgr, debugTs.also { debugTs += debugDt })

        assertEquals(
            50,
            engine.debugImages.motionDiff!!
                .data[9]
                .px(),
        )

        // Occlusion evaluates the live frame once the motion state has been entered.
        engine.onFrame(changedGray, changedBgr, debugTs.also { debugTs += debugDt })
        assertEquals(
            50,
            engine.debugImages.occlusionDiff!!
                .data[9]
                .px(),
        )

        // Move detection evaluates only the stable average after the settle window.
        repeat(3) { engine.onFrame(changedGray, changedBgr, debugTs.also { debugTs += debugDt }) }
        assertEquals(
            50,
            engine.debugImages.detectionDiff!!
                .data[9]
                .px(),
        )
        assertEquals(
            0,
            engine.debugImages.motionDiff!!
                .data[9]
                .px(),
        )
    }

    @Test
    fun `checkpointed UCI history restores game and waits for a new visual reference`() {
        val engine = TrackerEngine()

        assertTrue(engine.restoreMoves(listOf("e2e4", "e7e5", "g1f3")))

        assertEquals(listOf("e2e4", "e7e5", "g1f3"), engine.uciHistory)
        assertEquals(listOf("e4", "e5", "Nf3"), engine.status.history)
        assertEquals(TrackerState.WAITING_BOARD, engine.status.state)
    }
}
