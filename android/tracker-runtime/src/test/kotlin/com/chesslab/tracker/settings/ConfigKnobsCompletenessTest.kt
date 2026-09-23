package com.chesslab.tracker.settings

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * The catalog is the ONLY persistence path: a field without a knob is silently dropped. Fields come
 * from `toString()` (no kotlin-reflect); derived `detSize` is named so its exemption stays explicit.
 */
class ConfigKnobsCompletenessTest {
    private val derived = setOf("detSize")

    private fun fieldNames(): Set<String> =
        Regex("""(\w+)=""")
            .findAll(TrackerConfig().toString())
            .map { it.groupValues[1] }
            .toSet()

    @Test
    fun `every TrackerConfig field has a knob`() {
        val missing = fieldNames() - KNOBS.map { it.key }.toSet() - derived
        assertEquals(emptySet<String>(), missing, "TrackerConfig field(s) without a Knob — a value set on the phone would be lost")
    }

    @Test
    fun `every knob names a TrackerConfig field`() {
        val stale = KNOBS.map { it.key }.toSet() - fieldNames()
        assertEquals(emptySet<String>(), stale, "Knob(s) without a TrackerConfig field — the catalog is stale")
    }
}
