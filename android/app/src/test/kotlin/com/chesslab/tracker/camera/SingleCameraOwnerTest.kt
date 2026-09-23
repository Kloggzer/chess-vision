package com.chesslab.tracker.camera

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/** **Genau EIN Kamerabesitzer**: ein zweites Binding fror den Feed beim Tab-Wechsel tot. Ausserhalb von
 *  [OWNER] ist CameraX' Bindungs-API Prosa. */
class SingleCameraOwnerTest {
    @Test
    fun theGuardCanSeeTheSources() {
        assertTrue(sources().size > MIN_SOURCES, "found ${sources().size} sources under ${ROOT.absolutePath}")
    }

    @Test
    fun onlyTrackerCameraBindsTheDevice() {
        val offenders =
            sources()
                .filterNot { it.toRelativeString(ROOT).replace(File.separatorChar, '/') == OWNER }
                .flatMap { file -> findings(file) }
        assertEquals(
            emptyList<String>(),
            offenders,
            "Nur $OWNER darf die Kamera binden — ein zweites Binding fror den Feed ein:\n" +
                offenders.joinToString("\n"),
        )
    }

    /** Die Gegenprobe: eine eingepflanzte Zeile MUSS auffallen. */
    @Test
    fun theGuardWouldCatchASecondBinding() {
        assertTrue(offends("        provider.bindToLifecycle(owner, selector, analysis)"))
        assertTrue(offends("import androidx.camera.lifecycle.ProcessCameraProvider"))
        assertTrue(!offends("// a second ProcessCameraProvider binding froze the feed"), "ein Kommentar ist keine Bindung")
        assertTrue(!offends(" * exactly one `ProcessCameraProvider` binding may exist"), "und Prosa im KDoc auch nicht")
    }

    private fun findings(file: File): List<String> =
        file
            .readLines()
            .withIndex()
            .filter { (_, line) -> offends(line) }
            .map { (index, line) -> "${file.path}:${index + 1}  ${line.trim()}" }
}

private fun offends(line: String): Boolean {
    val text = line.trimStart()
    if (text.startsWith("//") || text.startsWith("*") || text.startsWith("/*")) return false
    return BINDING.containsMatchIn(line)
}

private fun sources(): List<File> = ROOT.walkTopDown().filter { it.extension == "kt" }.toList()

private const val OWNER = "camera/TrackerCamera.kt"

/** Nahe null heisst, der Lauf hat die Quellen verfehlt. */
private const val MIN_SOURCES = 80

private val ROOT = File("src/main/kotlin/com/chesslab/tracker")

private val BINDING = Regex("""\bProcessCameraProvider\b|\bbindToLifecycle\s*\(""")
