package com.chesslab.tracker.spectate

import com.chesslab.tracker.ui.UiState
import kotlinx.serialization.Serializable

/**
 * Read-only JSON projection of the live game state, served by [SpectatorServer].
 * Mirrors the relevant subset of [UiState] for remote spectators — no engine
 * internals, no debug data.
 */
@Serializable
data class GameSnapshot(
    val fen: String = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    val sanHistory: List<String> = emptyList(),
    val status: String = "waiting",
    val lastDecision: String? = null,
    val result: String? = null,
) {
    companion object {
        /** Project from the app [UiState] onto the wire format. */
        fun from(state: UiState): GameSnapshot =
            GameSnapshot(
                fen = state.fen,
                sanHistory = state.moves.map { it.san },
                status =
                    when {
                        state.gameOver -> "over"
                        state.trackerState.name == "TRACKING" -> "tracking"
                        state.trackerState.name == "WAITING_BOARD" -> "waiting"
                        state.trackerState.name == "STUCK" -> "stuck"
                        else -> "tracking"
                    },
                lastDecision = state.lastMoveSan,
                result = if (state.gameOver) state.note.ifEmpty { null } else null,
            )

        /** Empty/initial state for before any UiState is received. */
        val EMPTY: GameSnapshot = GameSnapshot()
    }
}
