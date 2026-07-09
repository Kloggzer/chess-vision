package com.chesslab.tracker.service

/**
 * Turns a SAN move into a spoken phrase for the accessibility LiveRegion
 * ("White plays knight f3", "Black castles kingside", "White plays queen takes e5,
 * check"). Side is inferred from the ply index (SAN carries no colour).
 */
object MoveSpeech {
    /** [ply] is 1-based: odd = White to move. */
    fun describe(
        san: String,
        ply: Int,
    ): String {
        val side = if (ply % 2 == 1) "White" else "Black"
        return "$side ${phrase(san)}"
    }

    /** Convenience when the caller has no ply index (announces without a side). */
    fun describe(san: String): String = phrase(san).replaceFirstChar { it.uppercase() }

    private fun phrase(san: String): String {
        val core = san.trimEnd('+', '#')
        val suffix =
            when {
                san.endsWith('#') -> ", checkmate"
                san.endsWith('+') -> ", check"
                else -> ""
            }
        val body =
            when {
                core == "O-O" || core == "0-0" -> "castles kingside"
                core == "O-O-O" || core == "0-0-0" -> "castles queenside"
                else -> "plays ${spell(core)}"
            }
        return body + suffix
    }

    private fun spell(core: String): String {
        val promo = core.substringAfter('=', "").firstOrNull()?.let { " promotes to ${pieceName(it)}" } ?: ""
        val move = core.substringBefore('=')
        val piece = if (move.isNotEmpty() && move[0].isUpperCase()) pieceName(move[0]) else "pawn"
        val takes = if ('x' in move) " takes" else ""
        val target = move.filter { it.isDigit() || it in 'a'..'h' }.takeLast(2)
        return "$piece$takes $target$promo".trim()
    }

    private fun pieceName(letter: Char): String =
        when (letter.uppercaseChar()) {
            'N' -> "knight"
            'B' -> "bishop"
            'R' -> "rook"
            'Q' -> "queen"
            'K' -> "king"
            else -> "pawn"
        }
}
