package com.chesslab.tracker.analysis

/** One `multipv` line. [cp]/[mate] are the engine's own SIDE-TO-MOVE point of view until flipped. */
data class PvLine(
    val uci: String?,
    val cp: Int?,
    val mate: Int?,
    val depth: Int,
)

/** A parsed `info` line: the [PvLine] plus the `multipv` slot it belongs to (1-based). */
internal data class UciInfo(
    val multiPv: Int,
    val line: PvLine,
)

private val WHITESPACE = Regex("\\s+")

/** Centipawns per pawn — the unit the bar and the panel display in. */
internal const val CP_PER_PAWN = 100.0

/**
 * Parse `info depth 20 multipv 1 score cp 35 … pv e2e4 e7e5`.
 *
 * Returns null for anything without a score — `info string …`, `currmove` traffic and the bare
 * `info depth 1 nodes …` preamble carry nothing the bar can show.
 */
internal fun parseUciInfo(raw: String): UciInfo? {
    val tokens = raw.trim().split(WHITESPACE)
    if (tokens.firstOrNull() != "info" || "string" in tokens) return null
    val (cp, mate) = scoreOf(tokens) ?: return null
    return UciInfo(
        multiPv = intAfter(tokens, "multipv") ?: 1,
        line =
            PvLine(
                // `pv` is always last: the first token after it is the move being recommended.
                uci = tokens.indexOf("pv").takeIf { it >= 0 }?.let { tokens.getOrNull(it + 1) },
                cp = cp,
                mate = mate,
                depth = intAfter(tokens, "depth") ?: 0,
            ),
    )
}

/** `(cp, mate)`, exactly one of them set; null when the line carries no score at all. */
private fun scoreOf(tokens: List<String>): Pair<Int?, Int?>? {
    val at = tokens.indexOf("score")
    if (at < 0) return null
    val value = tokens.getOrNull(at + 2)?.toIntOrNull() ?: return null
    return when (tokens.getOrNull(at + 1)) {
        "cp" -> value to null
        "mate" -> null to value
        else -> null
    }
}

private fun intAfter(
    tokens: List<String>,
    key: String,
): Int? = tokens.indexOf(key).takeIf { it >= 0 }?.let { tokens.getOrNull(it + 1)?.toIntOrNull() }

/** True for `bestmove …`, including `bestmove (none)` — either way the search is over. */
internal fun isBestMoveLine(raw: String): Boolean = raw.trimStart().startsWith("bestmove")

/**
 * UCI reports scores for the side to move; the eval bar is always White's (`analysis.py` takes
 * `pv["score"].white()`). Forgetting this flip is the classic eval-bar bug, so it lives alone here.
 */
internal fun PvLine.toWhitePov(whiteToMove: Boolean): PvLine =
    if (whiteToMove) this else copy(cp = cp?.let { -it }, mate = mate?.let { -it })
