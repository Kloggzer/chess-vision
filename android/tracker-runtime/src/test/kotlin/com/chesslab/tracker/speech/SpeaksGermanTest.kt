package com.chesslab.tracker.speech

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SpeaksGermanTest {
    @Test
    fun `every German tag is German, whatever its region or case`() {
        listOf("de", "de-DE", "de-AT", "DE-ch").forEach { assertTrue(speaksGerman(it), it) }
    }

    @Test
    fun `everything else falls back to English`() {
        listOf("en-US", "", "fr", "den").forEach { assertFalse(speaksGerman(it), it) }
    }
}
