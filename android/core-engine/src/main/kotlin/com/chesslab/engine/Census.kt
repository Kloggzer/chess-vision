package com.chesslab.engine

import com.chesslab.engine.api.GrayImage

/**
 * Popcount of the 8-bit census codes. Python `_POPCOUNT8` (`tracker.py:189`).
 *
 * `IntArray`, not `ByteArray`: it is used as an addend in the per-square sum.
 */
internal val POPCOUNT8: IntArray = IntArray(CENSUS_CODES) { Integer.bitCount(it) }

/**
 * Comparison deadband of [censusTransform]. Python's `eps` parameter (`tracker.py:192`).
 *
 * **It stays 0 and there is no config knob for it** (entry.md invariant 7): any `eps > 0` breaks
 * the monotone-brightness invariance — pixels in the `[eps, eps/ratio)` contrast band flip under
 * multiplicative darkening, and the whole shadow behaviour collapses.
 */
internal const val CENSUS_EPS: Int = 0

/** A caller-owned census-code buffer for [width] x [height], reusing [reuse] when it fits. */
internal fun censusBuffer(
    width: Int,
    height: Int,
    reuse: ByteArray? = null,
): ByteArray {
    val size = width * height
    return if (reuse != null && reuse.size == size) reuse else ByteArray(size)
}

/**
 * 3x3 census transform. Python `census_transform` (`tracker.py:192`).
 *
 * Each pixel gets an 8-bit code "centre brighter than neighbour?", bit `b` set iff
 * `centre > neighbour + eps`, compared as signed ints on unsigned byte values (Python widens to
 * `int16` for exactly that reason). Bit order is the row-major 3x3 scan skipping the centre:
 * `(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)`.
 *
 * Padding is **BORDER_REPLICATE**, never a wrap/roll — a roll compares row 0 against the last row
 * and poisons the edge squares' census scores (`census_transform` comment `:204`).
 *
 * [yLo]/[yHi] transform only that row band, and the replication then happens at the **band** edges
 * — precisely what Python's `census_transform(cur_gray[y_lo:y_hi])` does. Rows outside the band are
 * never read. [out] receives `(yHi - yLo) * width` bytes starting at index 0 and is returned.
 */
internal fun censusTransform(
    gray: GrayImage,
    yLo: Int = 0,
    yHi: Int = gray.height,
    eps: Int = CENSUS_EPS,
    out: ByteArray,
): ByteArray {
    val width = gray.width
    val lo = if (yLo > 0) yLo else 0
    val hi = if (yHi < gray.height) yHi else gray.height
    if (lo >= hi || width <= 0) return out
    val rows = hi - lo
    require(gray.data.size >= width * gray.height) {
        "gray plane too small: ${gray.data.size} < ${width * gray.height}"
    }
    require(out.size >= rows * width) { "census buffer too small: ${out.size} < ${rows * width}" }
    val data = gray.data
    val last = width - 1
    var o = 0
    for (j in 0 until rows) {
        val rowC = (lo + j) * width
        val rowT = (lo + if (j > 0) j - 1 else 0) * width
        val rowB = (lo + if (j < rows - 1) j + 1 else rows - 1) * width
        for (x in 0 until width) {
            val xm = if (x > 0) x - 1 else 0
            val xp = if (x < last) x + 1 else last
            val c = px(data, rowC + x)
            out[o] =
                (
                    bit(c, px(data, rowT + xm), eps, BIT0) or
                        bit(c, px(data, rowT + x), eps, BIT1) or
                        bit(c, px(data, rowT + xp), eps, BIT2) or
                        bit(c, px(data, rowC + xm), eps, BIT3) or
                        bit(c, px(data, rowC + xp), eps, BIT4) or
                        bit(c, px(data, rowB + xm), eps, BIT5) or
                        bit(c, px(data, rowB + x), eps, BIT6) or
                        bit(c, px(data, rowB + xp), eps, BIT7)
                ).toByte()
            o++
        }
    }
    return out
}

/**
 * Mean Hamming distance of the census codes per square, scaled to 0..255.
 * Python `per_square_census_change` (`tracker.py:220`).
 *
 * [refCodes] are the codes of the *full* reference plane (the caller caches them — the reference
 * changes only on commit / re-anchor). Python's `board_size` argument is [curGray]'s edge: the
 * board warp is always square and always the plane this runs on (see `STATUS.md` D01b-2).
 *
 * With [rows] `= intArrayOf(yLo, yHi)` only that band of the current frame is transformed (the
 * caller passes the candidate squares' rows with a +/-1 px halo; with the replicate padding the
 * halo makes the interior codes identical to the full transform). **Squares outside the band read
 * 0.0 and callers must only consult squares whose boxes lie inside the band** — that is the
 * caller's contract.
 *
 * The `* 255/8` scaling makes the channel comparable to the gray diff and to `censusThr`. The
 * result is RAW: `censusThr` (40.0) compares against it, median normalization is the caller's
 * business (`_cens_raw` `:3115`, entry.md invariant 8).
 */
