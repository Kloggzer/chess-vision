package com.chesslab.desktop

import org.bytedeco.ffmpeg.global.avcodec
import org.bytedeco.ffmpeg.global.avutil
import org.bytedeco.javacv.FFmpegFrameRecorder
import org.bytedeco.javacv.Java2DFrameConverter
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.io.DataOutputStream
import java.io.File

/** With a plain 8-byte `mdat` header the patch overwrote size AND fourcc — on recordings that are the only copies. */
class RepairMdatHeaderTest {
    @TempDir
    lateinit var dir: File

    private fun reference(): File {
        val file = File(dir, "reference.mp4")
        val image = BufferedImage(SIDE, SIDE, BufferedImage.TYPE_3BYTE_BGR)
        val recorder =
            FFmpegFrameRecorder(file, SIDE, SIDE).apply {
                format = "mp4"
                videoCodec = avcodec.AV_CODEC_ID_H264
                pixelFormat = avutil.AV_PIX_FMT_YUV420P
                frameRate = FPS
                start()
            }
        Java2DFrameConverter().use { converter ->
            try {
                repeat(FRAMES) { recorder.record(converter.convert(image)) }
            } finally {
                recorder.stop()
                recorder.release()
            }
        }
        return file
    }

    private fun brokenWithShortHeader(nals: Int): File {
        val out = ByteArrayOutputStream()
        val payload = nals * (NAL_PREFIX + NAL_BYTES)
        DataOutputStream(out).use { data ->
            data.writeInt(FTYP_BOX)
            data.writeBytes("ftyp")
            data.writeBytes("isom")
            data.writeInt(0)
            data.writeInt(MDAT_HEADER_32 + payload)
            data.writeBytes("mdat")
            repeat(nals) {
                data.writeInt(NAL_BYTES)
                data.write(ByteArray(NAL_BYTES).also { it[0] = IDR.toByte() })
            }
        }
        return File(dir, "broken.mp4").apply { writeBytes(out.toByteArray()) }
    }

    @Test
    fun `an 8-byte mdat header keeps its fourcc`() {
        val out = File(dir, "repaired.mp4")
        repair(brokenWithShortHeader(FRAMES), reference(), out)

        val bytes = out.readBytes()
        assertEquals(
            "mdat",
            bytes.copyOfRange(FTYP_BOX + NAL_PREFIX, FTYP_BOX + MDAT_HEADER_32).decodeToString(),
            "the repair clobbered the box type, so the payload is no longer findable",
        )
    }

    private companion object {
        const val SIDE = 64
        const val FPS = 30.0
        const val FRAMES = 4
        const val FTYP_BOX = 16
        const val MDAT_HEADER_32 = 8
        const val NAL_PREFIX = 4
        const val NAL_BYTES = 32
        const val IDR = 5
    }
}
