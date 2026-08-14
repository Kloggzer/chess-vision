package com.chesslab.desktop

import com.chesslab.geometry.Undistorter
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.warpFromCorners
import com.chesslab.tracker.geometry.boardGeometryFor
import com.chesslab.tracker.geometry.quadOf
import com.chesslab.tracker.geometry.squareOffsetOf
import org.opencv.imgcodecs.Imgcodecs
import java.io.File

/**
 * `rectify <video> <outDir> [frames=<file>] [every=N] [size=N]` — the board, straightened, per frame.
 *
 * The geometry crosses the language boundary as an IMAGE, not as a formula. On 2026-08-09 five
 * separate Python reconstructions of this warp were written and all five were wrong — `margin` left
 * at 0 twice, a stored median quad used where the recording needs a per-frame one, the model's
 * normalisation omitted, and a distribution described by its maximum. The Kotlin path got the same
 * recordings right every time, because it is the path the device runs. So it emits the rectified
 * playing field and the caller draws on top of it; nobody downstream computes a homography again.
 *
 * The quad is detected and grid-refined PER FRAME (`quadOf`), which is the part a stored median
 * cannot do: a phone that settles, a board that turns, a marker that a hand covers.
 *
 * A frame whose board cannot be found is SKIPPED and named in the receipt. It is not written black
 * and it is not written from a neighbour's quad — a straightened picture of the wrong thing is
 * worse than a missing one, because only the missing one is visible.
 */
fun rectifyVideo(args: List<String>) {
    val video = File(args.getOrNull(0) ?: error("usage: rectify <video> <outDir> [frames=<f>] [every=N] [size=N] [lens]"))
    val outDir = File(args.getOrNull(1) ?: error("usage: rectify <video> <outDir> [frames=<f>] [every=N] [size=N] [lens]"))
    val rest = args.drop(2)
    val every = rest.firstOrNull { it.startsWith("every=") }?.removePrefix("every=")?.toIntOrNull() ?: DEFAULT_EVERY
    val size = rest.firstOrNull { it.startsWith("size=") }?.removePrefix("size=")?.toIntOrNull()
    val wanted = frameList(rest)
    check(video.isFile) { "no such video: ${video.absolutePath}" }
    require(every >= 1) { "every= must be at least 1, got $every" }

    // `lens` — take the barrel out BEFORE the quad and the warp, exactly like the replay's
    // option. Without it the corners land right (ArUco + grid refinement) while the content
    // between them stays bowed, which is plainly visible on a straightened full board
    // ("da ist ein barrel effekt drauf", 2026-08-10). Same contract as `undistort`: a fit the
    // grid does not accept aborts loudly rather than silently delivering raw boards.
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
    val mean = if (written.isEmpty()) 0.0 else r.offsetSum / written.size

    File(outDir, RECEIPT).writeText(
        """
        {
          "rectified": true,
          "source": "${video.name}",
          "lens": ${model != null},
          "size": ${size ?: 0},
          "written": ${written.size},
          "missed": ${missed.size},
          "missedFrames": ${missed.take(MISSED_LISTED)},
          "meanWorstSquareOffsetPx": $mean,
          "note": "playing field only, per-frame grid-refined quad; draw on this, never re-warp"
        }
        """.trimIndent() + System.lineSeparator(),
    )
    println(
        "rectified ${written.size} of $index frames, $missed missed" +
            " · mean worst square offset ${"%.2f".format(mean)} px -> ${outDir.absolutePath}",
    )
}

private class Rectified(
    val read: Int,
    val written: List<Int>,
    val missed: List<Int>,
    val offsetSum: Double,
)

/** The loop alone, so the `use` block above stays one statement (detekt's nesting rule). */
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
                val board = warpFromCorners(frame, boardGeometryFor(quad), cornersFromFlat(quad), size)
                Imgcodecs.imwrite(File(outDir, "${at.toString().padStart(STEM_DIGITS, '0')}.png").path, board)
                offsetSum += squareOffsetOf(frame, quad)
                written += at
            }
        }
    }
    return Rectified(index, written, missed, offsetSum)
}

/** Written beside the boards so a consumer can tell a rectified set from a folder of frames. */
const val RECEIPT = "rectify.json"

private const val DEFAULT_EVERY = 3
private const val MISSED_LISTED = 20
