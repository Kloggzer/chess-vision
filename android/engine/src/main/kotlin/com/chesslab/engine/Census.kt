package com.chesslab.engine

import com.chesslab.engine.api.GrayImage

/** 3x3 census transform + per-square structural change (ports tracker.py:141,161). */
object Census {
    private const val CENSUS_SCALE = 255.0 / 8.0

    // Neighbor bits in (dy, dx) row-major order, center skipped — matches [codeAt].
    private const val BIT_TL = 0x01
    private const val BIT_T = 0x02
    private const val BIT_TR = 0x04
    private const val BIT_L = 0x08
    private const val BIT_R = 0x10
    private const val BIT_BL = 0x20
    private const val BIT_B = 0x40
    private const val BIT_BR = 0x80

    /**
     * 3x3 census transform: each pixel gets an 8-bit code "center brighter than neighbor?".
     * Border pixels compare against replicated edges (like cv2.BORDER_REPLICATE), never the
     * opposite image side. Bit order matches the Python loop (dy, dx) row-major, center skipped.
     *
     * Hot path (2026-07-22 device profiling): the interior runs as flat index arithmetic
     * without bounds clamps or per-neighbor calls; only the 1px border uses the clamped
     * [codeAt]. Identical output to the naive per-pixel loop (bit order unchanged).
     */
    fun transform(gray: GrayImage): ByteArray {
        val w = gray.width
        val h = gray.height
        val d = gray.data
        val out = ByteArray(w * h)
        // Interior: neighbors are the 8 fixed offsets around i = y*w + x, no clamping needed.
        for (y in 1 until h - 1) {
            var i = y * w + 1
            val end = y * w + (w - 1)
            while (i < end) {
                val c = d[i].toInt() and BYTE_MASK
                var code = 0
                if (c > (d[i - w - 1].toInt() and BYTE_MASK)) code = code or BIT_TL
                if (c > (d[i - w].toInt() and BYTE_MASK)) code = code or BIT_T
                if (c > (d[i - w + 1].toInt() and BYTE_MASK)) code = code or BIT_TR
                if (c > (d[i - 1].toInt() and BYTE_MASK)) code = code or BIT_L
                if (c > (d[i + 1].toInt() and BYTE_MASK)) code = code or BIT_R
                if (c > (d[i + w - 1].toInt() and BYTE_MASK)) code = code or BIT_BL
                if (c > (d[i + w].toInt() and BYTE_MASK)) code = code or BIT_B
                if (c > (d[i + w + 1].toInt() and BYTE_MASK)) code = code or BIT_BR
                out[i] = code.toByte()
                i++
            }
        }
        // Border: top/bottom rows and left/right columns with replicated-edge clamping.
        for (x in 0 until w) {
            out[x] = codeAt(gray, x, 0)
            if (h > 1) out[(h - 1) * w + x] = codeAt(gray, x, h - 1)
        }
        for (y in 1 until h - 1) {
            out[y * w] = codeAt(gray, 0, y)
            if (w > 1) out[y * w + (w - 1)] = codeAt(gray, w - 1, y)
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
     * `refCodes` (precomputed [transform] of the reference) skips re-encoding the reference;
     * `curCodes` does the same for the current frame (callers that keep the codes around).
     * Ports the full-image path of tracker.py:161 (the row-band fast path is an optimization
     * with identical results for consulted squares and is intentionally not ported).
     */
    fun perSquareChange(
        refGray: GrayImage,
        curGray: GrayImage,
        geom: BoardGeometry,
        refCodes: ByteArray? = null,
        curCodes: ByteArray? = null,
    ): Map<String, Double> {
        val ref = refCodes ?: transform(refGray)
        val cur = curCodes ?: transform(curGray)
        val ham = IntArray(ref.size)
        for (i in ham.indices) {
            ham[i] = Integer.bitCount((ref[i].toInt() xor cur[i].toInt()) and BYTE_MASK)
        }
        // Direct per-box sums: the 64 boxes cover the image about once, so this is the same
        // work as building the full integral image minus its 2 MB/frame allocation.
        val w = curGray.width
        val means =
            Squares.boxes(geom).map { b ->
                if (b.area <= 0) {
                    0.0
                } else {
                    var s = 0
                    for (y in b.y0 until b.y1) {
                        val row = y * w
                        for (x in b.x0 until b.x1) s += ham[row + x]
                    }
                    s.toDouble() / b.area
                }
            }
        return Squares.all.zip(means.map { it * CENSUS_SCALE }).toMap()
    }
}
