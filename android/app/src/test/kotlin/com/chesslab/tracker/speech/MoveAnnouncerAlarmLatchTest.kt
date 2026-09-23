package com.chesslab.tracker.speech

import com.chesslab.engine.api.AlarmReason
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.MemoryStore
import com.chesslab.tracker.settings.SettingsRepository
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeoutOrNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.Collections

private const val AWAIT_MS = 5_000L

private const val FEN_AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"

private class LatchSpeaker : Speaker {
    val said: MutableList<String> = Collections.synchronizedList(mutableListOf())

    override fun say(
        text: String,
        flush: Boolean,
    ) {
        said += text
    }

    override fun dropPending() = Unit

    override fun close() = Unit
}

/** The latch is the only state carried between events, and only `AlarmCleared` releases it. */
class MoveAnnouncerAlarmLatchTest {
    @Test
    fun theAlarmLatchIsStillClearedWhenSpeechWasOffWhileTheAlarmWentAway() {
        val announcerScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
        val repositoryScope = CoroutineScope(Dispatchers.Unconfined + SupervisorJob())
        val settings = SettingsRepository(MemoryStore(), repositoryScope)
        val speaker = LatchSpeaker()
        val on = AppSettings(speechEnabled = true, speechAnnounceAlarms = true)
        settings.updateApp(on)
        val done = CompletableDeferred<Unit>()
        // `emit` on a cold flow suspends until the handler returned, so each settings flip lands between two events.
        val events: Flow<TrackerEvent> =
            flow {
                emit(TrackerEvent.Alarm("illegal_move", listOf("e2"), null, null, AlarmReason.NOT_LEGAL))
                settings.updateApp(on.copy(speechEnabled = false))
                emit(TrackerEvent.AlarmCleared("resolved"))
                settings.updateApp(on)
                emit(TrackerEvent.MoveCommitted("e2e4", "e4", FEN_AFTER_E4, "diff", false))
                done.complete(Unit)
            }
        val announcer = MoveAnnouncer(announcerScope, speaker, settings)

        announcer.attach(events)
        val drained = runBlocking { withTimeoutOrNull(AWAIT_MS) { done.await() } }
        announcer.close()
        announcerScope.cancel()
        repositoryScope.cancel()

        assertTrue(drained != null, "the event flow never drained within $AWAIT_MS ms")
        val expected = MovePhrase.of("e4", 1, on.speechVerbosity, on.speechLanguage)
        assertTrue(
            speaker.said.contains(expected),
            "an AlarmCleared swallowed while speech was off keeps `latched` set for the session: " +
                "expected <$expected> among ${speaker.said}",
        )
    }
}
