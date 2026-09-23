package com.chesslab.tracker.pipeline

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

class FrameSizeGuardTest {
    private val warnings = mutableListOf<String>()
    private var regenerations = 0
    private val guard =
        FrameSizeGuard(
            warn = { warnings += it },
            requestRegeneration = { regenerations += 1 },
        )

    /** The note names the DELIVERED size, never the requested one. */
    @Test
    fun `the mismatch is reported from the delivered size, not the requested one`() {
        guard.setProfile("desk", 1280, 720)
        guard.note(1280, 960)
        val mismatch = checkNotNull(guard.mismatch)
        assertEquals(960, mismatch.height)
        assertTrue(mismatch.note.contains("delivers 1280x960"), mismatch.note)
    }

    @Test
    fun `regeneration is retried on every frame until it is resolved`() {
        guard.setProfile("desk", 1280, 720)
        repeat(5) { guard.note(1280, 960) }
        assertEquals(5, regenerations)
        guard.setProfile("desk", 1280, 960)
        repeat(5) { guard.note(1280, 960) }
        assertEquals(5, regenerations)
        assertNull(guard.mismatch)
    }

    @Test
    fun `it warns once per distinct size`() {
        guard.setProfile("desk", 1280, 720)
        repeat(5) { guard.note(1280, 960) }
        assertEquals(1, warnings.size)
        repeat(5) { guard.note(1920, 1080) }
        assertEquals(2, warnings.size)
    }

    @Test
    fun `with no profile yet the note asks for a calibration instead of naming an empty one`() {
        guard.note(1440, 1080)
        val note = checkNotNull(guard.mismatch).note
        assertTrue(note.contains("not calibrated yet"), note)
        assertFalse(note.contains("0x0"), note)
        assertEquals(1, regenerations)
    }

    @Test
    fun `a matching size is a no-op`() {
        guard.setProfile("desk", 1280, 720)
        repeat(3) { guard.note(1280, 720) }
        assertNull(guard.mismatch)
        assertEquals(0, regenerations)
        assertTrue(warnings.isEmpty())
    }

    @Test
    fun `the fallback warning has a production caller or is gone`() {
        val production =
            File("..")
                .canonicalFile
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
            "FrameSizeGuard.setRequested has no production caller: wire it where the camera mode is requested, " +
                "or delete setRequested/requestedW/requestedH and the dead branch with it.",
        )
    }
}
