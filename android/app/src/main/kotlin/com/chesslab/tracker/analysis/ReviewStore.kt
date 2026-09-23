package com.chesslab.tracker.analysis

import com.chesslab.tracker.games.GAMES_JSON
import com.chesslab.tracker.io.writeAtomic
import com.github.bhlangonijr.chesslib.Board
import kotlinx.serialization.Serializable
import java.io.File
import java.security.MessageDigest

/** [cp] carries `MATE_CP` for a forced mate, as in memory: the file caches [Score], it is not a second form. */
@Serializable
data class StoredScore(
    val cp: Int,
    val depth: Int,
    val line: List<String> = emptyList(),
    val mate: Int? = null,
)

/** [scores] is DENSE, one per position, null where not yet searched: an interrupted run must stay savable.
 *  [budget] is the KEY — 14 of 83 plies change class between `movetime 400` and depth 16, so a file
 *  under another budget is discarded, never merged ([load]). */
@Serializable
data class StoredAnalysis(
    val gameId: String,
    val budget: ReviewBudget,
    val scores: List<StoredScore?>,
    /** `ignoreUnknownKeys` plus defaults loads an OLDER file silently without the fields added since —
     *  a missing "better" line would read as "the engine had nothing to say". */
    val version: Int = 0,
)

/** Bumped whenever the stored SHAPE changes, [ReviewBudget]'s included: `ignoreUnknownKeys` dropped the old
 *  budget keys, the new ones took defaults, and a depth-30 file compared EQUAL to the node budget. */
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

@Serializable
private data class StoredPositionScore(
    val position: String,
    val budget: ReviewBudget,
    val score: StoredScore,
    val version: Int = POSITION_SCORE_VERSION,
)

/** Separate from `GameStore`: a game is a RECORD, an analysis a derived opinion that only costs engine time. */
class ReviewStore(
    private val root: File,
) {
    /** Null when nothing exists *for this budget* — a mismatch is a miss, never a partial hit. [positions]
     *  guards a file written for a different game length (a re-recorded id). */
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

    /** Promotes the game file's scores into the position cache too: old installs migrate lazily. */
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
