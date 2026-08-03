package com.chesslab.tracker.analysis

import com.chesslab.tracker.games.GAMES_JSON
import com.chesslab.tracker.games.writeAtomic
import kotlinx.serialization.Serializable
import java.io.File

/**
 * One position's engine verdict as it survives a restart. [cp] carries `MATE_CP` for a forced mate,
 * exactly as in memory — the file is a cache of [Score], not a second representation of it.
 */
@Serializable
data class StoredScore(
    val cp: Int,
    val depth: Int,
    val bestUci: String? = null,
)

/**
 * A game's analysis on disk, beside its `<id>.json` and `<id>.pgn`.
 *
 * [scores] is DENSE and one entry per position (`plies + 1`), null where the engine has not got to
 * it yet. A partial run is therefore savable, which is the whole point: the pass is no longer
 * frontloaded, so it is normally interrupted, and an interrupted run that saved nothing would make
 * the streaming worse than the frontloading it replaced.
 *
 * [budget] is the KEY, not a note. Measured on the device 2026-08-03 over this game: **14 of 83
 * plies change class** between `movetime 400` and depth 16. A cache that does not say what produced
 * it would silently mix two different opinions of the same move, so a file whose budget is not the
 * one now in force is discarded rather than merged ([load]).
 */
@Serializable
data class StoredAnalysis(
    val gameId: String,
    val budget: ReviewBudget,
    val scores: List<StoredScore?>,
)

/**
 * Reads and writes `<id>.analysis.json`. Separate from `GameStore` because a game is a RECORD and an
 * analysis is a derived opinion: deleting the analysis costs engine time, deleting the game costs
 * the game.
 */
class ReviewStore(
    private val root: File,
) {
    /**
     * The stored scores for [gameId], or null when there are none *for this budget* — a mismatch is
     * a miss, never a partial hit. [positions] guards a file written for a different game length,
     * which a re-recorded id would produce.
     */
    fun load(
        gameId: String,
        budget: ReviewBudget,
        positions: Int,
    ): List<Score?>? {
        val stored =
            runCatching { GAMES_JSON.decodeFromString(StoredAnalysis.serializer(), file(gameId).readText()) }
                .getOrNull() ?: return null
        if (stored.budget != budget || stored.scores.size != positions) return null
        return stored.scores.map { it?.let { row -> Score(row.cp, row.depth, row.bestUci) } }
    }

    fun save(
        gameId: String,
        budget: ReviewBudget,
        scores: List<Score?>,
    ) {
        root.mkdirs()
        val stored = StoredAnalysis(gameId, budget, scores.map { it?.let { s -> StoredScore(s.cp, s.depth, s.bestUci) } })
        writeAtomic(file(gameId), GAMES_JSON.encodeToString(StoredAnalysis.serializer(), stored))
    }

    fun delete(gameId: String) {
        file(gameId).delete()
    }

    private fun file(gameId: String) = File(root, "$gameId.analysis.json")
}
