package com.chesslab.engine.api

/** Wer den Alarm verursacht hat: der Spieler am Brett oder die App. */
enum class AlarmFault { PLAY, ENGINE }

/**
 * Warum ein Latch einrastete — als Code, nicht als Satz: Karte, Note und Ansage formulieren selbst,
 * und die Ansage tut es auf Deutsch. Als der Grund nur als englische Prosa in `guessSan` steckte,
 * las der Ansager sie zurueck und sprach "king e1->f1 illegal move suspec ted" (User, 2026-08-28).
 */
enum class AlarmReason(
    val fault: AlarmFault,
) {
    WHITE_TO_MOVE(AlarmFault.PLAY),
    BLACK_TO_MOVE(AlarmFault.PLAY),
    IN_CHECK(AlarmFault.PLAY),
    NO_CASTLING(AlarmFault.PLAY),

    /** Zugfoermig, aber keine Regel benennt es — die Engine weiss nur DASS es nicht geht. */
    NOT_LEGAL(AlarmFault.PLAY),

    /** Gar kein Zug in Sicht: App-Brett und echtes Brett weichen ab, das ist Erkennung. */
    BOARD_MISMATCH(AlarmFault.ENGINE),

    /** Eine Zugquelle hat der Engine Unmoegliches gereicht — nicht der Spieler war es. */
    ENGINE_REFUSED(AlarmFault.ENGINE),
}
