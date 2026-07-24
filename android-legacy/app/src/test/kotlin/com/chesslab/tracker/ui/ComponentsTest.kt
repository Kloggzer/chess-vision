package com.chesslab.tracker.ui

import com.chesslab.engine.api.TrackerState
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * The `:app` module has no Compose UI-test dependency (`ui-test-junit4`), so the
 * StatusPill's colour contract is verified via the pure [statusToneFor] mapping instead
 * of a semantics test, as the phase-01 spec allows.
 */
class ComponentsTest {
    @Test
    fun `waiting and verifying map to info`() {
        assertEquals(StatusTone.INFO, statusToneFor(TrackerState.WAITING_BOARD))
        assertEquals(StatusTone.INFO, statusToneFor(TrackerState.VERIFYING))
    }

    @Test
    fun `tracking is live, occluded is warn, stuck is error`() {
        assertEquals(StatusTone.LIVE, statusToneFor(TrackerState.TRACKING))
        assertEquals(StatusTone.WARN, statusToneFor(TrackerState.OCCLUDED))
        assertEquals(StatusTone.ERROR, statusToneFor(TrackerState.STUCK))
    }

    @Test
    fun `every tracker state has a tone`() {
        TrackerState.entries.forEach { state -> statusToneFor(state) }
    }
}
