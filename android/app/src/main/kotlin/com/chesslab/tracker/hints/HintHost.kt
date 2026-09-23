package com.chesslab.tracker.hints

import com.chesslab.tracker.games.HintLedger

/** Die Hilfe gehoert zur laufenden PARTIE, nicht zum Schirm: der Controller ueberlebt jede
 *  Neuzusammensetzung und jedes Wiederanbinden des Dienstes, genau wie `GameSessionHost`. */
object HintHost {
    val ledger = HintLedger()

    val controller = HintController(ledger)
}

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
