package com.chesslab.engine.api

/** Thrown at ingress because chesslib otherwise accepts illegal moves (2026-08-09 crash). */
class IllegalMoveException(
    val uci: String,
    val fen: String,
) : IllegalStateException("illegal move '$uci' in position '$fen'")
