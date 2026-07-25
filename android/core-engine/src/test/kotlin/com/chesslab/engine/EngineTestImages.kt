package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig

// Shared synthetic-image helpers for the phase-03a tests. Mirrors `_gray_frame` in
// `tests/test_move_tracker.py:765`: a flat board with bright blobs on the named squares.

internal const val TEST_BOARD_SIZE = 400

internal const val TEST_BASE_LEVEL = 128

internal const val TEST_BLOB_LEVEL = 220

/** Python `_gray_frame(blob_squares, board_size, white_pov, base)`. */
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

/** A textured gray board — a deterministic pseudo-random field, so census codes are non-trivial. */
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

/** A flat BGR plane of the same geometry (the shadow veto needs a colour reference). */
internal fun bgrFrame(
    boardSize: Int = TEST_BOARD_SIZE,
    level: Int = TEST_BASE_LEVEL,
): BgrImage = BgrImage(boardSize, boardSize, ByteArray(boardSize * boardSize * 3) { level.toByte() })

/** A config whose `detSize` is exactly [boardSize] (`detectScale = 1.0` switches the scaling off). */
internal fun testConfig(
    boardSize: Int = TEST_BOARD_SIZE,
    overhang: Double = 0.0,
    censusZWeight: Double = 1.0,
    maxChanged: Int = 6,
    minGridLineCoverage: Double = 0.0,
): TrackerConfig =
    TrackerConfig(
        boardSize = boardSize,
        detectScale = 1.0,
        overhang = overhang,
        censusZWeight = censusZWeight,
        maxChanged = maxChanged,
        minGridLineCoverage = minGridLineCoverage,
    )

/** A fresh state on the start position with the CNN off, exactly like the fixture replays. */
internal fun testState(config: TrackerConfig = testConfig()): EngineState = EngineState(config, STARTPOS, whitePov = true)

/** `Squares.ALL`-indexed array of a square-keyed Python channel. */
internal fun Map<String, Double>.toZArray(): DoubleArray = DoubleArray(Squares.COUNT) { getValue(Squares.ALL[it]) }

/** `Squares.ALL`-keyed view of a 64-value channel, for tests that compare against Python maps. */
internal fun DoubleArray.asSquareMap(): Map<String, Double> {
    val out = LinkedHashMap<String, Double>(Squares.COUNT)
    for (i in 0 until Squares.COUNT) out[Squares.ALL[i]] = this[i]
    return out
}

/** Latch [squares] as persistently changed since [since] — the state `maybePatchAnomaly` reads. */
internal fun EngineState.armAnomaly(
    vararg squares: String,
    since: Double = 0.0,
) {
    changed = ofSquares(*squares)
    anomalySince = changed
    changed.forEachSquare { anomalyStart[it] = since }
}
