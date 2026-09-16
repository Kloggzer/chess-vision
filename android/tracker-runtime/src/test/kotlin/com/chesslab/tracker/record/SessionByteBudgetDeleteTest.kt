package com.chesslab.tracker.record

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/**
 * The size cap's spent counter against the only remedy the user has for it: deleting recordings.
 */
class SessionByteBudgetDeleteTest {
    @TempDir
    lateinit var root: File

    @Test
    fun `deleting a session gives its bytes back to the budget`() {
        File(root, "20260916-101010").apply { mkdirs() }.let { File(it, "video.mp4").writeText("x".repeat(4096)) }
        val store = SessionStore(root)
        val budget = SessionByteBudget(store)
        val before = budget.spent()

        store.delete("20260916-101010")

        assertEquals(store.totalBytes(), budget.spent(), "spent() still charges $before bytes that are no longer on disk")
    }
}
