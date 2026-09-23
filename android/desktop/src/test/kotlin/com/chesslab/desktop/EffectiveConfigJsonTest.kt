package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.settings.KNOBS
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** A dump that drifts from the knob catalog is provenance that lies by omission. */
class EffectiveConfigJsonTest {
    @Test
    fun `the dump carries every knob plus the resolved and derived keys`() {
        val dump = effectiveConfigJson(TrackerConfig(), cnnOn = true)
        val expected = KNOBS.map { it.key }.toSet() + setOf("detSize", "settleFrames", "avgFrames", "confirmFrames")
        assertEquals(emptySet<String>(), expected - dump.keys, "keys missing from the dump")
    }

    @Test
    fun `each knob keeps its native JSON type`() {
        val config =
            TrackerConfig().copy(
                motionThr = 0.25,
                confirmFramesOverride = 3,
                maxChanged = 7,
                cleanCommitsOnly = true,
            )
        val dump = effectiveConfigJson(config, cnnOn = true)
        assertEquals(0.25, dump.getValue("motionThr").jsonPrimitive.double)
        assertEquals(7, dump.getValue("maxChanged").jsonPrimitive.int)
        assertTrue(dump.getValue("cleanCommitsOnly").jsonPrimitive.boolean)
        // OPTIONAL_INT: a set override is an int, an unset one is stated as null, never dropped.
        assertEquals(3, dump.getValue("confirmFramesOverride").jsonPrimitive.int)
        assertEquals(JsonNull, dump.getValue("settleFramesOverride"))
    }

    @Test
    fun `the resolved keys still answer with the cnn-conditional values`() {
        val dump = effectiveConfigJson(TrackerConfig(), cnnOn = false)
        assertEquals(4, dump.getValue("settleFrames").jsonPrimitive.int)
        assertEquals(3, dump.getValue("avgFrames").jsonPrimitive.int)
        assertEquals(2, dump.getValue("confirmFrames").jsonPrimitive.int)
        val sized = effectiveConfigJson(TrackerConfig().copy(boardSize = 1104), cnnOn = true)
        assertEquals(552, sized.getValue("detSize").jsonPrimitive.int)
    }
}
