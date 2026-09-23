package com.chesslab.tracker.speech

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** `UtteranceProgressListener.onStop` ruft `onDone`: die Meldung gehoert dem unterbrochenen Spruch. */
class StaleUtteranceCallbackTest {
    private val spoken = mutableListOf<Pair<String, Boolean>>()
    private val gen = mutableListOf<Int>()
    private val queue =
        UtteranceQueue(max = 4, summary = { "und $it weitere" }) { text, flush, at ->
            spoken += text to flush
            gen += at
        }

    /** Die Reihenfolge ist ein Plattformdetail, hier nicht messbar — also muessen BEIDE Ausgaenge halten. */
    @Test
    fun aLateCallbackFromTheInterruptedUtteranceDoesNotFreeTheAlarmsSlot() {
        queue.offer("Springer f3")
        val stale = gen.last()
        queue.flush("Stellung verloren")

        queue.done(stale)

        assertFalse(queue.idle, "der Alarm spricht noch — sein Platz darf nicht frei melden")
        assertTrue(spoken.last() == "Stellung verloren" to true, spoken.toString())
    }

    @Test
    fun anEarlyCallbackIsHarmlessToo() {
        queue.offer("Springer f3")
        val stale = gen.last()

        queue.done(stale)
        queue.flush("Stellung verloren")

        assertFalse(queue.idle)
    }

    /** Der Alarm gibt seinen Platz sehr wohl frei — sonst haelt der Fokus fuer immer. */
    @Test
    fun theAlarmsOwnCallbackStillFreesTheSlot() {
        queue.offer("Springer f3")
        queue.flush("Stellung verloren")

        queue.done(gen.last())

        assertTrue(queue.idle, "ohne das haelt `SpeechEngine` den Audio-Fokus bis zum Ende")
    }
}
