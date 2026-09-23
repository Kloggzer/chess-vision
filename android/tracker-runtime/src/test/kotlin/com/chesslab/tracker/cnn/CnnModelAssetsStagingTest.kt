package com.chesslab.tracker.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.ByteArrayInputStream
import java.io.File

/** `coverage_gate` 0.25 and 0.35 are the same number of bytes: a size guard replayed the stale config. */
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

    /** `available()` is not a file length: a stream reporting the OLD length left the stale graph standing. */
    @Test
    fun `a graph of a different length still reaches the staged copy`(
        @TempDir tmp: File,
    ) {
        val dir = File(tmp, "p4a-80")
        assets(dir, CONFIG, graph = ByteArray(32) { 1 }).stage()

        assets(dir, CONFIG, graph = ByteArray(48) { 2 }).stage()

        assertEquals(48, File(dir, MODEL_FP32_FILE).length().toInt())
    }

    /** Or the compiled context of the old nodes survives it. */
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
