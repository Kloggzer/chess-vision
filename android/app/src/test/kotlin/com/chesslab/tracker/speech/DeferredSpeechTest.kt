package com.chesslab.tracker.speech

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.concurrent.CyclicBarrier
import java.util.concurrent.atomic.AtomicInteger
import kotlin.concurrent.thread

/** Written by the TTS init callback (main), read by the announcer (`Default`): the pair must flip TOGETHER. */
class DeferredSpeechTest {
    @Test
    fun `the held utterance survives an init that reports mid-submit`() {
        val gates = Array(ROUNDS) { DeferredSpeech() }
        val spoken = Array(ROUNDS) { AtomicInteger() }
        val round = CyclicBarrier(2)

        val announcer =
            thread {
                repeat(ROUNDS) { i ->
                    round.await()
                    if (gates[i].submit { spoken[i].incrementAndGet() }) spoken[i].incrementAndGet()
                }
            }
        val init =
            thread {
                repeat(ROUNDS) { i ->
                    round.await()
                    gates[i].ready()?.invoke()
                }
            }
        announcer.join()
        init.join()

        val lost = spoken.indices.filter { spoken[it].get() != 1 }
        assertEquals(emptyList<Int>(), lost, "announcements dropped in ${lost.size} of $ROUNDS rounds")
    }

    @Test
    fun `nothing is held once init has reported`() {
        val gate = DeferredSpeech()
        assertFalse(gate.isReady)

        assertEquals(null, gate.ready())

        assertTrue(gate.isReady)
        assertTrue(gate.submit { }, "after init every utterance goes straight out")
    }

    @Test
    fun `a held utterance is handed over exactly once`() {
        val gate = DeferredSpeech()
        assertFalse(gate.submit { })

        assertTrue(gate.ready() != null)
        assertEquals(null, gate.ready(), "a second report must not replay it")
    }

    private companion object {
        const val ROUNDS = 200_000
    }
}
