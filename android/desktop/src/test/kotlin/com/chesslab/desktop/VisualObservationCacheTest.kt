package com.chesslab.desktop

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.OccupancyObservation
import com.chesslab.engine.api.CnnSnapshot
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path

class VisualObservationCacheTest {
    @TempDir
    lateinit var temp: Path

    @Test
    fun `round trip preserves observations grid bits and alignments`() {
        val video = temp.resolve("video.mp4").toFile().apply { writeBytes(byteArrayOf(1, 2, 3)) }
        val file = temp.resolve("visual.cvo").toFile()
        val obs = observation()
        VisualObservationCache.open(file, video, "model", SIGNATURE).use { cache ->
            assertNotNull(cache.sink)
            cache.sink?.invoke(CnnSnapshot(obs, 2, 77, 1.0, null, null, "fen", GRID))
            cache.alignmentSink?.invoke(6, CORNERS)
        }

        VisualObservationCache.open(file, video, "model", SIGNATURE).use { cache ->
            val cached = cache.lookup?.invoke(2) ?: error("reader lookup missing")
            val restored = cached.observation as OccupancyObservation
            assertEquals(GRID, cached.gridOccluded)
            assertEquals(obs, restored)
            assertArrayEquals(CORNERS, cache.alignmentLookup?.invoke(6))
            assertEquals(null, cache.alignmentLookup?.invoke(5))
        }
    }

    @Test
    fun `configuration mismatch is refused`() {
        val video = temp.resolve("video.mp4").toFile().apply { writeBytes(byteArrayOf(1, 2, 3)) }
        val file = temp.resolve("visual.cvo").toFile()
        VisualObservationCache.open(file, video, "model", SIGNATURE).use { }

        assertThrows(IllegalStateException::class.java) { VisualObservationCache.open(file, video, "model", "different") }
    }

    private fun observation(): OccupancyObservation {
        val pOcc = ALL_SQUARES.associateWith { 0.75 }
        val pEmpty = ALL_SQUARES.associateWith { 0.20 }
        val pOccluded = ALL_SQUARES.associateWith { 0.05 }
        val labels = ALL_SQUARES.associateWith { "wP" }
        val conf = ALL_SQUARES.associateWith { 0.75 }
        val runner = ALL_SQUARES.associateWith { 0.20 }
        val invalid = ALL_SQUARES.associateWith { 0.73 }
        val raw = OccupancyObservation(pOcc, pEmpty, pOccluded, labels, conf, runner, invalid)
        return OccupancyObservation(pOcc, pEmpty, pOccluded, labels, conf, runner, invalid, raw)
    }

    private companion object {
        const val GRID = 0x1234L
        const val SIGNATURE = "same replay"
        val CORNERS = floatArrayOf(1f, 2f, 3f, 4f, 5f, 6f, 7f, 8f)
    }
}

class TransposedGridTest {
    @org.junit.jupiter.api.Test
    fun `file-major bits land on the rank-major square`() {
        // e4 = file 4, rank 3: file-major bit 4*8+3 = 35, rank-major index 3*8+4 = 28.
        org.junit.jupiter.api.Assertions
            .assertEquals(1L shl 28, transposedGrid(1L shl 35))
        // The diagonal is a fixed point, and transposing twice is the identity.
        org.junit.jupiter.api.Assertions
            .assertEquals(1L shl 27, transposedGrid(1L shl 27))
        org.junit.jupiter.api.Assertions
            .assertEquals(0x00F0_0F00_1234_5678L, transposedGrid(transposedGrid(0x00F0_0F00_1234_5678L)))
    }
}
