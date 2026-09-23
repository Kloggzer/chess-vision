package com.chesslab.engine.api

private const val FEN_SIDE = 1
private const val FEN_FULLMOVE = 5

/** `null` when absent or not `w`/`b`; each caller decides what that means (`FenFieldExtractionCharacterizationTest`). */
fun fenWhiteToMove(fen: String): Boolean? =
    when (fen.split(' ').getOrNull(FEN_SIDE)) {
        "w" -> true
        "b" -> false
        else -> null
    }

fun fenFullmove(fen: String): Int? = fen.split(' ').getOrNull(FEN_FULLMOVE)?.toIntOrNull()
