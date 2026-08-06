package com.chesslab.tracker.ui.review

import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.PlyGrade

internal fun resultHeadline(result: String): String =
    when (result) {
        "1-0" -> "White wins"
        "0-1" -> "Black wins"
        "1/2-1/2" -> "Draw"
        else -> "Game in progress"
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
