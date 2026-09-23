package com.chesslab.desktop

import com.chesslab.engine.api.TrackerStatus
import com.chesslab.geometry.computeHomography
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.margins4
import com.chesslab.tracker.geometry.DEFAULT_MARKER_MARGIN
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfInt
import org.opencv.core.Size
import org.opencv.imgcodecs.Imgcodecs
import org.opencv.imgproc.Imgproc
import java.awt.image.BufferedImage
import java.awt.image.DataBufferByte
import java.io.File

/** The rectified board of the DECISIVE frames, at every trigger and [context] on each side. The ring stores
 *  DEFENSIVE COPIES — the source reuses its Mat, and storing references pairs indices with stale pictures.
 *  Warped from the DECODED picture, not the lens-corrected one: at ~2 px review alignment that is invisible. */
internal class AnnotatedFrames(
    private val dir: File,
    quad: FloatArray,
    private val boardSize: Int,
    private val context: Int = REVIEW_CONTEXT,
    private val annotate: Boolean = true,
    /** The quad for a frame index — the engine's live one, or a ply's; null falls back to [quad]. */
    private val quadFor: (Int) -> FloatArray? = { null },
) {
    private val fallback = quad
    private var current = quad
    private var homography = computeHomography(cornersFromFlat(quad), boardSize, margins4(DEFAULT_MARKER_MARGIN))
    private val ring = ArrayDeque<Buffered>()
    private val wanted = mutableSetOf<Int>()
    private val written = mutableSetOf<Int>()

    val failed = mutableListOf<Int>()

    /** Boards of an earlier run that could not be removed; they would pass for this run's. */
    val stale: List<File> = reset(dir)

    val count: Int get() = written.size - failed.size

    fun onFrame(
        index: Int,
        frame: Mat,
        status: TrackerStatus?,
        decisive: Boolean,
    ) {
        ring.addLast(Buffered(index, frame.clone(), status))
        while (ring.size > context + 1) ring.removeFirst().raw.release()
        if (index in wanted) {
            wanted.remove(index)
            write(ring.last())
        }
        if (!decisive) return
        for (buffered in ring) write(buffered)
        for (k in 1..context) wanted += index + k
    }

    fun close() {
        while (ring.isNotEmpty()) ring.removeFirst().raw.release()
        homography.release()
    }

    private fun write(buffered: Buffered) {
        if (!written.add(buffered.index)) return
        dir.mkdirs()
        val quad = quadFor(buffered.index) ?: fallback
        if (!quad.contentEquals(current)) {
            homography.release()
            homography = computeHomography(cornersFromFlat(quad), boardSize, margins4(DEFAULT_MARKER_MARGIN))
            current = quad.copyOf()
        }
        val warped = Mat()
        Imgproc.warpPerspective(buffered.raw, warped, homography, Size(boardSize.toDouble(), boardSize.toDouble()))
        val out = if (annotate) matToImage(warped)?.let { imageToMat(renderBoardShot(it, buffered.status)) } else warped
        // WebP q95 like `realgames.BOARD_ENCODE`: PNG was 3.1 GB across the corpus. `imwrite` only says false
        // when the file cannot be opened — a web server holding the board mapped left 13 boards a run old.
        val file = File(dir, "%06d$REVIEW_SUFFIX".format(buffered.index))
        val ok = out != null && !out.empty() && Imgcodecs.imwrite(file.path, out, REVIEW_ENCODE) && file.isFile
        if (!ok) failed += buffered.index
        if (out !== warped) out?.release()
        warped.release()
    }

    fun trouble(): String? {
        if (failed.isEmpty() && stale.isEmpty()) return null
        val parts = mutableListOf<String>()
        if (failed.isNotEmpty()) {
            parts += "${failed.size} boards could not be written (${failed.take(6).joinToString()}…)"
        }
        if (stale.isNotEmpty()) {
            parts +=
                "${stale.size} boards of an earlier run could not be removed (${stale.take(3).joinToString { it.name }}…)"
        }
        return parts.joinToString("; ") + " — is a web server or viewer holding them open?"
    }

    private class Buffered(
        val index: Int,
        val raw: Mat,
        val status: TrackerStatus?,
    )
}

/** Through one draw that normalises the type: `renderBoardShot` returns TYPE_INT_RGB, the plain board is BGR. */
private fun imageToMat(image: BufferedImage): Mat {
    val bgr = BufferedImage(image.width, image.height, BufferedImage.TYPE_3BYTE_BGR)
    bgr.createGraphics().apply {
        drawImage(image, 0, 0, null)
        dispose()
    }
    val mat = Mat(bgr.height, bgr.width, CvType.CV_8UC3)
    mat.put(0, 0, (bgr.raster.dataBuffer as DataBufferByte).data)
    return mat
}

/** So a partial write cannot pass off old boards as new. */
private fun reset(dir: File): List<File> = dir.listFiles { f: File -> REVIEW_NAME.matches(f.name) }.orEmpty().filterNot { it.delete() }

private val REVIEW_NAME = Regex("\\d{6}\\.(webp|png)")

internal const val REVIEW_CONTEXT = 2

internal const val REVIEW_SUFFIX = ".webp"
private const val REVIEW_QUALITY = 95
private val REVIEW_ENCODE = MatOfInt(Imgcodecs.IMWRITE_WEBP_QUALITY, REVIEW_QUALITY)
