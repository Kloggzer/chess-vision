package com.chesslab.tracker.ui.review

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.ui.settings.Card
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted

@Composable
internal fun MateStoryCard(
    game: GameView,
    grade: GameGrade,
) {
    Card {
        Text(resultHeadline(game.result), style = MaterialTheme.typography.titleMedium, color = OnSurface)
        Text(mateStory(grade), style = MaterialTheme.typography.bodyMedium, color = OnSurface)
        Text(
            forcedMateStory(grade.forcedMatePlies),
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
    }
}

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
    return "${movingSide(first.ply)} · forced mate"
}

private fun chances(count: Int): String = "$count mating ${if (count == 1) "chance" else "chances"}"

private fun forcedMateStory(count: Int): String =
    if (count == 0) {
        "No played forced-mate sequence was found."
    } else {
        "$count ${if (count == 1) "move" else "moves"} in the forced mate sequence excluded from accuracy."
    }

internal fun accuracyDenominator(
    graded: Int,
    moves: Int,
): String = "$graded/$moves moves graded"

internal fun movingSide(ply: Int): String = if (ply % 2 == 1) "White" else "Black"
