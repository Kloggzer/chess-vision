package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertTrue
import java.io.File

// D00b-1: there is ONE fixture tree, in `:core-engine`'s test resources, so `:core-cnn` walks up
// from the module directory to `parity/_cnn/` and reads only its seven JSONL families.
internal typealias FixtureRow = Map<String, Any?>

internal object CnnFixtures {
    const val OBSERVATION = "cnn_observation.jsonl"
    const val SCORE = "cnn_score.jsonl"
    const val VERIFY = "cnn_verify.jsonl"
    const val IDENTITY = "cnn_identity.jsonl"
    const val DERIVE = "cnn_derive.jsonl"
    const val RESYNC = "cnn_resync.jsonl"
    const val GUESS = "cnn_guess.jsonl"

    private val dir: File by lazy { locateFixtureDir() }

    fun rows(family: String): List<FixtureRow> {
        val file = File(dir, family)
        assertTrue(file.isFile, "missing fixture $family in $dir")
        val rows = file.readLines().filter { it.isNotBlank() }.map { asRow(MiniJson(it).parse()) }
        assertTrue(rows.isNotEmpty(), "fixture $family has no rows")
        return rows
    }

    fun meta(): FixtureRow = asRow(MiniJson(File(dir, "meta.json").readText()).parse())

    private fun locateFixtureDir(): File {
        val start = requireNotNull(System.getProperty("user.dir")) { "user.dir is not set" }
        var candidate: File? = File(start).absoluteFile
        while (candidate != null) {
            val parity = File(candidate, "core-engine/src/test/resources/parity/_cnn")
            if (parity.isDirectory) return parity
            candidate = candidate.parentFile
        }
        error("parity/_cnn fixtures not found above ${System.getProperty("user.dir")}")
    }
}

internal fun asRow(value: Any?): FixtureRow = (value as Map<*, *>).entries.associate { (k, v) -> k as String to v }
