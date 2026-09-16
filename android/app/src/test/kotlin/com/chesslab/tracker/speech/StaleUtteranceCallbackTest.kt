package com.chesslab.tracker.speech

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Der unterbrochene Spruch meldet trotzdem fertig — `UtteranceProgressListener.onStop` ruft
 * `onDone`. Diese Meldung gehoert ihm, nicht dem Alarm, der seinen Platz uebernommen hat.
 */
class StaleUtteranceCallbackTest {
    private val spoken = mutableListOf<Pair<String, Boolean>>()
    private val gen = mutableListOf<Int>()
    private val queue =
        UtteranceQueue(max = 4, summary = { "und $it weitere" }) { text, flush, at ->
            spoken += text to flush
            gen += at
        }

    /**
     * Die Reihenfolge ist ein Plattformdetail, das sich hier nicht messen laesst — also muessen
     * BEIDE Ausgaenge halten. Kommt die alte Meldung spaet, darf sie den Alarm nicht freigeben.
     */
    @Test
    fun aLateCallbackFromTheInterruptedUtteranceDoesNotFreeTheAlarmsSlot() {
        queue.offer("Springer f3")
        val stale = gen.last()
        queue.flush("Stellung verloren")

        queue.done(stale)

        assertFalse(queue.idle, "der Alarm spricht noch — sein Platz darf nicht frei melden")
        assertTrue(spoken.last() == "Stellung verloren" to true, spoken.toString())
    }

    /** Und kommt sie frueh, ist sie ohnehin harmlos — `clear` hat den Platz schon geraeumt. */
    @Test
    fun anEarlyCallbackIsHarmlessToo() {
        queue.offer("Springer f3")
        val stale = gen.last()

        queue.done(stale)
        queue.flush("Stellung verloren")

        assertFalse(queue.idle)
    }

    /** Der Alarm selbst gibt seinen Platz sehr wohl frei — sonst haelt der Fokus fuer immer. */
    @Test
    fun theAlarmsOwnCallbackStillFreesTheSlot() {
        queue.offer("Springer f3")
        queue.flush("Stellung verloren")

        queue.done(gen.last())

        assertTrue(queue.idle, "ohne das haelt `SpeechEngine` den Audio-Fokus bis zum Ende")
    }
}
