package com.chesslab.tracker.analysis

import com.chesslab.tracker.games.GAMES_JSON
import com.chesslab.tracker.games.writeAtomic
import com.github.bhlangonijr.chesslib.Board
import kotlinx.serialization.Serializable
import java.io.File
import java.security.MessageDigest

/**
 * One position's engine verdict as it survives a restart. [cp] carries `MATE_CP` for a forced mate,
 * exactly as in memory — the file is a cache of [Score], not a second representation of it.
 */
@Serializable
data class StoredScore(
    val cp: Int,
    val depth: Int,
    /** The engine's continuation in UCI — the advice, which would otherwise cost a second search. */
    val line: List<String> = emptyList(),
    /** Signed mate distance, needed for "Mate in 3" instead of a colour-only label. */
    val mate: Int? = null,
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
    /**
     * What this file can carry, not what produced it — [budget] covers that.
     *
     * `ignoreUnknownKeys` plus defaulted fields means an OLDER file loads happily and silently
     * without whatever was added since: the first version stored only the best move, so it would
     * have come back as a full analysis with the "what would have been better" line missing
     * everywhere and no way to tell that from a game the engine had nothing to say about.
     */
    val version: Int = 0,
)

/**
 * Bumped whenever the stored SHAPE changes — a score gaining a field, or [ReviewBudget] itself
 * changing its fields.
 *
 * The budget case is the one that bit, on the device on 2026-08-03. The budget went from
 * `depth`/`movetimeMs` to `nodes`/`capMs`; `ignoreUnknownKeys` dropped the two old keys and the two
 * new ones took their defaults, so the decoded budget compared EQUAL to the current one and a
 * depth-30 analysis was served as though it were a node-budget one. A budget key cannot police a
 * change to the budget's own shape.
 */
private const val STORE_VERSION = 3
private const val MATE_LINE_VERSION = 1
private const val POSITION_SCORE_VERSION = 1
private const val FEN_POSITION_FIELDS = 5

@Serializable
private data class StoredMateLine(
    val position: String,
    val budget: ReviewBudget,
    val uciLine: List<String>,
    val sanLine: List<String>,
    val complete: Boolean,
    val version: Int = MATE_LINE_VERSION,
)

