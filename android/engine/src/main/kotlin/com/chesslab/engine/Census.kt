package com.chesslab.engine

import com.chesslab.engine.api.GrayImage

/** 3x3 census transform + per-square structural change (ports tracker.py:141,161). */
object Census {
    private const val CENSUS_SCALE = 255.0 / 8.0

    /**
     * 3x3 census transform: each pixel gets an 8-bit code "center brighter than neighbor?".
     * Border pixels compare against replicated edges (like cv2.BORDER_REPLICATE), never the
     * opposite image side. Bit order matches the Python loop (dy, dx) row-major, center skipped.
     */
    fun transform(gray: GrayImage): ByteArray {
        val out = ByteArray(gray.width * gray.height)
        for (y in 0 until gray.height) {
            for (x in 0 until gray.width) out[y * gray.width + x] = codeAt(gray, x, y)
        }
        return out
    }

    private fun codeAt(
        gray: GrayImage,
        x: Int,
        y: Int,
    ): Byte {
        val c = gray.data[y * gray.width + x].px()
        var code = 0
        var bit = 0
        for (dy in -1..1) {
            for (dx in -1..1) {
                if (dx == 0 && dy == 0) continue
                val ny = (y + dy).coerceIn(0, gray.height - 1)
                val nx = (x + dx).coerceIn(0, gray.width - 1)
                if (c > gray.data[ny * gray.width + nx].px()) code = code or (1 shl bit)
                bit++
            }
        }
        return code.toByte()
    }

    /**
     * Structural change per square: mean Hamming distance of census codes (0..8), scaled to
     * 0..255. Small for pure brightness/shadow changes, large for appearing/disappearing pieces.
     * `refCodes` (precomputed [transform] of the reference) skips re-encoding the reference.
     * Ports the full-image path of tracker.py:161 (the row-band fast path is an optimization
     * with identical results for consulted squares and is intentionally not ported).
     */
    fun perSquareChange(
        refGray: GrayImage,
        curGray: GrayImage,
        geom: BoardGeometry,
        refCodes: ByteArray? = null,
    ): Map<String, Double> {
        val ref = refCodes ?: transform(refGray)
        val cur = transform(curGray)
        val ham = IntArray(ref.size) { Integer.bitCount((ref[it].px()) xor (cur[it].px())) }
        val ii = SquareDiff.integral(ham, curGray.width, curGray.height)
        val means = SquareDiff.regionMeans(ii, curGray.width, Squares.boxes(geom))
        return Squares.all.zip(means.map { it * CENSUS_SCALE }).toMap()
    }
}
