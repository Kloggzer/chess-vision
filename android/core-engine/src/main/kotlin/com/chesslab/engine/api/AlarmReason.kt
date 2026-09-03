package com.chesslab.engine.api

enum class AlarmFault { PLAY, ENGINE }

/** Codes verhindern, dass die Ansage englische Prosa aus `guessSan` vorliest (User, 2026-08-28). */
enum class AlarmReason(
    val fault: AlarmFault,
) {
    WHITE_TO_MOVE(AlarmFault.PLAY),
    BLACK_TO_MOVE(AlarmFault.PLAY),
    IN_CHECK(AlarmFault.PLAY),
    NO_CASTLING(AlarmFault.PLAY),

    NOT_LEGAL(AlarmFault.PLAY),

    BOARD_MISMATCH(AlarmFault.ENGINE),

    ENGINE_REFUSED(AlarmFault.ENGINE),
}
