package com.chesslab.desktop

import com.chesslab.geometry.Undistorter
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.warpFromCorners
import com.chesslab.tracker.geometry.boardGeometryFor
import com.chesslab.tracker.geometry.quadOf
import com.chesslab.tracker.geometry.squareOffsetOf
import org.opencv.imgcodecs.Imgcodecs
import java.io.File

/** `rectify <video> <outDir> [frames=<file>] [every=N] [size=N]`. The geometry crosses the language boundary
 *  as an IMAGE: five Python reconstructions of this warp were all wrong. Quad per frame; a frame without a
 *  board is SKIPPED and named — a straightened picture of the wrong thing is worse than a missing one. */
fun rectifyVideo(args: List<String>) {
    val video = File(args.getOrNull(0) ?: error("usage: rectify <video> <outDir> [frames=<f>] [every=N] [size=N] [lens]"))
    val outDir = File(args.getOrNull(1) ?: error("usage: rectify <video> <outDir> [frames=<f>] [every=N] [size=N] [lens]"))
    val rest = args.drop(2)
    val every = rest.intOption("every", DEFAULT_EVERY)
    val size = rest.stringOption("size")?.toIntOrNull()
    val wanted = frameList(rest)
    check(video.isFile) { "no such video: ${video.absolutePath}" }
    require(every >= 1) { "every= must be at least 1, got $every" }

    // `lens`: without it the corners land right while the content between them stays bowed. A fit the grid
    // does not accept aborts loudly.
    val model =
        if ("lens" in rest) {
            openRecording(video).use { fitLensFrom(it) }
                ?: error("no accepted lens fit for ${video.name} — rerun without `lens` for raw boards")
        } else {
            null
        }
    outDir.mkdirs()

    val r =
        openRecording(video).use { source ->
            if (model == null) {
                rectifyEach(source, outDir, every, wanted, size)
            } else {
                val delivered = source.delivered
                Undistorter(model, delivered.width, delivered.height).use { undistorter ->
                    rectifyEach(source, outDir, every, wanted, size, undistorter)
                }
            }
        }
    val index = r.read
    val written = r.written
    val missed = r.missed
    val mean = meanWorstSquareOffset(written.size, r.offsetSum)

    File(outDir, RECEIPT).writeText(rectifyReceipt(video.name, model != null, size, written, missed, mean))
    println(
        "rectified ${written.size} of $index frames, ${missed.size} missed" +
            " · mean worst square offset ${mean?.let { "%.2f".format(it) } ?: "not measured"} px" +
            " -> ${outDir.absolutePath}",
    )
}

/** NICHT 0.0, wenn nichts geschrieben wurde: ein Lauf ohne ein Brett haette sonst perfekte Geometrie gemeldet. */
internal fun meanWorstSquareOffset(
    written: Int,
    offsetSum: Double,
): Double? = if (written == 0) null else offsetSum / written

/** Als reiner Text, damit sie ohne Video zu pruefen ist. */
internal fun rectifyReceipt(
    source: String,
    lens: Boolean,
    size: Int?,
    written: List<Int>,
    missed: List<Int>,
    mean: Double?,
): String =
    """
    {
      "rectified": true,
      "source": "$source",
      "lens": $lens,
      "size": ${size ?: 0},
      "written": ${written.size},
      "missed": ${missed.size},
      "missedFrames": ${missed.take(MISSED_LISTED)},
      "meanWorstSquareOffsetPx": ${mean ?: "null"},
      "note": "playing field only, per-frame grid-refined quad; draw on this, never re-warp"
    }
    """.trimIndent() + System.lineSeparator()

private class Rectified(
    val read: Int,
    val written: List<Int>,
    val missed: List<Int>,
    val offsetSum: Double,
)

private fun rectifyEach(
    source: FrameSource,
    outDir: File,
    every: Int,
    wanted: Set<Int>?,
    size: Int?,
    undistorter: Undistorter? = null,
): Rectified {
    var index = 0
    val written = ArrayList<Int>()
    val missed = ArrayList<Int>()
    var offsetSum = 0.0
    while (true) {
        val raw = source.next() ?: break
        val at = index
        index += 1
        if (if (wanted != null) at in wanted else at % every == 0) {
            val frame = undistorter?.apply(raw) ?: raw
            val quad = quadOf(frame)
            if (quad == null) {
                missed += at
            } else {
                // Ohne `dst` rund 4,6 MB nativ je Bild, die der GC nicht sieht.
                val board = warpFromCorners(frame, boardGeometryFor(quad), cornersFromFlat(quad), size)
                try {
                    Imgcodecs.imwrite(File(outDir, "${at.toString().padStart(STEM_DIGITS, '0')}.png").path, board)
                } finally {
                    board.release()
                }
                offsetSum += squareOffsetOf(frame, quad)
                written += at
            }
        }
    }
    return Rectified(index, written, missed, offsetSum)
}

/** So a consumer can tell a rectified set from a folder of frames. */
const val RECEIPT = "rectify.json"

private const val DEFAULT_EVERY = 3
private const val MISSED_LISTED = 20
