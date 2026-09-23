package com.chesslab.engine.api

/** At ingress: chesslib otherwise accepts illegal moves. */
class IllegalMoveException(
    val uci: String,
    val fen: String,
) : IllegalStateException("illegal move '$uci' in position '$fen'")
