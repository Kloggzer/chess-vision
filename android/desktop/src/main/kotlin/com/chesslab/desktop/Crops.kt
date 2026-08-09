package com.chesslab.desktop

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.cropSquare
import com.chesslab.geometry.warpBoardForCrops
import com.chesslab.tracker.geometry.boardGeometryFor
import com.chesslab.tracker.geometry.quadOf
import org.opencv.imgcodecs.Imgcodecs
import java.io.File

/**
 * `crops <video> <outDir> [frames=<file>|every=N] [out=WxH]` — the 64 square crops, as the device cuts them.
 *
 * The reason this exists is parity, not convenience. `cropSquare` is an explicit port of
 * `labeling.py:112`, and the plan is to let Kotlin pack the training memmap directly so no crop is
 * ever materialised as a PNG. Before that move, the two implementations have to be shown to agree
 * on the same pixels — a silent divergence here is the `ClipDriver` incident again, where a crop
 * box of 120 px against the served 110 invalidated a whole measurement.
 *
 * The QUAD it used is written into the receipt so the comparison can be run with the same corners
 * on both sides. That isolates the crop construction from the corner detection; mixing the two
 * would leave a disagreement unattributable.
 */
fun cropsOfVideo(args: List<String>) {
    val video = File(args.getOrNull(0) ?: error("usage: crops <video> <outDir> [frames=<f>|every=N] [out=WxH]"))
    val outDir = File(args.getOrNull(1) ?: error("usage: crops <video> <outDir> [frames=<f>|every=N] [out=WxH]"))
    val rest = args.drop(2)
    val every = rest.firstOrNull { it.startsWith("every=") }?.removePrefix("every=")?.toIntOrNull() ?: CROPS_EVERY
    val out = rest.firstOrNull { it.startsWith("out=") }?.removePrefix("out=")?.split("x")
    val wanted = frameList(rest)
    check(video.isFile) { "no such video: ${video.absolutePath}" }
    outDir.mkdirs()

    val quads = StringBuilder()
    val written = VideoFileSource(video).use { cutEach(it, outDir, every, wanted, out, quads) }

    File(outDir, "crops.jsonl").writeText(quads.toString())
    println("cut ${written * ALL_SQUARES.size} crops from $written frames -> ${outDir.absolutePath}")
}

/** The loop alone, so the `use` block above stays one statement (detekt's nesting rule). */
private fun cutEach(
    source: VideoFileSource,
    outDir: File,
    every: Int,
    wanted: Set<Int>?,
    out: List<String>?,
    quads: StringBuilder,
): Int {
    var index = 0
    var written = 0
    while (true) {
        val frame = source.next() ?: break
        val at = index
        index += 1
        val due = if (wanted != null) at in wanted else at % every == 0
        val quad = if (due) quadOf(frame) else null
        if (quad != null) {
            val base = boardGeometryFor(quad)
            val geom = if (out == null) base else base.copy(outW = out[0].toInt(), outH = out[1].toInt())
            val warped = warpBoardForCrops(frame, geom, cornersFromFlat(quad))
            val stem = at.toString().padStart(STEM_DIGITS, '0')
            for (square in ALL_SQUARES) {
                Imgcodecs.imwrite(File(outDir, "${stem}_$square.png").path, cropSquare(warped, square, geom))
            }
            quads.append("{\"frame\": $at, \"quad\": ${quad.joinToString(",", "[", "]")}, ")
            quads.append("\"boardSize\": ${geom.boardSize}, \"padSide\": ${geom.padSide}, ")
            quads.append("\"padUp\": ${geom.padUp}, \"outW\": ${geom.outW}, \"outH\": ${geom.outH}}")
            quads.append(System.lineSeparator())
            written += 1
        }
    }
    return written
}

private const val CROPS_EVERY = 400
