package com.chesslab.engine.api

// Android and OpenCV types must not cross this seam.
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
