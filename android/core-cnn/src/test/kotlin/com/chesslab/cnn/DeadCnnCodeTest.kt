package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/** Every `allSquares()` resolves to `com.chesslab.geometry.allSquares`; a second same-named copy
 *  in `:core-cnn` for one crop-order invariant is a drift hazard, not an API. */
class DeadCnnCodeTest {
    @Test
    fun theCnnCopyOfAllSquaresIsGone() {
        val android = File("..").canonicalFile
        val sources =
            android
                .listFiles { f: File -> f.isDirectory }
                .orEmpty()
                .flatMap { module -> SOURCE_SETS.map { File(module, it) } }
                .filter { it.isDirectory }
                .flatMap { it.walkTopDown().filter { f -> f.isFile && f.extension == "kt" }.toList() }
        val declaration = sources.single { it.name == "Expected.kt" && it.path.contains("core-cnn") }
        // A caller either imports the cnn spelling, or sits in package `com.chesslab.cnn` where the bare name binds to it.
        val callers =
            sources.filter { file ->
                if (file == declaration || file.name == "DeadCnnCodeTest.kt") return@filter false
                val text = file.readText()
                text.contains("import com.chesslab.cnn.allSquares") ||
                    (text.contains("package com.chesslab.cnn") && text.contains("allSquares("))
            }
        assertTrue(
            callers.isEmpty(),
            "unexpected caller(s), the finding is stale: ${callers.map { it.name }}",
        )
        assertTrue(
            !declaration.readText().contains("fun allSquares()"),
            "core-cnn/.../Expected.kt:16 still declares `fun allSquares()`, and ${sources.size} scanned " +
                "sources contain no caller for it — the fix is to delete it and keep the single " +
                "com.chesslab.geometry.allSquares.",
        )
    }

    private companion object {
        val SOURCE_SETS = listOf("src/main/kotlin", "src/test/kotlin", "src/debug/kotlin", "src/testFixtures/kotlin")
    }
}
