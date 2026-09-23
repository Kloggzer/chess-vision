package com.chesslab.tracker.hints

import com.chesslab.tracker.games.HintStatus

/** Wie viele Zuege der Mattweg hoechstens nennt — danach hoert niemand mehr zu. */
private const val LINE_PLIES = 6

/** Der Wortlaut des Tipps und der Absage, in denselben zwei Sprachen wie `AlarmPhrase`.
 *  Beides geht ueber den Speaker UND auf die Karte: bei Klingelton-aus schweigt die Stimme. */
object HintPhrase {
    fun of(
        outcome: HintOutcome,
        language: String,
    ): String =
        when (outcome) {
            is HintOutcome.Tip -> tip(outcome, german(language))
            is HintOutcome.Refused -> refusal(outcome.reason, german(language))
            HintOutcome.Ignored -> ""
        }

    private fun tip(
        tip: HintOutcome.Tip,
        de: Boolean,
    ): String {
        val move = if (de) "Spiel ${tip.san}" else "Play ${tip.san}"
        val mate = tip.mateIn ?: return move
        val head = if (de) "Du hast Matt in $mate" else "You have mate in $mate"
        val line = tip.line.take(LINE_PLIES).joinToString(" ")
        val failure = tip.lineFailure?.let { if (de) "Engine nicht verfuegbar: $it" else "Engine unavailable: $it" }
        return listOf(head, move, line, failure.orEmpty()).filter { it.isNotBlank() }.joinToString(". ")
    }

    private fun refusal(
        reason: HintRefusal,
        de: Boolean,
    ): String = (if (de) GERMAN else ENGLISH).getValue(reason)

    private fun german(language: String) = language.substringBefore('-').lowercase() == "de"
}

/** Jede Absage sagt, dass sie NICHTS gekostet hat — sonst zaehlt der Nutzer selbst mit. */
private val ENGLISH =
    mapOf(
        HintRefusal.GATE to "No help right now — the engine is paused. Nothing was used up.",
        HintRefusal.UNSETTLED to "The position is not settled. Ask again in a moment. Nothing was used up.",
        HintRefusal.EXPIRED to "The position changed before the tip was ready. Nothing was used up.",
        HintRefusal.OVER to "The game is over. Nothing was used up.",
        HintRefusal.SPENT to "No tips left in this game.",
        HintRefusal.NOT_YOUR_TURN to "It is not your move.",
    )

private val GERMAN =
    mapOf(
        HintRefusal.GATE to "Gerade keine Hilfe — die Engine pausiert. Verbraucht ist nichts.",
        HintRefusal.UNSETTLED to "Die Stellung steht noch nicht. Gleich nochmal. Verbraucht ist nichts.",
        HintRefusal.EXPIRED to "Die Stellung hat sich geaendert, bevor der Tipp fertig war. Verbraucht ist nichts.",
        HintRefusal.OVER to "Die Partie ist zu Ende. Verbraucht ist nichts.",
        HintRefusal.SPENT to "Keine Tipps mehr in dieser Partie.",
        HintRefusal.NOT_YOUR_TURN to "Du bist nicht am Zug.",
    )

/** Der Vermerk an einer Zugzeile: ein Zeichen und sein Klartext, in denselben zwei Sprachen. Er
 *  benotet NICHTS — und fuer eine Partie ohne Aufzeichnung sagt er genau das, nicht "kein Tipp". */
object HintMark {
    fun sign(status: HintStatus): String =
        when (status) {
            HintStatus.FOLLOWED -> "◆"
            HintStatus.GIVEN -> "◇"
            else -> ""
        }

    fun words(
        status: HintStatus,
        language: String,
    ): String = (if (german(language)) MARK_GERMAN else MARK_ENGLISH)[status].orEmpty()

    private fun german(language: String) = language.substringBefore('-').lowercase() == "de"
}

private val MARK_ENGLISH =
    mapOf(
        HintStatus.FOLLOWED to "◆ This move was told to the player.",
        HintStatus.GIVEN to "◇ A tip was given here; a different move was played.",
        HintStatus.NOT_RECORDED to "Whether tips were given was not recorded for this game.",
    )

private val MARK_GERMAN =
    mapOf(
        HintStatus.FOLLOWED to "◆ Dieser Zug wurde vorgesagt.",
        HintStatus.GIVEN to "◇ Hier gab es einen Tipp; gespielt wurde ein anderer Zug.",
        HintStatus.NOT_RECORDED to "Ob es Tipps gab, wurde fuer diese Partie nicht aufgezeichnet.",
    )
