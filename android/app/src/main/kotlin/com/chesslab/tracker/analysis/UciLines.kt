package com.chesslab.tracker.analysis

private const val PV_PLIES = 6

/** [cp]/[mate] are the engine's SIDE-TO-MOVE point of view until flipped ([toWhitePov]). */
data class PvLine(
    val cp: Int?,
    val mate: Int?,
    val depth: Int,
    val pv: List<String> = emptyList(),
) {
    val uci: String? get() = pv.firstOrNull()
}

internal data class UciInfo(
    val multiPv: Int,
    val line: PvLine,
)

private val WHITESPACE = Regex("\\s+")

/** Null for anything without a score — `info string`, `currmove` and the bare `info depth 1` preamble. */
internal fun parseUciInfo(raw: String): UciInfo? {
    val tokens = raw.trim().split(WHITESPACE)
    if (tokens.firstOrNull() != "info" || "string" in tokens) return null
    val (cp, mate) = scoreOf(tokens) ?: return null
    return UciInfo(
        multiPv = intAfter(tokens, "multipv") ?: 1,
        line =
            PvLine(
                cp = cp,
                mate = mate,
                depth = intAfter(tokens, "depth") ?: 0,
                pv = pvOf(tokens),
            ),
    )
}

private fun pvOf(tokens: List<String>): List<String> {
    val at = tokens.indexOf("pv")
    if (at < 0) return emptyList()
    return tokens.drop(at + 1).take(PV_PLIES)
}

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

/** UCI scores the side to move; the bar is always White's. The classic eval-bar bug, so it lives alone. */
internal fun PvLine.toWhitePov(whiteToMove: Boolean): PvLine =
    if (whiteToMove) this else copy(cp = cp?.let { -it }, mate = mate?.let { -it })
