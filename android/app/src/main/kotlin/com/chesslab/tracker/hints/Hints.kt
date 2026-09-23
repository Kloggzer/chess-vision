package com.chesslab.tracker.hints

import com.chesslab.engine.api.fenWhiteToMove
import com.chesslab.tracker.analysis.AnalysisResult
import com.chesslab.tracker.analysis.GateBlock
import kotlin.math.abs

/** Wie viele Tipps eine Partie hergibt. Das Kontingent gilt pro PARTIE und nicht pro Phase
 *  (Nutzer, 2026-09-22) — es ist der Ausgleichsregler, nicht eine Sparmassnahme. */
const val DEFAULT_HINT_QUOTA = 3

/** Wie lange eine Stellung stehen muss, bevor ein Tipp sich an sie bindet: dieselbe Spanne wie
 *  `GameSessionController.UNDO_CONFIRM_MS`, denn davor ist sie noch ein moeglicher Rueckzieher. */
const val HINT_SETTLE_MS = 500L

enum class HintSide { WHITE, BLACK }

/** Wer in DIESER Partie Hilfe anfordern darf; `null` heisst niemand. */
data class HintPlan(
    val side: HintSide? = null,
    val quota: Int = DEFAULT_HINT_QUOTA,
)

/** Warum eine Anfrage abgelehnt wurde. Keiner dieser Gruende kostet Kontingent. */
enum class HintRefusal {
    /** Das Gate hat die Analyse abgeschaltet — Hitze, Akku oder zu langsame Bilder. */
    GATE,

    /** Alarm-Latch oder offenes Rueckzieher-Fenster: die Stellung gilt gerade nicht. */
    UNSETTLED,

    /** Kein Ergebnis zu DIESER Stellung — der Tipp waere aus einer anderen gerechnet. */
    EXPIRED,

    /** Die Partie ist auf dem Brett entschieden. */
    OVER,

    /** Kein Kontingent mehr. */
    SPENT,

    /** Die unterstuetzte Seite ist nicht am Zug. */
    NOT_YOUR_TURN,
}

/** Der Mattweg in SAN; [failure] sagt, warum die Engine ihn nicht verlaengern konnte. */
data class HintLine(
    val san: List<String>,
    val failure: String? = null,
)

/** Was die App im Moment des Drucks sieht. Der Tipp wird genau hieran gebunden. */
data class HintMoment(
    val fen: String,
    /** Die Stellung des Partie-Records; `null` vor dem ersten Zug. */
    val recordFen: String? = null,
    /** Wie lange [fen] schon steht — siehe [HINT_SETTLE_MS]. */
    val steadyMs: Long = Long.MAX_VALUE,
    val alarmed: Boolean = false,
    val blocked: GateBlock? = null,
    val result: AnalysisResult? = null,
)

sealed interface HintOutcome {
    /** [mateIn] ist aus Sicht der unterstuetzten Seite; [line] bleibt ausser bei Matt leer. */
    data class Tip(
        val fen: String,
        val san: String,
        /** Derselbe Zug in UCI: nur daran laesst sich hinterher pruefen, ob er gespielt wurde. */
        val uci: String,
        val mateIn: Int?,
        val line: List<String>,
        val remaining: Int,
        /** Gesetzt, wenn die Engine den Mattweg nicht rechnen konnte: dann steht nur der Zug da. */
        val lineFailure: String? = null,
    ) : HintOutcome

    data class Refused(
        val reason: HintRefusal,
    ) : HintOutcome

    /** Zweiter Druck, waehrend der erste noch laeuft. Die Oberflaeche zeigt dazu nichts. */
    data object Ignored : HintOutcome
}

/** Was der Schirm von der Hilfe sieht. [outcome] ist die Karte, `null` heisst keine. */
data class HintUiState(
    val plan: HintPlan = HintPlan(),
    val remaining: Int = 0,
    val outcome: HintOutcome? = null,
)

/** Die Seite am Zug, aus dem FEN. `null`, wenn er nicht lesbar ist. */
fun sideToMove(fen: String): HintSide? =
    when (fenWhiteToMove(fen)) {
        true -> HintSide.WHITE
        false -> HintSide.BLACK
        null -> null
    }

/** Die Mattdistanz aus Sicht von [side], sonst `null`. `AnalysisLine.mate` liegt aus WEISSSICHT
 *  vor, `mate != null` heisst also gerade nicht "du hast Matt" — es kann das eigene sein. */
fun mateForSide(
    result: AnalysisResult,
    side: HintSide,
): Int? {
    val mate = result.mate ?: return null
    val mine = if (side == HintSide.WHITE) mate > 0 else mate < 0
    return if (mine) abs(mate) else null
}
