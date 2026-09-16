package com.chesslab.tracker.speech

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Records what reached the platform and hands back the completion callbacks, one at a time. */
private class FakeTts(
    private val language: SpeechState = SpeechState.Ready("en-US"),
) : Tts {
    val spoken = mutableListOf<Pair<String, Boolean>>()
    val pending = ArrayDeque<() -> Unit>()
    var shutdowns = 0

    override fun setLanguage(tag: String) = language

    override fun speak(
        text: String,
        flush: Boolean,
        onDone: () -> Unit,
    ) {
        spoken += text to flush
        pending.addLast(onDone)
    }

    override fun shutdown() {
        shutdowns++
    }

    fun finishAll() {
        while (pending.isNotEmpty()) pending.removeFirst().invoke()
    }
}

private class FakeSilence(
    var silent: Boolean = false,
    var focus: Boolean = true,
) : Silence {
    var abandons = 0

    override fun silenced() = silent

    override fun requestFocus() = focus

    override fun abandonFocus() {
        abandons++
    }
}

class SpeechEngineTest {
    private fun engine(
        silence: FakeSilence,
        tts: FakeTts?,
    ): Pair<SpeechEngine, () -> Int> {
        var opens = 0
        val e =
            SpeechEngine(silence) {
                opens++
                tts
            }
        return e to { opens }
    }

    @Test
    fun silentModeDropsUtterance() {
        val tts = FakeTts()
        val (engine, opens) = engine(FakeSilence(silent = true), tts)
        engine.say("Knight f3")
        assertTrue(tts.spoken.isEmpty())
        // And the engine is not even opened: a silenced phone never binds the TTS service.
        assertEquals(0, opens())
    }

    /** Do-Not-Disturb and the ringer switch are the same decision, made by one pure function. */
    @Test
    fun dndDropsUtterance() {
        val normal = 2 // AudioManager.RINGER_MODE_NORMAL
        val vibrate = 1 // AudioManager.RINGER_MODE_VIBRATE
        val filterAll = 1 // NotificationManager.INTERRUPTION_FILTER_ALL
        val filterPriority = 2 // NotificationManager.INTERRUPTION_FILTER_PRIORITY
        assertFalse(silencedBy(normal, filterAll))
        assertTrue(silencedBy(normal, filterPriority))
        assertTrue(silencedBy(vibrate, filterAll))
    }

    @Test
    fun deniedAudioFocusDropsUtterance() {
        val tts = FakeTts()
        val (engine, opens) = engine(FakeSilence(focus = false), tts)
        engine.say("Knight f3")
        assertTrue(tts.spoken.isEmpty())
        assertEquals(0, opens())
    }

    @Test
    fun focusIsAbandonedWhenTheQueueDrains() {
        val silence = FakeSilence()
        val tts = FakeTts()
        val (engine, _) = engine(silence, tts)
        engine.say("Knight f3")
        assertEquals(0, silence.abandons)
        tts.finishAll()
        assertEquals(1, silence.abandons)
    }

    @Test
    fun languageMissingIsSurfaced() {
        val tts = FakeTts(SpeechState.LanguageMissing("de-DE"))
        val (engine, _) = engine(FakeSilence(), tts)
        engine.setLanguage("de-DE")
        engine.say("Springer f3")
        // The fallback to Locale.US happens inside AndroidTts; what the engine owes the UI is
        // the state, so the settings screen can offer the voice-data intent.
        assertEquals(SpeechState.LanguageMissing("de-DE"), engine.state.value)
        assertEquals(1, tts.spoken.size)
    }

    @Test
    fun aMissingEngineFailsLoudlyInsteadOfSilently() {
        val (engine, _) = engine(FakeSilence(), null)
        engine.say("Knight f3")
        assertTrue(engine.state.value is SpeechState.Failed)
    }

    /** The focus is taken BEFORE the engine is opened, so the path that never speaks must give it back. */
    @Test
    fun aMissingEngineGivesTheAudioFocusBack() {
        val silence = FakeSilence()
        val (engine, _) = engine(silence, null)
        engine.say("Knight f3")
        assertEquals(
            1,
            silence.abandons,
            "the audio focus was requested and never abandoned: the user's music stays ducked with nothing ever spoken",
        )
    }

    @Test
    fun closeShutsDownAndForgetsTheEngine() {
        val tts = FakeTts()
        val (engine, opens) = engine(FakeSilence(), tts)
        engine.say("Knight f3")
        engine.close()
        assertEquals(1, tts.shutdowns)
        engine.say("Knight f3")
        assertEquals(2, opens())
    }
}

/** The backlog policy, in isolation — it is the part that decides what a listener never hears. */
class UtteranceQueueTest {
    private val out = mutableListOf<Pair<String, Boolean>>()
    private val gen = mutableListOf<Int>()
    private val queue =
        UtteranceQueue(3, { "and $it more moves" }) { text, flush, at ->
            out += text to flush
            gen += at
        }

    /** Die Meldung des GERADE sprechenden Spruchs — der Normalfall. */
    private fun done() = queue.done(gen.last())

    @Test
    fun queueIsBoundedToThree() {
        repeat(10) { queue.offer("m$it") }
        // Only the first is in flight; the rest of the burst is capped at two waiting.
        assertEquals(listOf("m0" to false), out.toList())
        repeat(4) { done() }
        assertEquals(
            listOf("m0", "m8", "m9", "and 7 more moves"),
            out.map { it.first },
        )
        assertTrue(out.none { it.second })
        assertTrue(queue.idle)
    }

    @Test
    fun aQuietGameSpeaksEveryMove() {
        repeat(5) {
            queue.offer("m$it")
            done()
        }
        assertEquals(List(5) { "m$it" }, out.map { it.first })
    }

    @Test
    fun flushDropsTheBacklogAndInterrupts() {
        repeat(10) { queue.offer("m$it") }
        queue.flush("Position mismatch")
        assertEquals("Position mismatch" to true, out.last())
        done()
        // Nothing survives the alarm — not the waiting moves, not the "and N more" summary.
        assertEquals("Position mismatch" to true, out.last())
        assertTrue(queue.idle)
    }

    @Test
    fun droppingWaitingKeepsWhatIsAlreadySpeaking() {
        repeat(10) { queue.offer("m$it") }
        queue.dropWaiting()
        done()
        assertEquals(listOf("m0"), out.map { it.first })
        assertNull(out.map { it.first }.firstOrNull { it.startsWith("and") })
    }
}
