package com.chesslab.tracker.hints

/** Die Hilfe gehoert zur laufenden PARTIE, nicht zum Schirm: der Controller ueberlebt jede
 *  Neuzusammensetzung und jedes Wiederanbinden des Dienstes, genau wie `GameSessionHost`. */
object HintHost {
    val controller = HintController()
}

/** Wie lange die aktuelle Stellung schon steht. Wird bei jedem Stellungswechsel neu gestempelt. */
class FenClock(
    private val now: () -> Long = System::currentTimeMillis,
) {
    private var fen: String? = null
    private var since = 0L

    fun steadyMs(current: String): Long {
        if (current != fen) {
            fen = current
            since = now()
        }
        return now() - since
    }
}
