package com.chesslab.tracker.settings

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * Every `TrackerConfig` field has a Knob, and every Knob a field.
 *
 * The catalog is the ONLY persistence path — a field without a knob is a setting the phone
 * silently drops on the round-trip, and nothing else in the build would say so: the codec
 * tolerates missing keys by design (they decode to defaults). Written 2026-08-14 while chasing
 * exactly that suspicion against `confirmFramesOverride`; the knob turned out to exist, and this
 * test is what makes the answer a compile-adjacent fact instead of a manual count. Verified to go
 * RED when the `confirmFramesOverride` row is deleted from [KNOBS], and green as committed.
 *
 * Field enumeration without kotlin-reflect: a data class's `toString()` prints every CONSTRUCTOR
 * property as `name=value`, which is exactly the set a knob can persist. `detSize` is derived
 * (`boardSize * detectScale`, a body property) — it never appears in `toString()` and correctly
 * has no knob; it is named below so that the day it becomes a stored field this test states the
 * exemption instead of failing cryptically.
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