/** One reusable engine result, independent of the game that first asked for the position. */
@Serializable
private data class StoredPositionScore(
    val position: String,
    val budget: ReviewBudget,
    val score: StoredScore,
    val version: Int = POSITION_SCORE_VERSION,
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
        if (stored.version != STORE_VERSION || stored.budget != budget || stored.scores.size != positions) return null
        return stored.scores.map { it?.let { row -> Score(row.cp, row.depth, row.line, row.mate) } }
    }

    fun save(
        gameId: String,
        budget: ReviewBudget,
        scores: List<Score?>,
    ) {
        root.mkdirs()
        val rows = scores.map { it?.let { s -> StoredScore(s.cp, s.depth, s.line, s.mate) } }
        val stored = StoredAnalysis(gameId, budget, rows, STORE_VERSION)
        writeAtomic(file(gameId), GAMES_JSON.encodeToString(StoredAnalysis.serializer(), stored))
    }

    /**
     * Completes a game's dense score array from the process-wide position cache.
     *
     * Existing game files remain the fast progress snapshot. Scores found there are also promoted
     * into the position cache, which migrates old installs lazily without a separate startup pass.
     */
    fun loadCached(
        gameId: String,
        budget: ReviewBudget,
        positions: List<String>,
    ): List<Score?>? {
        val gameScores = load(gameId, budget, positions.size)
        val merged = MutableList<Score?>(positions.size) { index -> gameScores?.getOrNull(index) }
        positions.forEachIndexed { index, fen ->
            val fromGame = merged[index]
            if (fromGame != null) {
                savePositionIfMissing(fen, budget, fromGame)
            } else {
                merged[index] = loadPosition(fen, budget)
            }
        }
        return merged.takeIf { scores -> scores.any { it != null } }
    }

    /** Persists one successful search so another game can reuse it immediately. */
    fun savePosition(
        fen: String,
        budget: ReviewBudget,
        score: Score,
    ) {
        val position = canonicalEnginePosition(fen)
        val stored = StoredPositionScore(position, budget, score.stored(), POSITION_SCORE_VERSION)
        positionDir().mkdirs()
        writeAtomic(positionFile(position, budget), GAMES_JSON.encodeToString(StoredPositionScore.serializer(), stored))
    }

    private fun savePositionIfMissing(
        fen: String,
        budget: ReviewBudget,
        score: Score,
    ) {
        val position = canonicalEnginePosition(fen)
        if (!positionFile(position, budget).exists()) savePosition(fen, budget, score)
    }

    fun loadPosition(
        fen: String,
        budget: ReviewBudget,
    ): Score? {
        val position = canonicalEnginePosition(fen)
        val stored =
            runCatching {
                GAMES_JSON.decodeFromString(StoredPositionScore.serializer(), positionFile(position, budget).readText())
            }.getOrNull() ?: return null
        if (stored.version != POSITION_SCORE_VERSION || stored.position != position || stored.budget != budget) return null
        return stored.score.score()
    }

    /** Returns a previously completed mate line for this exact chess position and review budget. */
    fun loadMateLine(
        fen: String,
        budget: ReviewBudget,
    ): ResolvedMateLine? {
        val position = canonicalEnginePosition(fen)
        val stored =
            runCatching { GAMES_JSON.decodeFromString(StoredMateLine.serializer(), mateLineFile(position, budget).readText()) }
                .getOrNull() ?: return null
        if (!stored.matches(position, budget)) return null
        return verifiedMateLine(fen, stored.uciLine)
    }

    /** Persists only verified lines: an interrupted or inconclusive search must be retryable. */
    fun saveMateLine(
        fen: String,
        budget: ReviewBudget,
        line: ResolvedMateLine,
    ) {
        val verified = line.takeIf { it.complete }?.let { verifiedMateLine(fen, it.uciLine) } ?: return
        val position = canonicalEnginePosition(fen)
        val stored = StoredMateLine(position, budget, verified.uciLine, verified.sanLine, complete = true)
        mateLineDir().mkdirs()
        writeAtomic(mateLineFile(position, budget), GAMES_JSON.encodeToString(StoredMateLine.serializer(), stored))
    }

    fun delete(gameId: String) {
        file(gameId).delete()
    }

    private fun file(gameId: String) = File(root, "$gameId.analysis.json")

    private fun mateLineDir() = File(root, ".analysis-cache")

    private fun mateLineFile(
        position: String,
        budget: ReviewBudget,
    ) = File(mateLineDir(), "${positionHash(cacheIdentity(position, budget))}.mate.json")

    private fun positionDir() = File(root, ".analysis-cache/positions")

    private fun positionFile(
        position: String,
        budget: ReviewBudget,
    ) = File(positionDir(), "${positionHash(cacheIdentity(position, budget))}.json")
}

/** A cache flag is not proof: replay every move and require the resulting board to be checkmate. */
private fun verifiedMateLine(
    startFen: String,
    uciLine: List<String>,
): ResolvedMateLine? {
    val frames = lineFrames(startFen, uciLine)
    if (frames.size != uciLine.size + 1) return null
    val checkmate = runCatching { Board().apply { loadFromFen(frames.last().fen) }.isMated }.getOrDefault(false)
    if (!checkmate) return null
    return ResolvedMateLine(uciLine, sansOf(startFen, uciLine), complete = true)
}

private fun Score.stored() = StoredScore(cp, depth, line, mate)

private fun StoredScore.score() = Score(cp, depth, line, mate)

private fun cacheIdentity(
    position: String,
    budget: ReviewBudget,
): String = "$position|${budget.nodes}|${budget.capMs}|${budget.threads}|${budget.hashMb}|${budget.multiPv}"

/** Fullmove number cannot change engine advice; the fifty-move clock remains part of the position. */
internal fun canonicalEnginePosition(fen: String): String =
    fen.trim().split(Regex("\\s+")).let { fields ->
        if (fields.size >= FEN_POSITION_FIELDS) fields.take(FEN_POSITION_FIELDS).joinToString(" ") else fen.trim()
    }

private fun StoredMateLine.matches(
    position: String,
    budget: ReviewBudget,
): Boolean {
    val identityMatches = version == MATE_LINE_VERSION && this.position == position
    val analysisMatches = this.budget == budget && complete
    return identityMatches && analysisMatches
}

private fun positionHash(position: String): String =
    MessageDigest
        .getInstance("SHA-256")
        .digest(position.toByteArray(Charsets.UTF_8))
        .joinToString("") { byte -> "%02x".format(byte) }
