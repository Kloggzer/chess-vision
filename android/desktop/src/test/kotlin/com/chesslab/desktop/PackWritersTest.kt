package com.chesslab.desktop

import com.chesslab.desktop.testutil.assertPackConsistent
import com.chesslab.desktop.testutil.packManifest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonPrimitive
import org.bytedeco.ffmpeg.global.avcodec
import org.bytedeco.ffmpeg.global.avutil
import org.bytedeco.javacv.FFmpegFrameRecorder
import org.bytedeco.javacv.Frame
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar
import org.opencv.core.Size
import org.opencv.imgcodecs.Imgcodecs
import org.opencv.imgproc.Imgproc
import java.io.File
import java.nio.ByteBuffer

class PackWritersTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun `labeled-video-pack skips the frame a human marked occluded`() {
        val rec = recording()
        val out = File(dir, "labeled")

        packLabeledVideo(listOf(rec.video, rec.log, rec.corrections, out.path, "every=1"))

        assertEquals(2 * 64, assertPackConsistent(out, dir, "labeled"))
        assertEquals(2, meta(out).getValue("accepted_frames").jsonPrimitive.int)
    }

    @Test
    fun `occlusion-video-pack packs exactly the marked squares`() {
        val rec = recording()
        val out = File(dir, "occluded")

        packOcclusionVideo(listOf(rec.video, rec.log, rec.corrections, out.path))

        assertEquals(2, assertPackConsistent(out, dir, "occlusion"))
        assertEquals(listOf("occluded"), packManifest(out).map { it.getValue("label").jsonPrimitive.content }.distinct())
    }

    @Test
    fun `legacy-synth-dataset packs every known label of the prefixed sessions`() {
        val (root, manifest) = legacySynth()
        val out = File(dir, "synth")

        buildLegacySynthDataset(listOf(root.path, manifest.path, out.path))

        assertEquals(6, assertPackConsistent(out, dir, "legacy"))
        val first = File(out, "packed_images.u8").readBytes().take(PACK_CROP_BYTES).map { it.toInt() and 0xff }
        assertEquals(listOf(200, 0, 0), first.take(3), "a BGR source lands as RGB")
        assertEquals(setOf(200, 0), first.toSet(), "a flat crop stays flat through the resize")
    }

    /** PowerShells `Out-File` stempelt ein BOM: der Manifest-Leser geht durch `Jsonl` wie jeder andere. */
    @Test
    fun `legacy-synth-dataset reads a manifest with a byte order mark`() {
        val (root, manifest) = legacySynth()
        manifest.writeText("\uFEFF" + manifest.readText())
        val out = File(dir, "synth")

        buildLegacySynthDataset(listOf(root.path, manifest.path, out.path))

        assertEquals(6, assertPackConsistent(out, dir, "legacy"))
    }

    private fun legacySynth(): Pair<File, File> {
        NativeCv.require()
        val root = File(dir, "legacy").apply { mkdirs() }
        val rows = StringBuilder()
        for (s in 0 until 3) {
            for ((i, label) in listOf("wP", "empty", "bogus").withIndex()) {
                val png = File(root, "crops/s$s-$i.png")
                png.parentFile.mkdirs()
                val img = Mat(20, 24, CvType.CV_8UC3, Scalar(10.0 * s, 40.0 * i, 200.0))
                Imgcodecs.imwrite(png.path, img)
                img.release()
                rows.append(
                    """{"session_id":"pretrain-synth__$s","label":"$label","path":"data/crops/s$s-$i.png",""" +
                        """"frame":"f$i","square":"a${i + 1}"}""" + "\n",
                )
            }
        }
        rows.append("""{"session_id":"other","label":"wP","path":"crops/s0-0.png","frame":"f","square":"a1"}""" + "\n")
        return root to File(dir, "legacy.jsonl").apply { writeText(rows.toString()) }
    }

    private class Recording(
        val video: String,
        val log: String,
        val corrections: String,
    )

    private fun recording(): Recording {
        NativeCv.require()
        val rec = File(dir, "rec").apply { mkdirs() }
        val video = File(rec, "video.mp4")
        writeVideo(video, FRAMES)
        val corners = "[[41.2,39.2],[738.8,39.2],[738.8,736.8],[41.2,736.8]]"
        val log = File(rec, "log.jsonl")
        log.writeText(
            (0 until FRAMES).joinToString("\n", postfix = "\n") {
                """{"frame":"frames/$it.png","fen":"$FEN","corners":$corners}"""
            },
        )
        val corrections = File(rec, "corrections.jsonl")
        corrections.writeText(
            listOf("e2", "e4").joinToString("\n", postfix = "\n") {
                """{"session_id":"rec","frame":"1","square":"$it","label":"occluded"}"""
            },
        )
        return Recording(video.path, log.path, corrections.path)
    }

    private fun writeVideo(
        file: File,
        frames: Int,
    ) {
        val board = syntheticBoard()
        val side = board.cols()
        val bytes = ByteArray(side * side * 3)
        board.get(0, 0, bytes)
        board.release()
        val frame = Frame(side, side, Frame.DEPTH_UBYTE, 3).also { (it.image[0] as ByteBuffer).put(bytes).rewind() }
        val recorder =
            FFmpegFrameRecorder(file, side, side).apply {
                format = "mp4"
                videoCodec = avcodec.AV_CODEC_ID_H264
                pixelFormat = avutil.AV_PIX_FMT_YUV420P
                frameRate = 30.0
                videoQuality = 0.0
                start()
            }
        try {
            repeat(frames) { recorder.record(frame) }
        } finally {
            recorder.stop()
            recorder.release()
            frame.close()
        }
    }

    private fun meta(out: File): JsonObject = Json.parseToJsonElement(File(out, "packed_meta.json").readText()) as JsonObject

    private fun syntheticBoard(): Mat {
        val n = BS + 2 * BORDER
        val img = Mat(n, n, CvType.CV_8UC3, Scalar(175.0, 175.0, 175.0))
        img.submat(BORDER, BORDER + BS, BORDER, BORDER + BS).setTo(Scalar(205.0, 205.0, 205.0))
        for (f in 0 until 8) {
            for (r in 0 until 8) {
                if ((f + r) % 2 != 0) continue
                val cell = img.submat(BORDER + r * CELL, BORDER + (r + 1) * CELL, BORDER + f * CELL, BORDER + (f + 1) * CELL)
                cell.setTo(Scalar(70.0, 90.0, 110.0))
            }
        }
        for (k in 0..8) {
            val p = BORDER + k * CELL
            img.rowRange(p - 2, p + 3).setTo(Scalar(20.0, 20.0, 20.0))
            img.colRange(p - 2, p + 3).setTo(Scalar(20.0, 20.0, 20.0))
        }
        Imgproc.GaussianBlur(img, img, Size(0.0, 0.0), 1.0)
        return img
    }

    private companion object {
        const val BS = 640
        const val CELL = BS / 8
        const val BORDER = 64
        const val FRAMES = 3
        const val FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    }
}
