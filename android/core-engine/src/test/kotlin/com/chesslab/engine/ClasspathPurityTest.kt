package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.io.File

/** Hard rules 1 and 2 of the Android rewrite: chesslib + kotlin-stdlib only, and single-threaded. */
class ClasspathPurityTest {
    @Test
    fun runtimeClasspathHasNoOpenCvOrAndroid() {
        assertThrows<ClassNotFoundException> { Class.forName("org.opencv.core.Mat") }
        assertThrows<ClassNotFoundException> { Class.forName("android.util.Log") }
        // Proves the assertions above check a populated classpath, not an empty one.
        Class.forName("com.github.bhlangonijr.chesslib.Board")
    }

    @Test
    fun engineSourcesAreSingleThreaded() {
        val forbidden = Regex("""\bsynchronized\b|\bAtomic[A-Z]|\bMutex\b|@Volatile""")
        val root = File("src/main/kotlin")
        assertTrue(root.isDirectory, "expected engine sources at ${root.absolutePath}")
        val offenders = mutableListOf<String>()
        root.walkTopDown().filter { it.isFile && it.extension == "kt" }.forEach { file ->
            file.readLines().forEachIndexed { index, line ->
                val trimmed = line.trim()
                if (trimmed.startsWith("//") || trimmed.startsWith("*")) return@forEachIndexed
                if (forbidden.containsMatchIn(line)) {
                    offenders += "${file.path}:${index + 1}: $trimmed"
                }
            }
        }
        assertTrue(offenders.isEmpty(), "concurrency primitives are forbidden in :core-engine\n${offenders.joinToString("\n")}")
    }
}
