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
)
