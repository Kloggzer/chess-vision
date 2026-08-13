package com.chesslab.tracker.ui.review

import androidx.annotation.StringRes
import com.chesslab.tracker.R
import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.PlyGrade
import com.chesslab.tracker.games.GameResult

/**
 * What a result is CALLED, as a string resource. It resolves nothing itself: this file is reached
 * from plain functions as well as from composables, and an `@StringRes` id travels through both.
 */
@StringRes
internal fun resultHeadline(result: GameResult): Int =
    when (result) {
        GameResult.WHITE -> R.string.games_result_white
        GameResult.BLACK -> R.string.games_result_black
        GameResult.DRAW -> R.string.games_result_draw
        GameResult.UNFINISHED -> R.string.games_result_unfinished
    }

internal fun mateStory(grade: GameGrade): String {
    val white = grade.missedMates(white = true)
    val black = grade.missedMates(white = false)
    return when {
        white > 0 && black > 0 -> "White missed ${chances(white)} · Black missed ${chances(black)}."
        white > 0 -> "White missed ${chances(white)}."
        black > 0 -> "Black missed ${chances(black)}."
        else -> "No missed mating chances found."
    }
}

/** Names the first attacking move in the final uninterrupted line that actually reached mate. */
internal fun followedMateStory(grade: GameGrade): String? {
    if (grade.evalMate.lastOrNull() != 0) return null
    val finalLine =
        grade.byPly.values
            .sortedBy { it.ply }
            .asReversed()
            .takeWhile { it.forcedMateLine }
            .asReversed()
    val first = finalLine.firstOrNull { it.mateBefore && it.mateAfter } ?: return null
    return "${movingSide(first)} · forced mate"
}

private fun chances(count: Int): String = "$count mating ${if (count == 1) "chance" else "chances"}"

internal fun accuracyDenominator(
    graded: Int,
    moves: Int,
): String = "$graded/$moves moves graded"

internal fun movingSide(ply: PlyGrade): String = if (ply.whiteMoved) "White" else "Black"
