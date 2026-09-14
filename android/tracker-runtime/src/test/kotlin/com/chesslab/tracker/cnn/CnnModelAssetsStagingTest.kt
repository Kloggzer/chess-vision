package com.chesslab.tracker.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.ByteArrayInputStream
import java.io.File

/**
 * Staging was size-guarded, so an edit of the SAME length never reached the staged copy.
 *
 * `coverage_gate` 0.25 and 0.35 are the same number of bytes. A/B-ing two thresholds would have
 * replayed the stale config both times and measured nothing (found 2026-09-14).
 */
class CnnModelAssetsStagingTest {
    private fun assets(
        dir: File,
        config: String,
        graph: ByteArray = ByteArray(16),
    ) = CnnModelAssets(
        open = { name ->
            when (name) {
                MODEL_CONFIG_FILE -> ByteArrayInputStream(config.toByteArray())
                MODEL_FP32_FILE -> ByteArrayInputStream(graph)
                else -> null
            }
        },
        dir = dir,
    )

    @Test
    fun `a config edit of the same length still reaches the staged copy`(
        @TempDir tmp: File,
    ) {
        val dir = File(tmp, "p4a-80-clahe")
        assets(dir, """{"coverage_gate": 0.35}""").stage()

        val staged = assets(dir, """{"coverage_gate": 0.25}""").stage()

        assertEquals("""{"coverage_gate": 0.25}""", staged.configJson)
        assertEquals("""{"coverage_gate": 0.25}""", File(dir, MODEL_CONFIG_FILE).readText())
    }

    @Test
    fun `an unchanged config is still served`(
        @TempDir tmp: File,
    ) {
        val dir = File(tmp, "m")
        val text = """{"classes": ["empty"]}"""
        assets(dir, text).stage()

        assertEquals(text, assets(dir, text).stage().configJson)
    }
}
