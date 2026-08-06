package com.chesslab.tracker.ui.review

import com.chesslab.tracker.analysis.PlyGrade
import com.chesslab.tracker.analysis.missedMate
import com.chesslab.tracker.ui.percent
import com.github.bhlangonijr.chesslib.Board

internal fun isCheckmatePosition(fen: String): Boolean = runCatching { Board().apply { loadFromFen(fen) }.isMated }.getOrDefault(false)

internal fun mateExplanation(request: MateLineRequest): String {
    val distance = request.mateIn?.let { " in $it" }.orEmpty()
    return "${request.side} can force checkmate$distance. Any reply loses."
}

internal val PlyGrade.defendsForcedMate: Boolean get() = forcedMateLine && !mateBefore

private val PlyGrade.followsForcedMate: Boolean get() = forcedMateLine && mateBefore && mateAfter

internal val PlyGrade.shortenedForcedMate: Boolean
    get() =
        defendsForcedMate &&
            mateDistanceBefore != null &&
            mateDistanceAfter != null &&
            mateDistanceAfter < mateDistanceBefore

internal fun verdictLabel(ply: PlyGrade): String =
    when {
        ply.missedMate -> "Missed mate"
        ply.shortenedForcedMate -> "Mate sooner"
        ply.defendsForcedMate && ply.playedBest -> "Best defense"
        ply.defendsForcedMate -> "Mate remains"
        ply.followsForcedMate && !ply.playedBest -> "Mate kept"
        else -> label(ply.quality)
    }

internal fun verdictDetail(ply: PlyGrade): String =
    when {
        ply.missedMate -> "Forced mate was lost"
        ply.shortenedForcedMate -> "Mate in ${ply.mateDistanceBefore} → ${ply.mateDistanceAfter}"
        ply.defendsForcedMate && ply.mateDistanceAfter != null -> "Mate stays in ${ply.mateDistanceAfter}"
        ply.followsForcedMate && !ply.playedBest && ply.mateDistanceAfter != null ->
            "Still mate in ${ply.mateDistanceAfter}"
        else -> "${percent(ply.winBefore)} → ${percent(ply.winAfter)}"
    }
