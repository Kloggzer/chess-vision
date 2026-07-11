package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import org.bytedeco.ffmpeg.global.avutil.AV_PIX_FMT_BGR24
import org.bytedeco.javacpp.indexer.FloatIndexer
import org.bytedeco.javacv.FFmpegFrameGrabber
import org.bytedeco.javacv.OpenCVFrameConverter
import org.bytedeco.opencv.global.opencv_core.CV_32FC2
import org.bytedeco.opencv.global.opencv_imgproc.COLOR_BGR2GRAY
import org.bytedeco.opencv.global.opencv_imgproc.GaussianBlur
import org.bytedeco.opencv.global.opencv_imgproc.createCLAHE
import org.bytedeco.opencv.global.opencv_imgproc.cvtColor
import org.bytedeco.opencv.global.opencv_imgproc.getPerspectiveTransform
import org.bytedeco.opencv.global.opencv_imgproc.warpPerspective
import org.bytedeco.opencv.opencv_core.Mat
import org.bytedeco.opencv.opencv_core.Size
import org.bytedeco.opencv.opencv_imgproc.CLAHE
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.DynamicTest
import org.junit.jupiter.api.TestFactory
import org.yaml.snakeyaml.Yaml
import java.io.File

/**
 * Parity test: replay the shared Blender move-tracker clips (`tests/data/testclips`, the same
 * fixtures the Python `pytest -m clips` uses) through the Kotlin [TrackerEngine].
 *
 * FFmpeg decodes each clip, OpenCV warps every frame with the manifest corners exactly as the
 * Android `BoardFramePipeline` does (bgr + CLAHE gray at detect scale), and the engine is driven
 * frame by frame with video-derived timestamps (deterministic — no wall-clock). The engine must
 * commit the same moves the manifest records (`moves_uci`) and end on the same board (`expect_fen`).
 *
 * Skipped cleanly if the clips are absent. Slow (real video decode + warp); host-only JavaCV
 * natives come from the engine test dependencies.
 */
class ClipReplayTest {
    @TestFactory
    fun replayClips(): List<DynamicTest> {
        val dir = findClipsDir()
        assumeTrue(dir != null, "tests/data/testclips not found — skipping clip replay")
        val clipsDir = dir!!
        val manifest = File(clipsDir, "manifest.yaml")
        assumeTrue(manifest.exists(), "manifest.yaml missing — skipping clip replay")

        @Suppress("UNCHECKED_CAST")
        val entries =
            (Yaml().load<Map<String, Any>>(manifest.readText())["clips"] as List<Map<String, Any>>)
                .filter { File(clipsDir, it["file"] as String).exists() }

        return entries.map { entry ->
            DynamicTest.dynamicTest(entry["file"] as String) {
                runClip(clipsDir, entry, productionProfile = false)
                runClip(clipsDir, entry, productionProfile = true)
            }
        }
    }

    private fun runClip(
        clipsDir: File,
        entry: Map<String, Any>,
        productionProfile: Boolean,
    ) {
        val clip = ClipSpec.from(entry)
        KNOWN_DIVERGENCES[clip.file]?.let { assumeTrue(false, "known port divergence: $it") }
        val result = replay(File(clipsDir, clip.file), clip, productionProfile)

        // Dialect-free assertion (python-chess vs chesslib disagree on SAN spelling AND on the
        // en-passant FEN field — chesslib always sets it on a double push, python-chess only when
        // a capture is legal): compare only piece PLACEMENT + side to move, and require the same
        // NUMBER of committed legal moves. `expectFen` is the board after only those moves.
        val gotFen =
            result.fen
                .split(" ")
                .take(2)
                .joinToString(" ")
        val wantFen =
            clip.expectFen
                .split(" ")
                .take(2)
                .joinToString(" ")
        val msg =
            "${clip.file} (${if (productionProfile) "Android" else "parity"} profile): " +
                "committed ${result.history} (${result.history.size} moves), " +
                "expected ${clip.movesUci.size}; end board $gotFen vs $wantFen; note='${result.note}'"
        check(result.history.size == clip.movesUci.size) { msg }
        check(gotFen == wantFen) { msg }
        if (clip.expectGameOver) {
            check(result.gameOver) { "${clip.file}: expected game over, got ${result.fen}" }
        }
    }

    private data class ReplayResult(
        val history: List<String>,
        val fen: String,
        val note: String,
        val gameOver: Boolean,
    )

    private fun replay(
        clipFile: File,
        clip: ClipSpec,
        productionProfile: Boolean,
    ): ReplayResult {
        val engine = TrackerEngine(clip.config(productionProfile))
        engine.reset(clip.startFen)

        val ds = (clip.boardSize * TrackerConfig().detectScale).toInt()
        val hDetect = getPerspectiveTransform(quad(clip.corners), dstQuad(ds.toFloat()))
        val clahe = createCLAHE(CLAHE_CLIP, Size(CLAHE_TILE, CLAHE_TILE))

        val grabber = FFmpegFrameGrabber(clipFile.absolutePath)
        grabber.pixelFormat = AV_PIX_FMT_BGR24
        grabber.start()
        val fps = if (grabber.frameRate > 1.0) grabber.frameRate else DEFAULT_FPS
        val converter = OpenCVFrameConverter.ToMat()

        val warp = WarpCtx(hDetect, clahe, ds)
        try {
            var index = 0
            while (true) {
                val frame = grabber.grabImage() ?: break
                converter.convert(frame)?.let { cam ->
                    val ts = Math.round(index / fps * NANOS_PER_S)
                    feedFrame(engine, cam, warp, clip.promotion, ts)
                    index++
                }
            }
        } finally {
            grabber.stop()
            grabber.release()
        }
        val status = engine.status
        return ReplayResult(
            history = status.history,
            fen = status.fen,
            note = status.note,
            gameOver = status.gameOver,
        )
    }

