package com.chesslab.tracker

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/** UTF-8 once read as cp1252 turned an ellipsis into three glyphs; the escapes keep this file clean. */
class MojibakeTest {
    @Test
    fun theGuardCanSeeTheKotlinSources() {
        assertTrue(sources().size > MIN_SOURCES, "found ${sources().size} sources under ${ROOT.absolutePath}")
    }

    @Test
    fun noKotlinSourceCarriesMojibake() {
        val hits =
            sources().flatMap { file ->
                mojibakeLines(file.readText(Charsets.UTF_8)).map { "${file.toRelativeString(ROOT)}:$it" }
            }
        assertTrue(hits.isEmpty(), "Mis-decoded UTF-8, re-type the character:\n" + hits.joinToString("\n"))
    }

    @Test
    fun theDetectorFiresOnAPlantedSequence() {
        assertEquals(listOf(2), mojibakeLines("ok\nval s = \"Loading game\u00e2\u20ac\u00a6\"\n"))
        assertEquals(listOf(1), mojibakeLines("// Gr\u00c3\u00b6\u00c3\u0178e"))
        assertEquals(emptyList<Int>(), mojibakeLines("val s = \"Loading game\u2026 Gr\u00f6\u00dfe \u00e4\u00fc\""))
    }

    private fun sources(): List<File> =
        ROOT
            .walkTopDown()
            .onEnter { it.name !in SKIP }
            .filter { it.extension == "kt" || it.extension == "kts" }
            .toList()
}

internal fun mojibakeLines(text: String): List<Int> =
    text
        .lineSequence()
        .withIndex()
        .filter { (_, line) -> MOJIBAKE.any { it in line } }
        .map { it.index + 1 }
        .toList()

private val MOJIBAKE =
    listOf(
        "\u00e2\u20ac",
        "\u00c3\u00a4",
        "\u00c3\u00b6",
        "\u00c3\u00bc",
        "\u00c3\u0178",
        "\u00c3\u201e",
        "\u00c3\u2013",
        "\u00c3\u0153",
        "\u00c2",
    )

private const val MIN_SOURCES = 400

private val SKIP = setOf("build", "bin", "third_party", ".gradle")

private val ROOT = File("..").canonicalFile
