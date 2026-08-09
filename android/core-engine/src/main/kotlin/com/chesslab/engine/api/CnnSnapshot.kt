package com.chesslab.engine.api

// CnnSnapshot.kt — Spec-11 observation/frame pairing. Immutable, handed across threads.
data class CnnSnapshot(
    val obs: CnnObservation,
    // tracker frame seq of the OBSERVED frame
    val seq: Long,
    val tsMs: Long,
    val inferMs: Double,
    // BGR warp of the observed frame at detSize — reference anchor
    val warped: BgrImage?,
    // gray warp at detSize
    val gray: GrayImage?,
    // game FEN at observation start (discard-on-change guard)
    val fen: String?,
    // Model-free hand map of the OBSERVED frame: squares whose grid grooves are locally erased,
    // read from the full-resolution crop warp (geometry `gridOccludedSquares`). Bit i is
    // `Squares.ALL[i]`. 0L = clean, and the default so sources without the sensor stay honest.
    val gridOccluded: Long = 0L,
)
