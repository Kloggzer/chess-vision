package com.chesslab.tracker.hints

import com.chesslab.engine.api.fenWhiteToMove
import com.chesslab.tracker.analysis.AnalysisResult
import com.chesslab.tracker.analysis.GateBlock
import kotlin.math.abs

/** Pro PARTIE, nicht pro Phase (Nutzer, 2026-09-22): der Ausgleichsregler, keine Sparmassnahme. */
const val DEFAULT_HINT_QUOTA = 3

/** Wie lange eine Stellung stehen muss, bevor ein Tipp sich an sie bindet: dieselbe Spanne wie
 *  `GameSessionController.UNDO_CONFIRM_MS`, denn davor ist sie noch ein moeglicher Rueckzieher. */
const val HINT_SETTLE_MS = 500L

enum class HintSide { WHITE, BLACK }

data class HintPlan(
    val side: HintSide? = null,
    val quota: Int = DEFAULT_HINT_QUOTA,
)

/** Warum eine Anfrage abgelehnt wurde. Keiner dieser Gruende kostet Kontingent. */
enum class HintRefusal {
    GATE,

    UNSETTLED,

    EXPIRED,

    OVER,

    SPENT,

    NOT_YOUR_TURN,
}

data class HintLine(
    val san: List<String>,
    val failure: String? = null,
)

data class HintMoment(
    val fen: String,
    val recordFen: String? = null,
    val steadyMs: Long = Long.MAX_VALUE,
    val alarmed: Boolean = false,
    val blocked: GateBlock? = null,
    val result: AnalysisResult? = null,
)

sealed interface HintOutcome {
    data class Tip(
        val fen: String,
        val san: String,
        /** Nur an der UCI laesst sich hinterher pruefen, ob der Zug gespielt wurde. */
        val uci: String,
        val mateIn: Int?,
        val line: List<String>,
        val remaining: Int,
        val lineFailure: String? = null,
    ) : HintOutcome

    data class Refused(
        val reason: HintRefusal,
    ) : HintOutcome

    data object Ignored : HintOutcome
}

data class HintUiState(
    val plan: HintPlan = HintPlan(),
    val remaining: Int = 0,
    val outcome: HintOutcome? = null,
)

fun sideToMove(fen: String): HintSide? =
    when (fenWhiteToMove(fen)) {
        true -> HintSide.WHITE
        false -> HintSide.BLACK
        null -> null
    }

/** `AnalysisLine.mate` liegt aus WEISSSICHT vor: `mate != null` kann auch das eigene Matt sein. */
fun mateForSide(
    result: AnalysisResult,
    side: HintSide,
): Int? {
    val mate = result.mate ?: return null
    val mine = if (side == HintSide.WHITE) mate > 0 else mate < 0
    return if (mine) abs(mate) else null
}
