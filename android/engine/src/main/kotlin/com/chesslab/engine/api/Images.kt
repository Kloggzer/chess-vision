package com.chesslab.engine.api

/**
 * Row-major single-channel image; the engine's only pixel type.
 * Consumed by phases 01–03.
 */
class GrayImage(
    val width: Int,
    val height: Int,
    val data: ByteArray,
)

/**
 * Warped color board for HSV/Lab vetoes; packed BGR.
 * Consumed by phases 01–03.
 */
class BgrImage(
    val width: Int,
    val height: Int,
    val data: ByteArray,
)
