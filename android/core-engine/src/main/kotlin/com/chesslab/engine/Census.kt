package com.chesslab.engine

import com.chesslab.engine.api.GrayImage

/**
 * Popcount of the 8-bit census codes. Python `_POPCOUNT8`.
 *
 * `IntArray`, not `ByteArray`: it is used as an addend in the per-square sum.
 */
internal val POPCOUNT8: IntArray = IntArray(CENSUS_CODES) { Integer.bitCount(it) }

/**
 * Comparison deadband of the census comparison. Python's `eps` parameter.
 *
 * **It stays 0, there is no config knob for it and it is not even a function parameter here**
 * (entry.md invariant 7): any `eps > 0` breaks
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
 * 3x3 census transform. Python `census_transform`.
 *
 * Each pixel gets an 8-bit code "centre brighter than neighbour?", bit `b` set iff
 * `centre > neighbour + eps`, compared as signed ints on unsigned byte values (Python widens to
 * `int16` for exactly that reason). Bit order is the row-major 3x3 scan skipping the centre:
 * `(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)`.
 *
 * Padding is **BORDER_REPLICATE**, never a wrap/roll — a roll compares row 0 against the last row
 * and poisons the edge squares' census scores (see `census_transform`'s own comment).
 *
 * [yLo]/[yHi] transform only that row band, and the replication then happens at the **band** edges
 * — precisely what Python's `census_transform(cur_gray[y_lo:y_hi])` does. Rows outside the band are
 * never read. [out] receives `(yHi - yLo) * width` bytes starting at index 0 and is returned.
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
 * Census codes of [gray] inside the [boxes] only, written into [out] at their plane offsets.
 *
 * **The only region a reference-code plane is ever read from is a square box** — every consumer
 * goes through [perSquareCensusChange], which sums per box. Transforming the ~37 % of the 800x800
 * plane that lies between the boxes was pure waste, and the reference is re-derived on every quiet
 * frame. Values outside the boxes are left untouched, i.e. undefined.
 *
 * Inside a box the codes are bit-identical to [censusTransform]'s: the boxes are inset from the
 * left and right plane edges, so only the top-row replication can apply and it is the same here.
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
 * Mean Hamming distance of the census codes per square, scaled to 0..255.
 * Python `per_square_census_change`.
 *
 * [refCodes] are the reference plane's codes (the caller caches them — the reference changes only
 * on commit / re-anchor). Python's `board_size` argument is [curGray]'s edge: the board warp is
 * always square and always the plane this runs on (see `STATUS.md` D01b-2).
 *
 * With [rows] `= intArrayOf(yLo, yHi)` only squares whose box lies inside that band are scored;
 * the caller passes the candidate squares' rows with a +/-1 px halo. **Squares outside the band
 * read 0.0 and callers must only consult squares inside it** — that is the caller's contract. The
 * halo guard is Python's: a square touching a replicated band edge would carry codes that differ
 * from the full transform, so it is excluded rather than approximated.
 *
 * [codesOut] optionally receives the current frame's codes at their plane offsets, so a caller
 * whose `cur` becomes the next reference does not transform the same plane a second time.
 *
 * The `* 255/8` scaling makes the channel comparable to the gray diff and to `censusThr`. The
 * result is RAW: `censusThr` (40.0) compares against it, median normalization is the caller's
 * business (`_cens_raw`, entry.md invariant 8).
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
        // Python slices `cur_gray[y_lo:y_hi]`; an empty slice scores nothing at all.
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

/**
 * Codes of square [i]'s box: accumulates the Hamming distance against [refCodes] when given one
 * and writes the codes to [codesOut] when given one. Returns the Hamming sum (0 without
 * [refCodes]).
 */
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
 * Census codes of one row segment, handed to [emit] as `(planeIndex, code)`.
 *
 * [rows] holds the plane offsets of the top, centre and bottom neighbour rows — the CALLER owns
 * the replication rule, because a band transform replicates at the band edge and a box transform
 * at the plane edge, and conflating those poisons the edge squares' scores.
 *
 * The three neighbour columns slide along in registers, so a pixel costs 3 plane reads instead of
 * 9. This is the engine's single hottest loop.
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
        val code =
            brighter(c1, t0) or (brighter(c1, t1) shl 1) or (brighter(c1, t2) shl 2) or
                (brighter(c1, c0) shl 3) or (brighter(c1, c2) shl 4) or
                (brighter(c1, b0) shl 5) or (brighter(c1, b1) shl 6) or (brighter(c1, b2) shl 7)
        emit(rowC + x, code)
        t0 = t1
        t1 = t2
        c0 = c1
        c1 = c2
        b0 = b1
        b1 = b2
    }
}

/**
 * `1` when [centre] beats [neighbour] by more than [CENSUS_EPS], else `0` — the sign bit of the
 * difference, not a branch.
 *
 * Image data makes all eight comparisons per pixel unpredictable, so the branch form paid a
 * mispredict where the arithmetic pays a subtract. Both operands are `0..255`, so nothing
 * overflows, and `eps` stays in the expression: at 0 the compiler folds it away.
 */
private fun brighter(
    centre: Int,
    neighbour: Int,
): Int = (neighbour + CENSUS_EPS - centre) ushr SIGN_SHIFT

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

/** Sign bit of a 32-bit int — see [brighter]. */
private const val SIGN_SHIFT = 31
