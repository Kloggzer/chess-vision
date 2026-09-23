package com.chesslab.tracker.games

/** Ein Matt beendet die Partie ohne Schirm, also kann kein Schirm die Aufraeumung tragen. */
fun interface GameBoundary {
    fun endGame()
}
