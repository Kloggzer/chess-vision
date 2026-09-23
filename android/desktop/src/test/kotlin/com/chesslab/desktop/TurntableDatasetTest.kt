package com.chesslab.desktop

import kotlinx.serialization.SerializationException
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

class TurntableDatasetTest {
    @TempDir
    lateinit var temp: File

    @Test
    fun `packs are joined in split order`() {
        val test = pack("test", 1)
        val validation = pack("validation", 2)
        val training = pack("training", 3)
        val out = File(temp, "out")

        assembleTurntableDataset(listOf(out.path, test.path, validation.path, training.path))

        assertArrayEquals(byteArrayOf(3, 3, 3, 2, 2, 2, 1, 1, 1), File(out, "packed_images.u8").readBytes())
        assertEquals(3, File(out, "manifest.jsonl").readLines().size)
    }

    @Test
    fun `a torn source manifest is rejected`() {
        val test = pack("test", 1, torn = true)
        val validation = pack("validation", 2)
        val training = pack("training", 3)

        assertThrows(SerializationException::class.java) {
            assembleTurntableDataset(listOf(File(temp, "out").path, test.path, validation.path, training.path))
        }
    }

    private fun pack(
        session: String,
        value: Byte,
        torn: Boolean = false,
    ): File =
        File(temp, session).also { dir ->
            dir.mkdirs()
            File(dir, "packed_images.u8").writeBytes(byteArrayOf(value, value, value))
            File(dir, "manifest.jsonl").writeText(
                """{"path":"mm://$session/f/a1","session_id":"$session","label":"wP","out_size":[1,1]}""" +
                    "\n" + if (torn) "{" else "",
            )
        }
}
