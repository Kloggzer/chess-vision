package com.chesslab.desktop

import com.chesslab.geometry.LensModel
import com.chesslab.geometry.Undistorter
import org.opencv.imgcodecs.Imgcodecs
import java.io.File

/** `undistort <video> <outDir> [every=N]`. Fitted FROM THIS RECORDING; a refused fit writes NOTHING and says so —
 *  raw frames from a verb called `undistort` would never be questioned. Frames are numbered by SOURCE index.
 *  `lens.json` carries k1, k2, focal AND centre: a consumer cannot reconstruct the centre the fit moved. */
fun undistortVideo(args: List<String>) {
    val video = File(args.getOrNull(0) ?: error("usage: undistort <video> <outDir> [every=N]"))
    val outDir = File(args.getOrNull(1) ?: error("usage: undistort <video> <outDir> [every=N]"))
    val every = args.drop(2).intOption("every", DEFAULT_EVERY)
    // `frames=<file>` — exactly the planned frame set: every=3 for 1 700 wanted frames costs gigabytes of PNG.
    val wanted = frameList(args.drop(2))
    check(video.isFile) { "no such video: ${video.absolutePath}" }
    require(every >= 1) { "every= must be at least 1, got $every" }

    // The fit consumes frames from the head of the stream, so the writer opens its own source.
    val model = openRecording(video).use { fitLensFrom(it) }
    if (model == null) {
        println("nothing written: no accepted lens fit for ${video.name}")
        return
    }
    outDir.mkdirs()

    val (index, written) = writeFrames(video, outDir, model, every, wanted)
    // Nothing in a pixel says the barrel was taken out: `chesslab realgames export-session` refuses to decode into
    // a directory carrying this file, so no raw frame silently joins the set.
    File(outDir, MARKER).writeText(
        """
        {
          "undistorted": true,
          "source": "${video.name}",
          "every": ${if (wanted == null) every else 0},
          "fromFrameList": ${wanted != null},
          "frames": $written,
          "k1": ${model.distCoeffs[0]},
          "k2": ${model.distCoeffs[1]},
          "focal": ${model.cameraMatrix[0]},
          "cx": ${model.cameraMatrix[2]},
          "cy": ${model.cameraMatrix[5]},
          "fittedBy": "desktop undistort (board-grid bow, per recording)"
        }
        """.trimIndent() + System.lineSeparator(),
    )
    println("undistorted $written of $index frames (every $every) -> ${outDir.absolutePath}")
}

const val MARKER = "lens.json"

private const val DEFAULT_EVERY = 3
internal const val STEM_DIGITS = 6

private fun writeFrames(
    video: File,
    outDir: File,
    model: LensModel,
    every: Int,
    wanted: Set<Int>?,
): Pair<Int, Int> =
    // `use` on BOTH, nested: an unrolled try/finally leaked the source whenever the Undistorter's constructor threw.
    openRecording(video).use { source ->
        val size = source.delivered
        Undistorter(model, size.width, size.height).use { undistorter ->
            writeEach(source, undistorter, outDir, every, wanted)
        }
    }

private fun writeEach(
    source: FrameSource,
    undistorter: Undistorter,
    outDir: File,
    every: Int,
    wanted: Set<Int>?,
): Pair<Int, Int> {
    var index = 0
    var written = 0
    while (true) {
        val frame = source.next() ?: break
        val at = index
        index += 1
        if (if (wanted != null) at in wanted else at % every == 0) {
            val name = at.toString().padStart(STEM_DIGITS, '0')
            Imgcodecs.imwrite(File(outDir, "$name.png").path, undistorter.apply(frame))
            written += 1
        }
    }
    return index to written
}

internal fun frameList(args: List<String>): Set<Int>? {
    val path = args.stringOption("frames") ?: return null
    val file = File(path)
    check(file.isFile) { "no such frame list: ${file.absolutePath}" }
    val wanted = file.readLines().mapNotNull { it.trim().toIntOrNull() }.toSet()
    require(wanted.isNotEmpty()) { "the frame list ${file.name} holds no indices" }
    return wanted
}
