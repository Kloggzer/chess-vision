package com.chesslab.tracker.hints

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
        return listOf(head, move, line).filter { it.isNotBlank() }.joinToString(". ")
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
