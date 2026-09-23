package com.chesslab.tracker.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.ByteArrayInputStream
import java.io.File

/**
 * Staging was size-guarded: `coverage_gate` 0.25 and 0.35 are the same number of bytes, so an A/B
 * of the two replayed the stale config both times (found 2026-09-14).
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

    private companion object {
        const val CONFIG = """{"classes": ["empty"]}"""
    }

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

    /**
     * `available()` is "readable without blocking", not a file length. A stream that reports the OLD
     * file's length leaves the stale graph — and with it the compiled QNN context — standing.
     */
    @Test
    fun `a graph of a different length still reaches the staged copy`(
        @TempDir tmp: File,
    ) {
        val dir = File(tmp, "p4a-80")
        assets(dir, CONFIG, graph = ByteArray(32) { 1 }).stage()

        assets(dir, CONFIG, graph = ByteArray(48) { 2 }).stage()

        assertEquals(48, File(dir, MODEL_FP32_FILE).length().toInt())
    }

    /** The recopy has to be SEEN, or the compiled context of the old nodes survives it. */
    @Test
    fun `a replaced graph drops the compiled QNN context`(
        @TempDir tmp: File,
    ) {
        val dir = File(tmp, "p4a-80")
        assets(dir, CONFIG, graph = ByteArray(32) { 1 }).stage()
        File(dir, MODEL_QNN_CTX_FILE).writeText("compiled from the old nodes")

        assets(dir, CONFIG, graph = ByteArray(32) { 2 }).stage()

        assertFalse(File(dir, MODEL_QNN_CTX_FILE).isFile, "the context is a binary of the graph that was replaced")
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
