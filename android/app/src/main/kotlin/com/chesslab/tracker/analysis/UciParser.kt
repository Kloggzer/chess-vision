package com.chesslab.tracker.analysis

/**
 * Pure-Kotlin parsing of UCI engine output lines (`info …`, `bestmove …`).
 *
 * Only the fields the analysis pipeline needs are extracted: depth, score
 * (cp/mate, side-to-move POV) and the principal variation.
 */
object UciParser {
    /** Parsed `info` line: search [depth], [eval] score, and principal variation. */
    data class Info(
        val depth: Int?,
        val eval: Eval?,
        val pv: List<String>,
    )

    /**
     * Parse a UCI `info` line, e.g.
     * `info depth 20 seldepth 28 multipv 1 score cp 35 nodes 12345 pv e2e4 e7e5`.
     *
     * @return the extracted fields, or null if [line] is not an `info` line or
     *   carries neither a score nor a pv (e.g. `info string …`, currmove traffic).
     */
    fun parseInfo(line: String): Info? {
        val tokens = line.trim().split(WHITESPACE)
        val info = if (tokens.firstOrNull() == "info") extractInfo(tokens) else null
        return info?.takeUnless { it.eval == null && it.pv.isEmpty() }
    }

    /** Walks the token stream of an `info` line; null for `info string …` noise. */
    private fun extractInfo(tokens: List<String>): Info? {
        var depth: Int? = null
        var eval: Eval? = null
        var pv: List<String> = emptyList()

        var i = 1
        while (i < tokens.size) {
            when (tokens[i]) {
                "depth" -> {
                    depth = tokens.getOrNull(i + 1)?.toIntOrNull()
                    i += 2
                }
                "score" -> {
                    eval = parseScore(tokens.getOrNull(i + 1), tokens.getOrNull(i + 2))
                    i += SCORE_FIELD_SPAN
                }
                "pv" -> {
                    // pv is always the last field: the rest of the line is the variation.
                    pv = tokens.subList(i + 1, tokens.size)
                    i = tokens.size
                }
                "string" -> return null // "info string ..." carries no search data
                else -> i += 1
            }
        }
        return Info(depth = depth, eval = eval, pv = pv)
    }

    /**
     * Parse a UCI `bestmove` line, e.g. `bestmove e2e4 ponder e7e5`.
     *
     * @return the best move in UCI notation, or null if [line] is not a
     *   `bestmove` line or the engine reported `(none)` (no legal move).
     */
    fun parseBestMove(line: String): String? {
        val tokens = line.trim().split(WHITESPACE)
        val move = if (tokens.firstOrNull() == "bestmove") tokens.getOrNull(1) else null
        return move?.takeUnless { it == "(none)" }
    }

    /** Whether [line] is a `bestmove` line (even `bestmove (none)`). */
    fun isBestMoveLine(line: String): Boolean = line.trimStart().startsWith("bestmove")

    private fun parseScore(
        kind: String?,
        value: String?,
    ): Eval? {
        val number = value?.toIntOrNull() ?: return null
        return when (kind) {
            "cp" -> Eval(cp = number, mateIn = null)
            "mate" -> Eval(cp = null, mateIn = number)
            else -> null
        }
    }

    /** `score <cp|mate> <value>` occupies three tokens. */
    private const val SCORE_FIELD_SPAN = 3

    private val WHITESPACE = Regex("\\s+")
}
