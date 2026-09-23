package com.chesslab.tracker.speech

import com.chesslab.engine.api.AlarmFault
import com.chesslab.engine.api.AlarmReason

/** Das erste Wort sagt schon, wer gemeint ist — Spieler oder App. Die Ansage muss zwischen zwei Zuege passen. */
object AlarmPhrase {
    private val ENGLISH =
        mapOf(
            AlarmFault.PLAY to "Illegal",
            AlarmFault.ENGINE to "App error",
        )

    private val GERMAN =
        mapOf(
            AlarmFault.PLAY to "Ungültig",
            AlarmFault.ENGINE to "App-Fehler",
        )

    private val DETAIL_EN =
        mapOf(
            AlarmReason.WHITE_TO_MOVE to "White to move",
            AlarmReason.BLACK_TO_MOVE to "Black to move",
            AlarmReason.IN_CHECK to "king is in check",
            AlarmReason.NO_CASTLING to "castling not available",
            AlarmReason.NOT_LEGAL to "move not possible",
            AlarmReason.BOARD_MISMATCH to "check the pieces",
            AlarmReason.ENGINE_REFUSED to "move refused",
        )

    private val DETAIL_DE =
        mapOf(
            AlarmReason.WHITE_TO_MOVE to "Weiß ist am Zug",
            AlarmReason.BLACK_TO_MOVE to "Schwarz ist am Zug",
            AlarmReason.IN_CHECK to "König steht im Schach",
            AlarmReason.NO_CASTLING to "Rochade nicht möglich",
            AlarmReason.NOT_LEGAL to "Zug nicht möglich",
            AlarmReason.BOARD_MISMATCH to "Figuren prüfen",
            AlarmReason.ENGINE_REFUSED to "Zug abgelehnt",
        )

    fun of(
        reason: AlarmReason,
        language: String,
    ): String {
        val de = german(language)
        val head = (if (de) GERMAN else ENGLISH).getValue(reason.fault)
        return "$head, ${(if (de) DETAIL_DE else DETAIL_EN).getValue(reason)}"
    }

    fun restored(language: String): String = if (german(language)) "Stellung wieder da" else "Position restored"

    private fun german(language: String) = language.substringBefore('-').lowercase() == "de"
}
