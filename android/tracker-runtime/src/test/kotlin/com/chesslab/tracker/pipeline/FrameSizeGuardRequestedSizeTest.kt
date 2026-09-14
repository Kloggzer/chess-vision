package com.chesslab.tracker.pipeline

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/**
 * `FrameSizeGuard`'s own header names commit a7dab73 — requested 16:9, device delivered 4:3 — as
 * the reason the fall-back warning exists. The warning needs `requestedW`, and nothing outside a
 * test ever sets it, so on a device it can never fire.
 */
class FrameSizeGuardRequestedSizeTest {
    @Test
    fun theFallbackWarningHasAProductionCallerOrIsGone() {
        val android = File("..").canonicalFile
        val production =
            android
                .listFiles { f: File -> f.isDirectory }
                .orEmpty()
                .map { File(it, "src/main/kotlin") }
                .filter { it.isDirectory }
                .flatMap { it.walkTopDown().filter { f -> f.isFile && f.extension == "kt" }.toList() }
        val guard = production.single { it.name == "FrameSizeGuard.kt" }
        val callers = production.filter { it != guard && it.readText().contains("setRequested") }
        val declared = guard.readText().contains("fun setRequested")
        assertTrue(
            callers.isNotEmpty() || !declared,
            "FrameSizeGuard.setRequested has no production caller in ${production.size} scanned sources — " +
                "`requestedW` stays 0, `fellBack` is always false and the \"driver fell back to its nearest " +
                "supported mode\" warning is unreachable off the test bench. Either wire it where the camera " +
                "mode is requested, or delete setRequested/requestedW/requestedH and the dead branch with it.",
        )
    }
}
