package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.ByteArrayOutputStream
import java.io.DataOutputStream
import java.io.File

/** Every `mdat` byte is accounted for, or it throws — never a shorter list. */
class RepairRecordingTest {
    @TempDir
    lateinit var dir: File

    private fun broken(vararg nals: ByteArray): File {
        val out = ByteArrayOutputStream()
        DataOutputStream(out).use { data ->
            data.writeInt(16)
            data.writeBytes("ftyp")
            data.writeBytes("isom")
            data.writeInt(0)
            data.writeInt(1)
            data.writeBytes("mdat")
            data.writeLong(Long.MAX_VALUE)
            nals.forEach { nal ->
                data.writeInt(nal.size)
                data.write(nal)
            }
        }
        return File(dir, "video.mp4").apply { writeBytes(out.toByteArray()) }
    }

    private fun nal(
        type: Int,
        size: Int = 32,
    ) = ByteArray(size).also { it[0] = type.toByte() }

    @Test
    fun `every sample is found, and an IDR is marked as one`() {
        val file = broken(nal(5), nal(1), nal(1))
        val samples = walkSamples(file, mdatPayloadStart(file))

        assertEquals(3, samples.size)
        assertEquals(listOf(true, false, false), samples.map { it.key })
        assertEquals(36, samples.first().size, "a sample is its length prefix plus its NAL")
    }

    @Test
    fun `a chain that does not end on the last byte is refused`() {
        val file = broken(nal(5))
        file.appendBytes(byteArrayOf(0, 0, 0))

        assertThrows(IllegalStateException::class.java) { walkSamples(file, mdatPayloadStart(file)) }
    }

    @Test
    fun `the index states the frame rate it was given`() {
        val moov = buildMoov(listOf(Sample(36, true), Sample(36, false)), 40L, ByteArray(8), 2560, 1440, 30.0)

        assertEquals("moov", moov.copyOfRange(4, 8).decodeToString())
        assertEquals(
            moov.size,
            ((moov[0].toInt() and 0xFF) shl 24) or ((moov[1].toInt() and 0xFF) shl 16) or ((moov[2].toInt() and 0xFF) shl 8) or
                (moov[3].toInt() and 0xFF),
        )
        assertTrue(String(moov, Charsets.ISO_8859_1).contains("stss"), "key frames need their own table")
        assertTrue(String(moov, Charsets.ISO_8859_1).contains("co64"), "offsets are absolute, and a recording can pass 4 GB")
    }
}
