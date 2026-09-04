package com.chesslab.desktop

import com.chesslab.geometry.margins4
import com.chesslab.tracker.geometry.DEFAULT_MARKER_MARGIN
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.nio.file.Path

/**
 * What the RECORDING says about its own board, against what the corners alone can say. A replay
 * that keeps the defaults here crops the 180-degree-opposite squares of a black-side game.
 */
class ReplayGeometryTest {
    @TempDir
    lateinit var temp: Path

    @Test
    fun `the recording's margin and orientation reach the geometry`() {
        val dir = temp.toFile()
        File(dir, "candidate.json").writeText("""{"geometry":{"margin":0.02,"board_size":928}}""")
        File(dir, "settings.json").writeText("""{"app":{"orientation":"BLACK_BOTTOM"}}""")
        val geometry = replayBoardGeometry(QUAD, dir, null)
        assertEquals(margins4(0.02), geometry.margin)
        assertFalse(geometry.whitePov)
    }

    @Test
    fun `a config= settings file carries the orientation too`() {
        val settings = File(temp.toFile(), "other-settings.json")
        settings.writeText("""{"app":{"orientation":"BLACK_BOTTOM"},"config":{}}""")
        assertFalse(replayBoardGeometry(QUAD, null, settings).whitePov)
    }

    @Test
    fun `a recording that stored neither keeps the measured defaults`() {
        val geometry = replayBoardGeometry(QUAD, temp.toFile(), null)
        assertEquals(margins4(DEFAULT_MARKER_MARGIN), geometry.margin)
        assertTrue(geometry.whitePov)
    }

    private companion object {
        val QUAD = floatArrayOf(0f, 0f, 800f, 0f, 800f, 800f, 0f, 800f)
    }
}
