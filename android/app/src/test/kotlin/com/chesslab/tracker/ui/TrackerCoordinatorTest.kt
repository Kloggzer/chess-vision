package com.chesslab.tracker.ui

import com.chesslab.engine.Game
import com.chesslab.engine.Squares
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerState
import com.chesslab.engine.uciOf
import com.chesslab.tracker.service.TrackerCoordinator
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.random.Random

/**
 * Feeds a synthetic board feed (same procedural renderer as the engine's
 * end-to-end test) through [TrackerCoordinator] — a stand-in for a fake camera —
 * and asserts the reduced [UiState] carries the moves, SAN history, announcements
 * and provenance (spec 04 acceptance).
 */
class TrackerCoordinatorTest {
    private val bs = 512
    private val cell = 64
    private val rng = Random(42)
    private var tsNs = 0L
    private val dtNs = 250_000_000L

    private fun render(game: Game): Pair<GrayImage, BgrImage> {
        val g = ByteArray(bs * bs)
        for (sq in Squares.all) drawSquare(g, sq, game.pieceCharAt(sq))
        for (i in g.indices) g[i] = ((g[i].toInt() and 0xFF) + rng.nextInt(-2, 3)).coerceIn(0, 255).toByte()
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
        coordinator: TrackerCoordinator,
        game: Game,
        frames: Int,
    ) {
        repeat(frames) {
            val (gray, bgr) = render(game)
            tsNs += dtNs
            coordinator.onFrame(gray, bgr, tsNs)
        }
    }

    @Test
    fun `synthetic feed produces UiState with moves, history and announcements`() {
        val coordinator = TrackerCoordinator()
        val game = Game()
        feed(coordinator, game, 8)
        assertEquals(TrackerState.TRACKING, coordinator.uiState.value.trackerState)

        for (uci in listOf("e2e4", "e7e5", "g1f3")) {
            game.push(game.legalMoves().first { uciOf(it) == uci })
            feed(coordinator, game, 8)
        }

        val ui = coordinator.uiState.value
        assertEquals(listOf("e4", "e5", "Nf3"), ui.san)
        assertEquals("Nf3", ui.lastMoveSan)
        assertEquals(game.fen(), ui.fen)
        assertNotNull(ui.announcement)
        assertTrue(ui.announcement!!.text.contains("knight", ignoreCase = true))
        assertNotNull(ui.moves.last().decision)
    }

    @Test
    fun `undo removes the last move from UiState`() {
        val coordinator = TrackerCoordinator()
        val game = Game()
        feed(coordinator, game, 8)
        game.push(game.legalMoves().first { uciOf(it) == "e2e4" })
        feed(coordinator, game, 8)
        assertEquals(listOf("e4"), coordinator.uiState.value.san)
        assertTrue(coordinator.undo())
        assertEquals(emptyList<String>(), coordinator.uiState.value.san)
    }

    @Test
    fun `reset clears history and re-arms reference`() {
        val coordinator = TrackerCoordinator()
        val game = Game()
        feed(coordinator, game, 8)
        coordinator.reset()
        assertEquals(emptyList<String>(), coordinator.uiState.value.san)
        assertEquals(TrackerState.WAITING_BOARD, coordinator.uiState.value.trackerState)
    }

    @Test
    fun `config changes preserve fen history provenance and undo stack`() {
        val coordinator = TrackerCoordinator()
        val game = Game()
        feed(coordinator, game, 8)
        game.push(game.legalMoves().first { uciOf(it) == "e2e4" })
        feed(coordinator, game, 8)
        val before = coordinator.uiState.value

        coordinator.applyConfig(TrackerConfig(zThr = 4.0))
        coordinator.reconfigure(TrackerConfig(zThr = 4.0, usePrior = false))

        val after = coordinator.uiState.value
        assertEquals(before.fen, after.fen)
        assertEquals(before.san, after.san)
        assertNotNull(after.moves.single().decision)
        assertTrue(coordinator.undo(), "the chess-library move stack must survive tuning")
        assertEquals(emptyList<String>(), coordinator.uiState.value.san)
    }
}
