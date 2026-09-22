package com.chesslab.tracker.games

/** Was mit der PARTIE endet. Der Record ist die Grenze, und alles, was an ihr faellt, haengt hier:
 *  ein Matt beendet die Partie ohne Schirm, also kann kein Schirm die Aufraeumung tragen. */
fun interface GameBoundary {
    fun endGame()
}
