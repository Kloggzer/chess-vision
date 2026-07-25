package com.chesslab.tracker.speech

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.ConfigStore
import com.chesslab.tracker.settings.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.concurrent.Executors
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

private const val FEN_WHITE_MOVED = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
private const val FEN_BLACK_MOVED = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
private const val ANALYZER = "fake-analyzer"

private class RecordingSpeaker : Speaker {
    val said = LinkedBlockingQueue<Triple<String, Boolean, String>>()
    var drops = 0

    override fun say(
        text: String,
        flush: Boolean,
    ) {
        said += Triple(text, flush, Thread.currentThread().name)
    }

    override fun dropPending() {
        drops++
    }

    override fun close() = Unit

    /** Null means "nothing was said" — the assertion most of these tests are really making. */
    fun next(ms: Long = 2000): Triple<String, Boolean, String>? = said.poll(ms, TimeUnit.MILLISECONDS)

    fun nothing() = assertNull(said.poll(300, TimeUnit.MILLISECONDS))
}

private class MemoryStore : ConfigStore {
    private val slots = mutableMapOf<String, String>()

    override suspend fun read(slot: String): String? = slots[slot]

    override suspend fun write(
        slot: String,
        text: String,
    ) {
        slots[slot] = text
    }
}

/**
 * The announcer runs on real threads on purpose: its whole contract is that it does NOT run on the
 * caller's thread, which a test dispatcher would paper over.
 */
class MoveAnnouncerTest {
    private val scope = CoroutineScope(Dispatchers.Default)
    private val settings = SettingsRepository(MemoryStore(), CoroutineScope(Dispatchers.Unconfined)) { }
    private val events = MutableSharedFlow<TrackerEvent>(extraBufferCapacity = 64)
    private val speaker = RecordingSpeaker()
    private val analyzer = Executors.newSingleThreadExecutor { Thread(it, ANALYZER) }

    private fun announcer(app: AppSettings = AppSettings(speechEnabled = true)): MoveAnnouncer {
        settings.updateApp(app)
        val announcer = MoveAnnouncer(scope, speaker, settings)
        announcer.attach(events)
        runBlocking { withTimeout(2000) { events.subscriptionCount.first { it > 0 } } }
        return announcer
    }

    /** Emitting from a thread named like the camera analyzer: nothing may be spoken on it. */
    private fun emit(event: TrackerEvent) = analyzer.submit { check(events.tryEmit(event)) }.get()

    private fun move(
        san: String = "Nf3",
        fen: String = FEN_WHITE_MOVED,
    ) = TrackerEvent.MoveCommitted("g1f3", san, fen, "score", false)

    private fun alarm(kind: String = "cnn_desync") = TrackerEvent.Alarm(kind, listOf("e4", "d5"), null, null)

    @Test
    fun speechIsOffByDefault() {
        var opens = 0
        val engine =
            SpeechEngine(
                object : Silence {
                    override fun silenced() = false

                    override fun requestFocus() = true

                    override fun abandonFocus() = Unit
                },
            ) {
                opens++
                null
            }
        settings.updateApp(AppSettings())
        val announcer = MoveAnnouncer(scope, engine, settings)
        announcer.attach(events)
        runBlocking { withTimeout(2000) { events.subscriptionCount.first { it > 0 } } }
        emit(move())
        Thread.sleep(300)
        // Not merely silent: TextToSpeech is never even constructed.
        assertEquals(0, opens)
        announcer.close()
    }

    @Test
    fun committedMovesAreSpoken() {
        announcer()
        emit(move())
        assertEquals("Knight f3", speaker.next()?.first)
        emit(move("e5", FEN_BLACK_MOVED))
        assertEquals("e5", speaker.next()?.first)
    }

    @Test
    fun announcerDoesNotRunOnAnalyzerThread() {
        announcer()
        emit(move())
        val thread = speaker.next()?.third
        assertNotEquals(ANALYZER, thread)
        assertTrue(thread!!.startsWith("DefaultDispatcher"), thread)
    }

    @Test
    fun sequenceCommittedIsOneUtterance() {
        announcer()
        emit(
            TrackerEvent.SequenceCommitted(
                listOf("e2e4", "e7e5"),
                listOf("e4", "e5"),
                FEN_BLACK_MOVED,
                "recovery",
            ),
        )
        assertEquals("e4 and e5", speaker.next()?.first)
        speaker.nothing()
    }

    @Test
    fun sideComesFromTheFenAfterTheMove() {
        announcer(AppSettings(speechEnabled = true, speechVerbosity = SpeechVerbosity.WORDS_WITH_SIDE))
        emit(move())
        assertEquals("White plays knight f3", speaker.next()?.first)
        emit(move("e5", FEN_BLACK_MOVED))
        assertEquals("Black plays e5", speaker.next()?.first)
    }

    @Test
    fun movesAreNotSpokenWhileAlarmed() {
        announcer()
        emit(alarm())
        assertEquals("Position mismatch: 2 squares disagree", speaker.next()?.first)
        emit(move())
        emit(move("e5", FEN_BLACK_MOVED))
        speaker.nothing()
        // The backlog was dropped at latch time, not merely skipped.
        assertTrue(speaker.drops >= 1)
    }

    @Test
    fun alarmIsAnnouncedOnceWithFlush() {
        announcer()
        emit(alarm())
        assertEquals(true, speaker.next()?.second)
        emit(alarm())
        emit(alarm())
        speaker.nothing()
    }

    @Test
    fun alarmGuessIsSpoken() {
        announcer()
        emit(TrackerEvent.Alarm("illegal", listOf("e4"), "g1f3", "Nf3"))
        assertEquals("Position mismatch: 1 squares disagree, possible move Knight f3", speaker.next()?.first)
    }

    @Test
    fun alarmClearedIsAnnounced() {
        announcer()
        emit(alarm())
        speaker.next()
        emit(TrackerEvent.AlarmCleared("verified"))
        assertEquals("Position restored", speaker.next()?.first)
        // And the tracker is trusted again.
        emit(move())
        assertEquals("Knight f3", speaker.next()?.first)
    }

    @Test
    fun noiseEventsAreSilent() {
        announcer()
        emit(TrackerEvent.Note("hand over the board"))
        emit(TrackerEvent.Stuck("no legal move"))
        emit(TrackerEvent.ReAnchored)
        emit(TrackerEvent.PromotionPending("e7", "e8"))
        speaker.nothing()
    }

    @AfterEach
    fun tearDown() {
        scope.cancel()
        analyzer.shutdownNow()
    }
}
