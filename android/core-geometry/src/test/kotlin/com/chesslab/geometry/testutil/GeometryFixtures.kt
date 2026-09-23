package com.chesslab.geometry.testutil

import org.yaml.snakeyaml.LoaderOptions
import org.yaml.snakeyaml.Yaml
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.zip.GZIPInputStream
import kotlin.math.abs

// The `_geometry/` fixtures live on `:core-engine`'s test classpath, read by walking up from the working
// directory. JSON goes through snakeyaml: a YAML subset, and none of these files uses exponent notation.

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

    fun geometryMeta(): Map<String, Any?> = map(parser.load<Any>(File(parityDir, "_geometry/meta.json").readText()))

    fun jsonObject(path: String): Any? = parser.load<Any>(File(parityDir, path).readText())

    fun jsonl(path: String): List<Map<String, Any?>> =
        File(parityDir, path)
            .readLines()
            .filter { it.isNotBlank() }
            .map { map(parser.load<Any>(it)) }

    /** A raw (NOT delta-coded) gzipped gray plane. */
    fun plane(path: String): ByteArray {
        val out = ByteArrayOutputStream()
        GZIPInputStream(File(parityDir, path).inputStream()).use { it.copyTo(out) }
        return out.toByteArray()
    }

    fun close(
        expected: Double,
        actual: Double,
    ): Boolean = abs(expected - actual) <= REL_TOL * maxOf(1.0, abs(expected))

    fun map(value: Any?): Map<String, Any?> {
        val out = LinkedHashMap<String, Any?>()
        (value as Map<*, *>).forEach { (k, v) -> out[k.toString()] = v }
        return out
    }

    fun list(value: Any?): List<Any?> = (value as List<*>).toList()

    fun num(value: Any?): Double = (value as Number).toDouble()

    fun ints(value: Any?): List<Int> = list(value).map { num(it).toInt() }

    fun doubles(value: Any?): DoubleArray = list(value).map { num(it) }.toDoubleArray()

    fun meshAxes(value: Any?): List<DoubleArray> {
        val lines = map(value)
        return listOf("x", "y", "tx", "ty", "cx", "cy").map { doubles(lines[it]) }
    }

    fun point(value: Any?): DoubleArray {
        val xy = list(value)
        return doubleArrayOf(num(xy[0]), num(xy[1]))
    }
}
