package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/**
 * Wirkungsloser Code, nachgewiesen ueber alle Aufrufer im Repo, Tests eingeschlossen: jeder Name
 * hier wird geschrieben oder berechnet und nirgends gelesen. Der Fix ist Loeschen — dann faellt
 * auch der Eintrag aus dieser Liste.
 */
class DeadEngineCodeTest {
    @Test
    fun noWriteOnlySymbolsSurviveInTheEngine() {
        val root = File("src/main/kotlin")
        assertTrue(root.isDirectory, "expected engine sources at ${root.absolutePath}")
        val sources = root.walkTopDown().filter { it.isFile && it.extension == "kt" }.toList()
        val alive =
            DEAD.filter { name ->
                sources.any { file -> file.readText().contains(name) }
            }
        assertTrue(alive.isEmpty(), "declared but never read by anything: ${alive.joinToString(", ")}")
    }

    private companion object {
        val DEAD =
            listOf(
                // EngineState: nur in `clearReferenceState` zurueckgesetzt, nie gelesen.
                "occlWhitelist",
                "occludedSince",
                // Evidence.kt rechnet `topStructVals` je Detektionsbild; kein Konsument im Produkt.
                "structVals",
                // Taint.kt: Konstante ohne Leser, das KDoc behauptet einen.
                "P_OCCLUDED_THR",
                // board/Moves.kt: der benutzte `sansOf` ist der Namensvetter in `:app`.
                "sansOf",
                // board/Reading.kt: der Verdeckungspfad ging mit der Stillstands-Engine.
                "coveredSquares",
            )
    }
}
