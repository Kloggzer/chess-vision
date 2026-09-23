package com.chesslab.engine.api

data class CnnSnapshot(
    val obs: CnnObservation,
    val seq: Long,
    val tsMs: Long,
    val inferMs: Double,
    val warped: BgrImage?,
    val gray: GrayImage?,
    // Observation-start FEN: a result must not apply after the game state changed.
    val fen: String?,
    // Bit i is `Squares.ALL[i]`; 0L = clean or no sensor.
    val gridOccluded: Long = 0L,
)
