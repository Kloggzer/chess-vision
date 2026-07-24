package com.chesslab.geometry.testutil

import org.yaml.snakeyaml.LoaderOptions
import org.yaml.snakeyaml.Yaml
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.zip.GZIPInputStream
import kotlin.math.abs

// Minimal loader for the phase-00b `_geometry/` golden fixtures.
//
// The fixtures are committed under `core-engine/src/test/resources/parity/`, i.e. on ANOTHER
// module's test classpath. `ParityFixtures.kt` (00b, `:core-engine` test sources) is NOT moved
// or duplicated here - it is a classpath-resource reader and this module has no such resource.
// Instead this reads the `_geometry/` files it consumes off the file system, resolved by
// walking up from the working directory. Recorded as a discrepancy in `STATUS.md`.
//
// JSON is parsed with snakeyaml (already a declared test dependency of this module; JSON is a
// YAML subset and none of these files uses exponent notation).

object GeometryFixtures {
    /** Same tolerance contract as `ParityFixtures.kt`: 1e-4 relative with a 1e-4 floor. */
    const val REL_TOL: Double = 1e-4

    private const val MAX_FIXTURE_CHARS: Int = 64 * 1024 * 1024

    private val parityDir: File by lazy { findParityDir() }

    private val parser: Yaml = Yaml(LoaderOptions().apply { codePointLimit = MAX_FIXTURE_CHARS })

    private fun findParityDir(): File {
        var dir: File? = File(".").absoluteFile
        var found: File? = null
        while (dir != null && found == null) {
            val candidate = File(dir, "core-engine/src/test/resources/parity")
            if (candidate.isDirectory) found = candidate
            dir = dir.parentFile
        }
        return requireNotNull(found) { "parity fixtures not found above ${File(".").absolutePath}" }
    }

    /** `_geometry/meta.json` — `squareRegions`, `cropBoxes`, `homographies`. */
    fun geometryMeta(): Map<String, Any?> = map(parser.load<Any>(File(parityDir, "_geometry/meta.json").readText()))

    /** One JSON-lines fixture below `parity/`, e.g. `_geometry/resolve_corners.jsonl`. */
    fun jsonl(path: String): List<Map<String, Any?>> =
        File(parityDir, path)
            .readLines()
            .filter { it.isNotBlank() }
            .map { map(parser.load<Any>(it)) }

    /** A raw (NOT delta-coded) gzipped gray plane, e.g. `_geometry/planes/clear.gray.bin.gz`. */
    fun plane(path: String): ByteArray {
        val out = ByteArrayOutputStream()
        GZIPInputStream(File(parityDir, path).inputStream()).use { it.copyTo(out) }
        return out.toByteArray()
    }

    /** Fixture floats: `|e - a| <= 1e-4 * max(1, |e|)`. */
    fun close(
        expected: Double,
        actual: Double,
    ): Boolean = abs(expected - actual) <= REL_TOL * maxOf(1.0, abs(expected))

    /** Checked re-typing of a parsed JSON object — no unchecked cast, no `@Suppress`. */
    fun map(value: Any?): Map<String, Any?> {
        val out = LinkedHashMap<String, Any?>()
        (value as Map<*, *>).forEach { (k, v) -> out[k.toString()] = v }
        return out
    }

    fun list(value: Any?): List<Any?> = (value as List<*>).toList()

    fun num(value: Any?): Double = (value as Number).toDouble()

    fun ints(value: Any?): List<Int> = list(value).map { num(it).toInt() }

    fun point(value: Any?): DoubleArray {
        val xy = list(value)
        return doubleArrayOf(num(xy[0]), num(xy[1]))
    }
}
