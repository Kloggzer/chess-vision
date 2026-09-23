package com.chesslab.arena

import java.io.File

/** A second opinion is asked HERE, not through a private session: reads per model are part of the result. */
class Models(
    val default: String,
    private val assetRoot: File = File(ASSET_SOURCE),
) : AutoCloseable {
    private val open = LinkedHashMap<String, Vision>()

    val reads = LinkedHashMap<String, Long>()

    init {
        served(default)
    }

    fun of(name: String): Vision = open.getOrPut(served(name)) { Vision(name, assetRoot) }

    /** By name, up front: a wrong model should be heard before a video is decoded, not at the first read. */
    private fun served(name: String): String =
        name.also {
            require(it in COVERAGE_MODELS) { "'$it' is not served here — the arena runs 13+1 models: $COVERAGE_MODELS" }
        }

    fun counted(name: String) {
        reads[name] = (reads[name] ?: 0) + 1
    }

    fun summary(): String = reads.entries.joinToString(" · ") { "${it.key} ${it.value}" }.ifEmpty { "no model reads" }

    val total: Long get() = reads.values.sum()

    override fun close() = open.values.forEach(Vision::close)
}

internal const val ASSET_SOURCE = "../app/src/main/assets/cnn_model"
