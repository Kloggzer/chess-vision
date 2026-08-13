package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class AlignmentMarkerPrepassTest {
    @Test
    fun `selector mirrors video-time frame bus cadence after locate and stride`() {
        val selector = PublishedFrameSelector(skipDecoded = 5, stride = 2, fps = 30.0)

        val kept = (0L until 30L).filter(selector::keep)

        assertEquals(listOf(11L, 17L, 23L, 29L), kept)
    }
}
