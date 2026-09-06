package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar
import org.opencv.imgcodecs.Imgcodecs
import java.io.File

/**
 * The review boards a run leaves behind.
 *
 * The format is the point: 2 360 of these cost 3.1 GB as PNG, for a picture a human looks at once
 * while confirming a game. This asserts the file is actually there AND decodes — a codec the
 * runtime cannot encode returns false from `imwrite` and leaves nothing, which no compile catches.
 */
class AnnotatedFramesTest {
    @TempDir
    lateinit var dir: File

    private val quad = floatArrayOf(0f, 0f, SIDE, 0f, SIDE, SIDE, 0f, SIDE)

    private fun frame(): Mat = Mat(SIDE.toInt(), SIDE.toInt(), CvType.CV_8UC3, Scalar(30.0, 90.0, 200.0))

    @Test
    fun `a decisive frame lands as a decodable webp board`() {
        val frames = AnnotatedFrames(dir, quad, BOARD, context = 0, annotate = false)
        val raw = frame()

        frames.onFrame(index = 7, frame = raw, status = null, decisive = true)
        frames.close()
        raw.release()

        val written = File(dir, "000007$REVIEW_SUFFIX")
        assertTrue(written.isFile, "no review board at ${written.path}")
        val read = Imgcodecs.imread(written.path)
        assertFalse(read.empty(), "the runtime wrote a webp it cannot read back")
        assertEquals(BOARD, read.rows())
        assertEquals(BOARD, read.cols())
        read.release()
    }

    @Test
    fun `webp is a fraction of what png cost`() {
        val frames = AnnotatedFrames(dir, quad, BOARD, context = 0, annotate = false)
        val raw = frame()
        frames.onFrame(index = 1, frame = raw, status = null, decisive = true)
        frames.close()

        val webp = File(dir, "000001$REVIEW_SUFFIX").length()
        val png = File(dir, "png-reference.png")
        Imgcodecs.imwrite(png.path, Imgcodecs.imread(File(dir, "000001$REVIEW_SUFFIX").path))
        raw.release()

        assertTrue(webp < png.length(), "webp $webp is not smaller than png ${png.length()}")
    }

    /** A frame with one bright square: a quad shifted by half the board moves it, so the two boards differ. */
    private fun marked(): Mat =
        frame()
            .also {
                Imgcodecs.imwrite(File(dir, "unused.png").path, it)
            }.apply { submat(0, 40, 0, 40).setTo(Scalar(255.0, 255.0, 255.0)) }

    @Test
    fun `each board is warped through the quad of its own frame`() {
        val moved = FloatArray(8) { quad[it] + if (it % 2 == 0) SIDE / 2 else 0f }
        val frames = AnnotatedFrames(dir, quad, BOARD, context = 0, annotate = false) { index -> if (index >= 5) moved else null }
        val raw = marked()
        frames.onFrame(index = 1, frame = raw, status = null, decisive = true)
        frames.onFrame(index = 5, frame = raw, status = null, decisive = true)
        frames.close()
        raw.release()

        val first = Imgcodecs.imread(File(dir, "000001$REVIEW_SUFFIX").path, Imgcodecs.IMREAD_GRAYSCALE)
        val second = Imgcodecs.imread(File(dir, "000005$REVIEW_SUFFIX").path, Imgcodecs.IMREAD_GRAYSCALE)
        assertTrue(first.get(20, 20)[0] > 200, "the bright square sits where the frame has it")
        assertTrue(second.get(20, 20)[0] < 150, "under the moved quad it has left the corner")
        first.release()
        second.release()
    }

    /** The web server's mapping cannot be staged from a JVM (Java shares deletes), so the writer is
     *  pointed at a name it cannot open at all — the reporting is what this proves. */
    @Test
    fun `a board that cannot be written is counted and reported, a stale one is cleared`() {
        File(dir, "000009$REVIEW_SUFFIX").writeBytes(byteArrayOf(1, 2, 3))
        assertTrue(AnnotatedFrames(dir, quad, BOARD, context = 0, annotate = false).stale.isEmpty())
        assertFalse(File(dir, "000009$REVIEW_SUFFIX").exists(), "an earlier run's board is gone")

        val blocked = File(dir, "not-a-directory").also { it.writeBytes(byteArrayOf(0)) }
        val frames = AnnotatedFrames(blocked, quad, BOARD, context = 0, annotate = false)
        val raw = frame()
        frames.onFrame(index = 1, frame = raw, status = null, decisive = true)
        frames.close()
        raw.release()

        assertEquals(listOf(1), frames.failed)
        assertEquals(0, frames.count)
        assertTrue(frames.trouble()!!.contains("1 boards could not be written"))
    }

    private companion object {
        const val BOARD = 256
        const val SIDE = 256f

        /** The natives this whole file exists to exercise — `main` maps them the same way. */
        @JvmStatic
        @BeforeAll
        fun natives() = NativeCv.require()
    }
}
