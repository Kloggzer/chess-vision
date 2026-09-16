package com.chesslab.tracker.speech

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test

/**
 * Der unterbrochene Spruch meldet trotzdem fertig — `UtteranceProgressListener.onStop` ruft
 * `onDone`. Diese Meldung gehoert ihm, nicht dem Alarm, der seinen Platz gerade uebernommen hat.
 */
class StaleUtteranceCallbackTest {
    private val spoken = mutableListOf<Pair<String, Boolean>>()

    private fun queue() = UtteranceQueue(max = 4, summary = { "und $it weitere" }, out = { text, flush -> spoken += text to flush })

    @Disabled(
        "BUG: die Meldung des unterbrochenen Spruchs raeumt den Platz des Alarms, der Audio-Fokus " +
            "faellt mitten in der Ansage. Der Fix braucht eine Generation je Spruch und dreht die " +
            "Zusage von UtteranceQueueTest.flushDropsTheBacklogAndInterrupts um — Verhaltensaenderung.",
    )
    @Test
    fun theInterruptedUtterancesCallbackDoesNotFreeTheAlarmsSlot() {
        val queue = queue()
        queue.offer("Springer f3")
        queue.flush("Stellung verloren")

        queue.done()

        assertFalse(queue.idle, "der Alarm spricht noch — sein Platz darf nicht frei melden")
        assertTrue(spoken.last() == "Stellung verloren" to true, spoken.toString())
    }
}