    /** Warp parameters reused for every frame of a clip (detect homography + CLAHE + size). */
    private class WarpCtx(
        val hDetect: Mat,
        val clahe: CLAHE,
        val detectSize: Int,
    )

    /** Warp one camera frame exactly as Python's tracker: one warp straight to the detect size,
     * gray = cvtColor of that warp + CLAHE (NOT a resize from a full-res board — the interpolation
     * differs enough to flip a low-contrast recapture's shadow classification). */
    private fun feedFrame(
        engine: TrackerEngine,
        cam: Mat,
        w: WarpCtx,
        promotion: String,
        tsNs: Long,
    ) {
        val detectBgr = Mat()
        warpPerspective(cam, detectBgr, w.hDetect, Size(w.detectSize, w.detectSize))
        val detectGray = Mat()
        cvtColor(detectBgr, detectGray, COLOR_BGR2GRAY)
        w.clahe.apply(detectGray, detectGray)
        GaussianBlur(detectGray, detectGray, Size(BLUR_KERNEL, BLUR_KERNEL), 0.0)
        engine.onFrame(toGray(detectGray), toBgr(detectBgr), tsNs)
        if (engine.status.promotionPending != null) engine.forcePromote(promotion)
        detectBgr.release()
        detectGray.release()
    }

    private data class ClipSpec(
        val file: String,
        val startFen: String,
        val movesUci: List<String>,
        val corners: List<DoubleArray>,
        val boardSize: Int,
        val expectFen: String,
        val expectGameOver: Boolean,
        val tracker: Map<String, Any>,
    ) {
        val promotion: String = movesUci.firstOrNull { it.length == 5 }?.substring(4, 5) ?: "q"

        fun config(productionProfile: Boolean): TrackerConfig {
            var c = TrackerConfig()
            (tracker["census_thr"] as? Number)?.let { c = c.copy(censusThr = it.toDouble()) }
            (tracker["overhang"] as? Number)?.let { c = c.copy(overhang = it.toDouble()) }
            (tracker["confirm_frames"] as? Number)?.let { c = c.copy(confirmFrames = it.toInt()) }
            (tracker["max_changed"] as? Number)?.let { c = c.copy(maxChanged = it.toInt()) }
            if (productionProfile) {
                c = c.copy(diffIllumCancel = true, diffLightVeto = true)
            }
            return c
        }

        companion object {
            @Suppress("UNCHECKED_CAST")
            fun from(e: Map<String, Any>): ClipSpec {
                val corners =
                    (e["corners"] as List<List<Number>>).map {
                        doubleArrayOf(it[0].toDouble(), it[1].toDouble())
                    }
                val startFen = e["start_fen"] as String
                // expect_fen = board after the committed legal moves; older move-only clips predate
                // it and fall back to the last rendered position (identical for legal sequences).
                val positions = (e["positions"] as? List<String>).orEmpty()
                val expectFen = (e["expect_fen"] as? String) ?: positions.lastOrNull() ?: startFen
                return ClipSpec(
                    file = e["file"] as String,
                    startFen = startFen,
                    movesUci = (e["moves_uci"] as? List<String>) ?: emptyList(),
                    corners = corners,
                    boardSize = (e["board_size"] as Number).toInt(),
                    expectFen = expectFen,
                    expectGameOver = e["expect_game_over"] as? Boolean ?: false,
                    tracker = (e["tracker"] as? Map<String, Any>) ?: emptyMap(),
                )
            }
        }
    }

    private companion object {
        const val NANOS_PER_S = 1_000_000_000.0
        const val DEFAULT_FPS = 12.0
        const val CLAHE_CLIP = 2.0
        const val CLAHE_TILE = 8
        const val BLUR_KERNEL = 5

        // Clips the Kotlin engine does not yet reproduce 1:1 with the Python tracker (kept green in
        // Python `pytest -m clips`, skipped — not failed — here and documented). Empty = full parity.
        val KNOWN_DIVERGENCES = emptyMap<String, String>()

        fun findClipsDir(): File? {
            var dir: File? = File(System.getProperty("user.dir")).absoluteFile
            repeat(6) {
                val candidate = File(dir, "tests/data/testclips")
                if (File(candidate, "manifest.yaml").exists()) return candidate
                dir = dir?.parentFile
            }
            return null
        }

        fun quad(pts: List<DoubleArray>): Mat {
            val m = Mat(4, 1, CV_32FC2)
            val idx = m.createIndexer<FloatIndexer>()
            for (i in 0 until 4) {
                idx.put(i.toLong(), 0L, 0L, pts[i][0].toFloat())
                idx.put(i.toLong(), 0L, 1L, pts[i][1].toFloat())
            }
            idx.release()
            return m
        }

        // Destination corner order matches Python compute_homography: a8,h8,h1,a1 -> square.
        fun dstQuad(s: Float): Mat =
            quad(
                listOf(
                    doubleArrayOf(0.0, 0.0),
                    doubleArrayOf(s.toDouble(), 0.0),
                    doubleArrayOf(s.toDouble(), s.toDouble()),
                    doubleArrayOf(0.0, s.toDouble()),
                ),
            )

        fun toGray(mat: Mat): GrayImage {
            val buf = ByteArray(mat.rows() * mat.cols())
            mat.data().get(buf)
            return GrayImage(mat.cols(), mat.rows(), buf)
        }

        fun toBgr(mat: Mat): BgrImage {
            val buf = ByteArray(mat.rows() * mat.cols() * 3)
            mat.data().get(buf)
            return BgrImage(mat.cols(), mat.rows(), buf)
        }
    }
}
