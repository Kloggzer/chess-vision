package com.chesslab.tracker.camera

import com.chesslab.engine.api.BgrImage

/**
 * Die Messung, die [nextExposure] braucht — aus dem rektifizierten Brett, nicht aus dem Rahmen.
 *
 * Das ist der ganze Unterschied zur Geraete-Automatik: sie mittelt, was die Kamera sieht,
 * einschliesslich Tisch, Haenden und Zimmer. Hier zaehlen die 64 Felder und sonst nichts.
 */
fun meterBoard(board: BgrImage): ExposureReading {
    val cell = board.width / SIDE
    require(cell > 0) { "Brett zu klein: ${board.width}x${board.height}" }
    val means = FloatArray(ExposureReading.CELLS)
    val hist = IntArray(LEVELS)
    var pixels = 0L
    for (row in 0 until SIDE) {
        for (col in 0 until SIDE) {
            var sum = 0L
            for (y in row * cell until (row + 1) * cell) {
                var i = (y * board.width + col * cell) * 3
                repeat(cell) {
                    val b = board.data[i].toInt() and BYTE
                    val g = board.data[i + 1].toInt() and BYTE
                    val r = board.data[i + 2].toInt() and BYTE
                    sum += (B_WEIGHT * b + G_WEIGHT * g + R_WEIGHT * r).toInt()
                    // Saettigung faellt je KANAL an, nicht auf der Luminanz: ein Rot bei 255 ist
                    // ausgebrannt, waehrend die Luminanz noch bei 200 steht und Luft vortaeuscht.
                    hist[maxOf(b, g, r)]++
                    i += 3
                }
            }
            means[row * SIDE + col] = sum.toFloat() / (cell * cell)
            pixels += cell.toLong() * cell
        }
    }
    return ExposureReading(means, percentile(hist, pixels, 1f - CLIP_TAIL), clipped(hist, pixels))
}

/** Der Pegel, unter dem [share] der Pixel liegen — der Ankerwert fuer die Lichtdecke. */
private fun percentile(
    hist: IntArray,
    pixels: Long,
    share: Float,
): Float {
    var seen = 0L
    val want = (pixels * share).toLong()
    for (level in hist.indices) {
        seen += hist[level]
        if (seen >= want) return level.toFloat()
    }
    return (LEVELS - 1).toFloat()
}

private fun clipped(
    hist: IntArray,
    pixels: Long,
): Float {
    var n = 0L
    for (level in ExposureReading.CLIP_LEVEL.toInt() until LEVELS) n += hist[level]
    return n.toFloat() / pixels
}

private const val SIDE = 8
private const val LEVELS = 256
private const val BYTE = 0xFF

/** Das Perzentil, an dem die Lichtdecke haengt — dieselbe Groesse wie [ExposurePolicy.clipCap]. */
private const val CLIP_TAIL = 0.02f

// ITU-R BT.601, dieselben Gewichte wie `Preprocess.LUMA` und `cv2.COLOR_BGR2GRAY`.
private const val B_WEIGHT = 0.114
private const val G_WEIGHT = 0.587
private const val R_WEIGHT = 0.299
