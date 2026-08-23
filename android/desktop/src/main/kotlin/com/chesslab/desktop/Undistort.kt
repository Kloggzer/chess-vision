package com.chesslab.desktop

import com.chesslab.geometry.LensModel
import com.chesslab.geometry.Undistorter
import org.opencv.imgcodecs.Imgcodecs
import java.io.File

/**
 * `undistort <video> <outDir> [every=N]` — write a recording's frames with the barrel taken out.
 *
 * The optics are fitted FROM THIS RECORDING, by the same path `replay lens=true` uses: the board's
 * own grooves are straight in the world, so their bow is the objective, and a fit that does not
 * flatten it by a real margin is refused rather than saved. That is why this lives here and not in
 * Python — `data/lens/calib.npz` is a stale artefact (fitted at 2560x1440 with RMS 5.46 px, while
 * this camera delivers 1920x1080), and a model fitted at the wrong resolution injects error.
 *
 * A refused fit writes NOTHING and says so. Silently emitting raw frames from a verb called
 * `undistort` would put undistorted-looking frames in a session nobody would question again.
 *
 * The frames land as `NNNNNN.png` under [outDir], numbered by SOURCE index, so a consumer that
 * planned a frame set against the video can find exactly the frames it planned.
 *
 * `lens.json` carries the WHOLE model — k1, k2, focal and centre. A consumer that folds the optics
 * into its own map (Python's board warp) cannot reconstruct the last three: the centre moves when
 * the fit has evidence for it, and then a guessed one puts the correction somewhere else.
 */
fun undistortVideo(args: List<String>) {
    val video = File(args.getOrNull(0) ?: error("usage: undistort <video> <outDir> [every=N]"))
    val outDir = File(args.getOrNull(1) ?: error("usage: undistort <video> <outDir> [every=N]"))
    val every =
        args
            .drop(2)
            .firstOrNull { it.startsWith("every=") }
            ?.removePrefix("every=")
            ?.toIntOrNull()
            ?: DEFAULT_EVERY
    // `frames=<file>` — one source index per line, which is how a consumer that already PLANNED a
    // frame set asks for exactly it. Undistorting a whole video at every=3 to serve a session that
    // wants 1 700 of its frames costs gigabytes of PNG for nothing.
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
    // The receipt. Downstream, a frames directory is just PNGs — nothing in a pixel says whether
    // the barrel was taken out, so a consumer that adds one raw frame to this set would create a
    // silently mixed session. `chesslab realgames export-session` refuses to decode into a
    // directory carrying this file, and points back at this verb instead.
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

/** Written beside the frames so a later step can tell an undistorted set from a raw one. */
const val MARKER = "lens.json"

private const val DEFAULT_EVERY = 3
internal const val STEM_DIGITS = 6

/** Every [every]th frame, undistorted, as `NNNNNN.png`. Returns frames read and frames written. */
private fun writeFrames(
    video: File,
    outDir: File,
    model: LensModel,
    every: Int,
    wanted: Set<Int>?,
): Pair<Int, Int> =
    // `use` on BOTH, nested: an earlier revision of this function unrolled them into try/finally to
    // flatten the nesting detekt complains about, and thereby leaked the video source whenever the
    // Undistorter's constructor threw. The loop is what moves out, not the closing.
    openRecording(video).use { source ->
        val size = source.delivered
        Undistorter(model, size.width, size.height).use { undistorter ->
            writeEach(source, undistorter, outDir, every, wanted)
        }
    }

/** The loop alone, so both `use` blocks above stay one statement each. */
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

/** `frames=<file>`: the source indices to write, one per line. Null when the option is absent. */
internal fun frameList(args: List<String>): Set<Int>? {
    val path = args.firstOrNull { it.startsWith("frames=") }?.removePrefix("frames=") ?: return null
    val file = File(path)
    check(file.isFile) { "no such frame list: ${file.absolutePath}" }
    val wanted = file.readLines().mapNotNull { it.trim().toIntOrNull() }.toSet()
    require(wanted.isNotEmpty()) { "the frame list ${file.name} holds no indices" }
    return wanted
}