internal fun perSquareCensusChange(
    refCodes: ByteArray,
    curGray: GrayImage,
    boxes: SquareBoxes,
    out: DoubleArray,
    rows: IntArray? = null,
): DoubleArray {
    val width = curGray.width
    require(width == curGray.height) { "board warp must be square: ${width}x${curGray.height}" }
    require(out.size >= Squares.COUNT) { "out too small: ${out.size} < ${Squares.COUNT}" }
    require(refCodes.size >= width * curGray.height) {
        "refCodes too small: ${refCodes.size} < ${width * curGray.height}"
    }
    if (rows == null) {
        return fullCensusChange(refCodes, curGray, boxes, out)
    }
    return bandCensusChange(refCodes, curGray, boxes, out, rows)
}

private fun fullCensusChange(
    refCodes: ByteArray,
    curGray: GrayImage,
    boxes: SquareBoxes,
    out: DoubleArray,
): DoubleArray {
    val width = curGray.width
    val height = curGray.height
    fullCodes = censusBuffer(width, height, fullCodes)
    fullHam = censusBuffer(width, height, fullHam)
    censusTransform(curGray, out = fullCodes)
    hamming(refCodes, fullCodes, fullHam, 0, width * height)
    fullIi = integralBuffer(width, height, fullIi)
    val ii = integral(fullHam, width, height, fullIi)
    regionMeans(ii, width, boxes, out)
    for (i in 0 until Squares.COUNT) {
        out[i] *= CENSUS_SCALE
    }
    return out
}

private fun bandCensusChange(
    refCodes: ByteArray,
    curGray: GrayImage,
    boxes: SquareBoxes,
    out: DoubleArray,
    rows: IntArray,
): DoubleArray {
    val width = curGray.width
    val boardSize = curGray.height
    val yLo = if (rows[0] > 0) rows[0] else 0
    val yHi = if (rows[1] < boardSize) rows[1] else boardSize
    val bandRows = yHi - yLo
    if (bandRows <= 0) {
        out.fill(0.0, 0, Squares.COUNT)
        return out
    }
    bandCodes = censusBuffer(width, bandRows, bandCodes)
    bandHam = censusBuffer(width, bandRows, bandHam)
    censusTransform(curGray, yLo = yLo, yHi = yHi, out = bandCodes)
    // Python: `ref_codes[y_lo:y_hi] ^ census_transform(cur_gray[y_lo:y_hi])` — the reference is
    // the FULL-plane transform sliced, the current one is transformed band-locally.
    hammingOffset(refCodes, yLo * width, bandCodes, bandHam, bandRows * width)
    bandIi = integralBuffer(width, bandRows, bandIi)
    val ii = integral(bandHam, width, bandRows, bandIi)
    val stride = width + 1
    // Transcribed from tracker.py:242 — the +/-1 halo guard. Squares whose box touches a
    // replicated band edge are excluded, because their codes would differ from the full transform.
    val guardLo = yLo + if (yLo > 0) 1 else 0
    val guardHi = yHi - if (yHi < boardSize) 1 else 0
    for (i in 0 until Squares.COUNT) {
        val area = boxes.area[i]
        val y0 = boxes.y0[i]
        val y1 = boxes.y1[i]
        if (area > 0 && y0 >= guardLo && y1 <= guardHi) {
            val r0 = (y0 - yLo) * stride
            val r1 = (y1 - yLo) * stride
            val x0 = boxes.x0[i]
            val x1 = boxes.x1[i]
            val sum = ii[r1 + x1] - ii[r0 + x1] - ii[r1 + x0] + ii[r0 + x0]
            out[i] = sum.toDouble() / area * CENSUS_SCALE
        } else {
            out[i] = 0.0
        }
    }
    return out
}

private fun hamming(
    a: ByteArray,
    b: ByteArray,
    out: ByteArray,
    from: Int,
    to: Int,
) {
    for (i in from until to) {
        out[i] = POPCOUNT8[(a[i].toInt() xor b[i].toInt()) and BYTE_MASK].toByte()
    }
}

private fun hammingOffset(
    a: ByteArray,
    aOffset: Int,
    b: ByteArray,
    out: ByteArray,
    count: Int,
) {
    for (i in 0 until count) {
        out[i] = POPCOUNT8[(a[aOffset + i].toInt() xor b[i].toInt()) and BYTE_MASK].toByte()
    }
}

private fun bit(
    center: Int,
    neighbour: Int,
    eps: Int,
    mask: Int,
): Int = if (center > neighbour + eps) mask else 0

private fun px(
    data: ByteArray,
    index: Int,
): Int = data[index].toInt() and BYTE_MASK

// Scratch buffers. The engine is single-threaded (entry.md hard rule 2) and every one of these is
// fully consumed inside the call that grows it, so they can never alias a live caller buffer.
// The full and the band path keep separate sets: both run every frame at different heights, and a
// shared buffer would reallocate on every alternation.
private var fullCodes: ByteArray = ByteArray(0)
private var fullHam: ByteArray = ByteArray(0)
private var fullIi: LongArray = LongArray(0)
private var bandCodes: ByteArray = ByteArray(0)
private var bandHam: ByteArray = ByteArray(0)
private var bandIi: LongArray = LongArray(0)

private const val CENSUS_CODES = 256
private const val BYTE_MASK = 0xFF
private const val CENSUS_SCALE = 255.0 / 8.0
private const val BIT0 = 1
private const val BIT1 = 2
private const val BIT2 = 4
private const val BIT3 = 8
private const val BIT4 = 16
private const val BIT5 = 32
private const val BIT6 = 64
private const val BIT7 = 128
