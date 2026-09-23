package com.chesslab.engine.api

private const val FEN_SIDE = 1
private const val FEN_FULLMOVE = 5

/** The one reader of a FEN's side-to-move field: `null` when it is absent or not `w`/`b`,
 *  and each caller decides what that means (`FenFieldExtractionCharacterizationTest`). */
fun fenWhiteToMove(fen: String): Boolean? =
    when (fen.split(' ').getOrNull(FEN_SIDE)) {
        "w" -> true
        "b" -> false
        else -> null
    }

fun fenFullmove(fen: String): Int? = fen.split(' ').getOrNull(FEN_FULLMOVE)?.toIntOrNull()
