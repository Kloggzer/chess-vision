package com.chesslab.engine.api

data class CnnSnapshot(
    val obs: CnnObservation,
    val seq: Long,
    val tsMs: Long,
    val inferMs: Double,
    val warped: BgrImage?,
    val gray: GrayImage?,
    // Observation-start FEN guards against applying results after the game state changes.
    val fen: String?,
    // Model-free hand map: bit i represents `Squares.ALL[i]`; 0L = clean or no sensor.
    val gridOccluded: Long = 0L,
)
