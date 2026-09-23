package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.OpenCvGate
import com.chesslab.tracker.camera.DeliveredSize
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import java.util.concurrent.atomic.AtomicInteger

/** Ein Wurf hinter der Detection verkeilte das Alignment: ein `finally` reicht NICHT, der Wurf bricht den
 *  Scope ab (`docs/bug-audit-2026-09-13.md`). */
@EnabledIf(OpenCvGate.REF)
class LiveAlignWedgeBugTest {
    @Test
    fun aConsumerThatThrowsDoesNotWedgeEveryLaterAlign() {
        val aligns = AtomicInteger()
        val align =
            LiveAlign(
                CoroutineScope(Dispatchers.Unconfined),
                { BoardGeometry(boardSize = BOARD_SIZE) },
                { TrackerConfig().copy(alignEvery = 1) },
                {
                    // Der Verbraucher zaehlt, nicht `geometry()`: das ruft ein Align zweimal.
                    aligns.incrementAndGet()
                    error("the consumer blew up")
                },
                dispatcher = Dispatchers.Unconfined,
            )
        val delivered = DeliveredSize(MARKER_CANVAS, MARKER_CANVAS, 0)

        runCatching { align.maybeAlign(MarkerFrames, delivered) }
        val afterFirst = aligns.get()
        runCatching { align.maybeAlign(MarkerFrames, delivered) }

        assertEquals(
            afterFirst + 1,
            aligns.get(),
            "the second align never started: the first left `inFlight` set because the throw skipped " +
                "both the release and the reset — live alignment is dead for the rest of the session",
        )
    }

    private companion object {
        const val BOARD_SIZE = 320
    }
}
