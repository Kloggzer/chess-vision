package com.chesslab.engine.api

// Images.kt — no Android, no OpenCV types cross the seam.
class GrayImage(
    val width: Int,
    val height: Int,
    val data: ByteArray,
) // 8-bit, row-major, stride == width

class BgrImage(
    val width: Int,
    val height: Int,
    val data: ByteArray,
) // interleaved BGR, stride == width * 3
