package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig

// Mirrors `_gray_frame` in `tests/test_move_tracker.py`: a flat board with bright blobs on the named squares.

internal const val TEST_BASE_LEVEL = 128

internal const val TEST_BLOB_LEVEL = 220

internal fun grayFrame(
    blobs: List<String> = emptyList(),
    boardSize: Int = TEST_BOARD_SIZE,
    base: Int = TEST_BASE_LEVEL,
    whitePov: Boolean = true,
    blobLevel: Int = TEST_BLOB_LEVEL,
): GrayImage {
    val data = ByteArray(boardSize * boardSize) { base.toByte() }
    for (square in blobs) {
        val r = squareRegion(Squares.index(square), boardSize, whitePov)
        for (y in r[1] until r[3]) {
            for (x in r[0] until r[2]) {
                data[y * boardSize + x] = blobLevel.toByte()
            }
        }
    }
    return GrayImage(boardSize, boardSize, data)
}

/** Deterministic pseudo-random texture, so census codes are non-trivial. */
internal fun texturedFrame(
    seed: Long,
    boardSize: Int = TEST_BOARD_SIZE,
    lo: Int = 60,
    hi: Int = 200,
): GrayImage {
    val rng = java.util.Random(seed)
    val span = hi - lo
    return GrayImage(boardSize, boardSize, ByteArray(boardSize * boardSize) { (lo + rng.nextInt(span)).toByte() })
}

internal fun bgrFrame(
    boardSize: Int = TEST_BOARD_SIZE,
    level: Int = TEST_BASE_LEVEL,
): BgrImage = BgrImage(boardSize, boardSize, ByteArray(boardSize * boardSize * 3) { level.toByte() })

internal const val SHADOW_LIGHT = 120

/** Same chroma, ratio 0.6, well inside `[vLo, vHi]`. */
internal const val SHADOW_DARK = 72

/** Ranks 8 and 7 of a 400 px board, so the upper median stays at the light level. */
private const val SHADOW_ROWS = 100

private const val BGR = 3

private const val U8 = 0xFF

internal fun handShadowGray(): GrayImage {
    val image = grayFrame(base = SHADOW_LIGHT)
    for (i in 0 until SHADOW_ROWS * TEST_BOARD_SIZE) image.data[i] = SHADOW_DARK.toByte()
    return image
}

internal fun handShadowBgr(): BgrImage {
    val image = bgrFrame(level = SHADOW_LIGHT)
    for (i in 0 until SHADOW_ROWS * TEST_BOARD_SIZE * BGR) image.data[i] = SHADOW_DARK.toByte()
    return image
}

internal fun smoothTexture(seed: Long): GrayImage {
    val rng = java.util.Random(seed)
    val plane = ByteArray(TEST_BOARD_SIZE * TEST_BOARD_SIZE) { (LO_TEXTURE + rng.nextInt(HI_TEXTURE - LO_TEXTURE)).toByte() }
    return GrayImage(TEST_BOARD_SIZE, TEST_BOARD_SIZE, gauss5(gauss5(plane, horizontal = true), horizontal = false))
}

private fun gauss5(
    plane: ByteArray,
    horizontal: Boolean,
): ByteArray {
    val n = TEST_BOARD_SIZE
    val out = ByteArray(plane.size)
    for (y in 0 until n) {
        for (x in 0 until n) {
            var sum = 0
            for (k in -2..2) {
                val q = reflect101((if (horizontal) x else y) + k, n)
                sum += GAUSS5[k + 2] * (plane[if (horizontal) y * n + q else q * n + x].toInt() and U8)
            }
            out[y * n + x] = ((sum + GAUSS5_SUM / 2) / GAUSS5_SUM).toByte()
        }
    }
    return out
}

private fun reflect101(
    p: Int,
    n: Int,
): Int =
    when {
        p < 0 -> -p
        p >= n -> 2 * n - 2 - p
        else -> p
    }

private const val LO_TEXTURE = 60

private const val HI_TEXTURE = 200

private val GAUSS5 = intArrayOf(1, 4, 6, 4, 1)

private const val GAUSS5_SUM = 16

/** `detectScale = 1.0` switches the scaling off, so `detSize` is exactly [boardSize]. */
internal fun testConfig(
    boardSize: Int = TEST_BOARD_SIZE,
    overhang: Double = 0.0,
    censusZWeight: Double = 1.0,
    maxChanged: Int = 6,
    minGridLineCoverage: Double = 0.0,
): TrackerConfig =
    RIG_CONFIG.copy(
        // The unit tests describe the motion hold; the shipped commit hold is set where a test wants it.
        commitHoldS = null,
        boardSize = boardSize,
        overhang = overhang,
        censusZWeight = censusZWeight,
        maxChanged = maxChanged,
        minGridLineCoverage = minGridLineCoverage,
    )

internal fun testState(config: TrackerConfig = testConfig()): EngineState = EngineState(config, STARTPOS, whitePov = true)

internal fun Map<String, Double>.toZArray(): DoubleArray = DoubleArray(Squares.COUNT) { getValue(Squares.ALL[it]) }

internal fun DoubleArray.asSquareMap(): Map<String, Double> {
    val out = LinkedHashMap<String, Double>(Squares.COUNT)
    for (i in 0 until Squares.COUNT) out[Squares.ALL[i]] = this[i]
    return out
}

internal fun EngineState.armAnomaly(
    vararg squares: String,
    since: Double = 0.0,
) {
    changed = ofSquares(*squares)
    anomalySince = changed
    changed.forEachSquare { anomalyStart[it] = since }
}
