package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** A replay-relative hook key put every label of 2026-08-16-20-41-33 29 s ahead of its picture. */
class HookIndexTest {
    @Test
    fun `a replay names its frames after the recording, not after its own start`() {
        assertEquals(878, hookIndex(decoded = 878, counted = 0))
        assertEquals(937, hookIndex(decoded = 937, counted = 59))
    }

    @Test
    fun `a live camera has nothing to count from and keeps the counter`() {
        assertEquals(59, hookIndex(decoded = -1, counted = 59))
    }
}
