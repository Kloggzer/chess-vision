package com.chesslab.engine

import com.chesslab.engine.api.GrayImage

/** Int values avoid signed-byte widening when census popcounts are summed. */
internal val POPCOUNT8: IntArray = IntArray(CENSUS_CODES) { Integer.bitCount(it) }

/**
 * Must stay 0 (entry.md invariant 7): any deadband breaks monotone-brightness invariance because
 * pixels in `[eps, eps/ratio)` flip under multiplicative darkening.
 */
internal const val CENSUS_EPS: Int = 0

internal fun censusBuffer(
    width: Int,
    height: Int,
    reuse: ByteArray? = null,
): ByteArray {
    val size = width * height
    return if (reuse != null && reuse.size == size) reuse else ByteArray(size)
}

/**
 * 3x3 census, row-major around the centre, using unsigned bytes and strict `centre > neighbour`.
 * Padding is `BORDER_REPLICATE`; band transforms replicate at [yLo]/[yHi], matching NumPy slicing.
 */
internal fun censusTransform(
    gray: GrayImage,
    yLo: Int = 0,
    yHi: Int = gray.height,
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
    val neighbourRows = IntArray(NEIGHBOUR_ROWS)
    var o = 0
    for (j in 0 until rows) {
        neighbourRows[TOP] = (lo + if (j > 0) j - 1 else 0) * width
        neighbourRows[CENTRE] = (lo + j) * width
        neighbourRows[BOTTOM] = (lo + if (j < rows - 1) j + 1 else rows - 1) * width
        rowCodes(data, width, neighbourRows, 0, width) { _, code -> out[o++] = code.toByte() }
    }
    return out
}

/**
 * Writes only square boxes at plane offsets; values outside are undefined.
 * Inset boxes make their codes bit-identical to [censusTransform] while avoiding ~37% unused work.
 */
internal fun censusCodesInBoxes(
    gray: GrayImage,
    boxes: SquareBoxes,
    out: ByteArray,
): ByteArray {
    require(out.size >= gray.width * gray.height) {
        "census buffer too small: ${out.size} < ${gray.width * gray.height}"
    }
    for (i in 0 until Squares.COUNT) {
        if (boxes.area[i] > 0) boxCodes(gray, boxes, i, null, out)
    }
    return out
}

/**
 * Mean Hamming distance scaled by 255/8; the raw result feeds `censusThr` (entry.md invariant 8).
 * Band edges use a +/-1 px halo; squares outside the safe band score 0.0 and must not be consulted.
 * [codesOut] preserves current codes when the frame becomes the next reference.
 */
internal fun perSquareCensusChange(
    refCodes: ByteArray,
    curGray: GrayImage,
    boxes: SquareBoxes,
    out: DoubleArray,
    rows: IntArray? = null,
    codesOut: ByteArray? = null,
): DoubleArray {
    val width = curGray.width
    val height = curGray.height
    require(width == height) { "board warp must be square: ${width}x$height" }
    require(out.size >= Squares.COUNT) { "out too small: ${out.size} < ${Squares.COUNT}" }
    require(refCodes.size >= width * height) { "refCodes too small: ${refCodes.size} < ${width * height}" }
    var guardLo = 0
    var guardHi = height
    if (rows != null) {
        val yLo = rows[0].coerceIn(0, height)
        val yHi = rows[1].coerceIn(yLo, height)
        // NumPy slicing semantics: an empty band scores nothing.
        if (yHi == yLo) {
            out.fill(0.0, 0, Squares.COUNT)
            return out
        }
        guardLo = yLo + if (yLo > 0) 1 else 0
        guardHi = yHi - if (yHi < height) 1 else 0
    }
    for (i in 0 until Squares.COUNT) {
        val area = boxes.area[i]
        out[i] =
            if (area > 0 && boxes.y0[i] >= guardLo && boxes.y1[i] <= guardHi) {
                boxCodes(curGray, boxes, i, refCodes, codesOut).toDouble() / area * CENSUS_SCALE
            } else {
                0.0
            }
    }
    return out
}

private fun boxCodes(
    gray: GrayImage,
    boxes: SquareBoxes,
    i: Int,
    refCodes: ByteArray?,
    codesOut: ByteArray?,
): Long {
    val width = gray.width
    val data = gray.data
    val x0 = boxes.x0[i]
    val x1 = boxes.x1[i]
    val lastRow = gray.height - 1
    val neighbourRows = IntArray(NEIGHBOUR_ROWS)
    var sum = 0L
    for (y in boxes.y0[i] until boxes.y1[i]) {
        neighbourRows[TOP] = (if (y > 0) y - 1 else 0) * width
        neighbourRows[CENTRE] = y * width
        neighbourRows[BOTTOM] = (if (y < lastRow) y + 1 else lastRow) * width
        rowCodes(data, width, neighbourRows, x0, x1) { index, code ->
            if (refCodes != null) sum += POPCOUNT8[(refCodes[index].toInt() xor code) and BYTE_MASK]
            codesOut?.set(index, code.toByte())
        }
    }
    return sum
}

/**
 * The caller owns edge replication because bands replicate at band edges and boxes at plane edges.
 * Sliding three neighbour columns costs 3 plane reads per pixel rather than 9.
 */
private inline fun rowCodes(
    data: ByteArray,
    width: Int,
    rows: IntArray,
    x0: Int,
    x1: Int,
    emit: (Int, Int) -> Unit,
) {
    val rowT = rows[TOP]
    val rowC = rows[CENTRE]
    val rowB = rows[BOTTOM]
    val last = width - 1
    val xm = if (x0 > 0) x0 - 1 else 0
    var t0 = px(data, rowT + xm)
    var t1 = px(data, rowT + x0)
    var c0 = px(data, rowC + xm)
    var c1 = px(data, rowC + x0)
    var b0 = px(data, rowB + xm)
    var b1 = px(data, rowB + x0)
    for (x in x0 until x1) {
        val xp = if (x < last) x + 1 else last
        val t2 = px(data, rowT + xp)
        val c2 = px(data, rowC + xp)
        val b2 = px(data, rowB + xp)
        var code = 0
        if (c1 > t0 + CENSUS_EPS) code = code or BIT0
        if (c1 > t1 + CENSUS_EPS) code = code or BIT1
        if (c1 > t2 + CENSUS_EPS) code = code or BIT2
        if (c1 > c0 + CENSUS_EPS) code = code or BIT3
        if (c1 > c2 + CENSUS_EPS) code = code or BIT4
        if (c1 > b0 + CENSUS_EPS) code = code or BIT5
        if (c1 > b1 + CENSUS_EPS) code = code or BIT6
        if (c1 > b2 + CENSUS_EPS) code = code or BIT7
        emit(rowC + x, code)
        t0 = t1
        t1 = t2
        c0 = c1
        c1 = c2
        b0 = b1
        b1 = b2
    }
}

private fun px(
    data: ByteArray,
    index: Int,
): Int = data[index].toInt() and BYTE_MASK

private const val NEIGHBOUR_ROWS = 3
private const val TOP = 0
private const val CENTRE = 1
private const val BOTTOM = 2
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
