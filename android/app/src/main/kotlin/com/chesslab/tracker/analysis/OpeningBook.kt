package com.chesslab.tracker.analysis

import com.chesslab.engine.api.STARTPOS
import com.chesslab.tracker.games.GameView
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator
import java.io.InputStream

data class OpeningSummary(
    val eco: String,
    val name: String,
    /** Number of played half-moves through the last position named by the book. */
    val theoryPlies: Int,
    val gameEndedInTheory: Boolean,
    /** The most referenced book path from that position, in SAN. */
    val continuation: List<String> = emptyList(),
    /** The same path in UCI, so the UI can replay it instead of merely printing it. */
    val continuationUci: List<String> = emptyList(),
)

private data class OpeningEntry(
    val eco: String,
    val name: String,
)

private data class BookMove(
    val uci: String,
    val references: Int,
)

private data class BookFrontier(
    val fen: String,
    val depth: Int,
)

private const val DEFAULT_HORIZON_PLIES = 4
private const val DISPLAY_CONTINUATION_PLIES = 4
private const val DEFAULT_MAX_POSITIONS = 8
private const val ROOT_BRANCHES = 2
private const val DEEP_BRANCHES = 1
private const val OPENING_FIELDS = 4
private const val CONTINUATION_FIELDS = 3
private const val POSITION_KEY_FIELDS = 3

/**
 * The shipped, immutable half of the review library.
 *
 * Named positions answer “what opening was this?”; continuation edges seed a few likely positions
 * into [ReviewStore]'s separate, persistent engine library. The two stores deliberately do not
 * merge: seeing a personal novelty must not silently redefine it as opening theory.
 */
class OpeningBook private constructor(
    private val named: Map<String, OpeningEntry>,
    private val continuations: Map<String, List<BookMove>>,
) {
    fun identify(game: GameView): OpeningSummary? {
        if (!game.hasClassifiableOpening()) return null
        var latest: Pair<Int, OpeningEntry>? = null
        game.plies.forEachIndexed { index, ply ->
            named[openingPositionKey(ply.fenAfter)]?.let { latest = index + 1 to it }
        }
        val (plies, entry) = latest ?: return null
        val rootFen = game.plies.getOrNull(plies - 1)?.fenAfter
        val continuationUci = rootFen?.let(::primaryContinuation).orEmpty()
        return OpeningSummary(
            eco = entry.eco,
            name = entry.name,
            theoryPlies = plies,
            gameEndedInTheory = plies == game.plies.size,
            continuation = rootFen?.let { sansOf(it, continuationUci) }.orEmpty(),
            continuationUci = continuationUci,
        )
    }

    /** Follows the most referenced legal edge at each position; this is a book line, not engine advice. */
    private fun primaryContinuation(fen: String): List<String> {
        val board = runCatching { Board().apply { loadFromFen(fen) } }.getOrNull() ?: return emptyList()
        val uci = ArrayList<String>(DISPLAY_CONTINUATION_PLIES)
        repeat(DISPLAY_CONTINUATION_PLIES) {
            val legal = MoveGenerator.generateLegalMoves(board).associateBy(Move::toString)
            val move =
                continuations[openingPositionKey(board.fen)]
                    .orEmpty()
                    .firstNotNullOfOrNull { candidate -> legal[candidate.uci] }
                    ?: return uci
            uci += move.toString()
            board.doMove(move)
        }
        return uci
    }

    /**
     * A bounded fan-out from the game's last named opening position.
     *
     * The first step keeps two popular alternatives; deeper steps keep one. This gives coaching a
     * useful nearby branch without turning one finished review into an exponential background job.
     */
    fun likelyContinuationFens(
        game: GameView,
        horizonPlies: Int = DEFAULT_HORIZON_PLIES,
        maxPositions: Int = DEFAULT_MAX_POSITIONS,
    ): List<String> {
        if (horizonPlies <= 0 || maxPositions <= 0) return emptyList()
        val rootFen = continuationRoot(game) ?: return emptyList()
        val actual = (listOf(game.startFen) + game.plies.map { it.fenAfter }).mapTo(HashSet(), ::canonicalEnginePosition)
        val queue = ArrayDeque<BookFrontier>().apply { add(BookFrontier(rootFen, 0)) }
        val queued = hashSetOf(openingPositionKey(rootFen))
        val result = ArrayList<String>()
        while (queue.isNotEmpty() && result.size < maxPositions) {
            val node = queue.removeFirst()
            if (node.depth < horizonPlies) {
                expand(node, actual, queued, queue, result)
            }
        }
        return result.take(maxPositions)
    }

    private fun expand(
        node: BookFrontier,
        actual: Set<String>,
        queued: MutableSet<String>,
        queue: ArrayDeque<BookFrontier>,
        result: MutableList<String>,
    ) {
        nextFens(node).forEach { next ->
            val key = openingPositionKey(next)
            if (queued.add(key)) {
                if (canonicalEnginePosition(next) !in actual) result += next
                queue += BookFrontier(next, node.depth + 1)
            }
        }
    }

    private fun continuationRoot(game: GameView): String? {
        val opening = identify(game) ?: return null
        return game.plies.getOrNull(opening.theoryPlies - 1)?.fenAfter
    }

    private fun nextFens(node: BookFrontier): List<String> {
        val board = runCatching { Board().apply { loadFromFen(node.fen) } }.getOrNull() ?: return emptyList()
        val legal = MoveGenerator.generateLegalMoves(board).associateBy(Move::toString)
        val branches = if (node.depth == 0) ROOT_BRANCHES else DEEP_BRANCHES
        return continuations[openingPositionKey(node.fen)]
            .orEmpty()
            .take(branches)
            .mapNotNull { candidate ->
                legal[candidate.uci]?.let { move ->
                    Board()
                        .apply {
                            loadFromFen(node.fen)
                            doMove(move)
                        }.fen
                }
            }
    }

    companion object {
        val EMPTY = OpeningBook(emptyMap(), emptyMap())

        fun load(
            openings: InputStream,
            continuations: InputStream,
        ): OpeningBook {
            val named = HashMap<String, OpeningEntry>()
            openings.bufferedReader().useLines { lines ->
                lines.drop(1).forEach { line ->
                    val fields = line.split('\t', limit = OPENING_FIELDS)
                    if (fields.size == OPENING_FIELDS) named[fields[0]] = OpeningEntry(fields[1], fields[2])
                }
            }
            val moves = HashMap<String, MutableList<BookMove>>()
            continuations.bufferedReader().useLines { lines ->
                lines.drop(1).forEach { line ->
                    val fields = line.split('\t', limit = CONTINUATION_FIELDS)
                    val references = fields.getOrNull(2)?.toIntOrNull() ?: return@forEach
                    moves.getOrPut(fields[0], ::ArrayList) += BookMove(fields[1], references)
                }
            }
            return OpeningBook(
                named,
                moves.mapValues { (_, values) -> values.sortedByDescending(BookMove::references) },
            )
        }
    }
}

private fun GameView.hasClassifiableOpening(): Boolean =
    openingPositionKey(startFen) == openingPositionKey(STARTPOS) && segments.none { it.enteredBy != null }

/** Piece placement, side and castling rights identify opening transpositions; clocks do not. */
internal fun openingPositionKey(fen: String): String =
    fen.trim().split(Regex("\\s+")).let { fields ->
        if (fields.size >= POSITION_KEY_FIELDS) fields.take(POSITION_KEY_FIELDS).joinToString(" ") else fen.trim()
    }
