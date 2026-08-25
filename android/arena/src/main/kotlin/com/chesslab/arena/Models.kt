package com.chesslab.arena

import java.io.File

/**
 * Every model a run may ask, opened on first use and counted separately.
 *
 * A tracker that wants a second opinion asks for it HERE rather than opening its own session:
 * the count of reads per model is part of the result, and a session opened behind the arena's
 * back would not appear in it.
 */
class Models(
    /** What `squares()` reads when the caller names no model. */
    val default: String,
    private val assetRoot: File = File(ASSET_SOURCE),
) : AutoCloseable {
    private val open = LinkedHashMap<String, Vision>()

    val reads = LinkedHashMap<String, Long>()

    init {
        served(default)
    }

    fun of(name: String): Vision = open.getOrPut(served(name)) { Vision(name, assetRoot) }

    /**
     * The name check, up front and by name alone — [Vision] verifies the same thing from the
     * model's config, but only once a graph is opened, and a run that names the wrong model should
     * hear it before it decodes a video rather than at its first read.
     */
    private fun served(name: String): String =
        name.also {
            require(it in COVERAGE_MODELS) { "'$it' is not served here — the arena runs 13+1 models: $COVERAGE_MODELS" }
        }

    fun counted(name: String) {
        reads[name] = (reads[name] ?: 0) + 1
    }

    /** Every model this run touched, with what it cost: `real13-… 412 · comp13-… 96`. */
    fun summary(): String = reads.entries.joinToString(" · ") { "${it.key} ${it.value}" }.ifEmpty { "no model reads" }

    val total: Long get() = reads.values.sum()

    override fun close() = open.values.forEach(Vision::close)
}

/** The app's bundled models, read where they live. The arena's working directory is `android/arena`. */
internal const val ASSET_SOURCE = "../app/src/main/assets/cnn_model"
