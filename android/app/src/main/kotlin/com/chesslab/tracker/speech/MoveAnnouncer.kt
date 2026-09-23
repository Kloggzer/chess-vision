package com.chesslab.tracker.speech

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch

/** Never on the analyzer, pipeline or observer thread: `TextToSpeech.speak` is IPC. While the alarm is
 *  latched only the alarm is spoken — the engine no longer believes the board — and the queue is dropped. */
class MoveAnnouncer(
    private val scope: CoroutineScope,
    private val speaker: Speaker,
    private val settings: SettingsRepository,
    /** The app's own share of "move played -> move heard", between the engine's state timeline and the synthesis. */
    private val onQueued: (String, Long) -> Unit = { _, _ -> },
) {
    private var latched: String? = null
    private var job: Job? = null
    private var spoken: String? = null

    fun attach(events: Flow<TrackerEvent>) {
        job = scope.launch(Dispatchers.Default) { events.collect(::onEvent) }
    }

    fun close() {
        job?.cancel()
        speaker.close()
    }

    private fun onEvent(event: TrackerEvent) {
        val app = settings.appSettings.value
        // Ohne das sprach eine en-US-Stimme deutsche Woerter.
        if (app.speechEnabled && app.speechLanguage != spoken) {
            spoken = app.speechLanguage
            speaker.setLanguage(app.speechLanguage)
        }
        // Der Latch laeuft AUCH bei stummer Stimme: ein verschlucktes AlarmCleared liess ihn fuer den Rest des
        // Prozesses stehen und verwarf jeden spaeteren Zug lautlos.
        when (event) {
            is TrackerEvent.Alarm -> onAlarm(event, app)
            is TrackerEvent.AlarmCleared -> onCleared(app)
            is TrackerEvent.MoveCommitted -> if (app.speechEnabled && latched == null) announce(event, app)
            is TrackerEvent.SequenceCommitted -> if (app.speechEnabled) onSequence(event, app)
            else -> Unit
        }
    }

    private fun announce(
        event: TrackerEvent.MoveCommitted,
        app: AppSettings,
    ) {
        val started = System.currentTimeMillis()
        speaker.say(phrase(event.san, ply(event.fenAfter), app))
        onQueued(event.san, System.currentTimeMillis() - started)
    }

    private fun onAlarm(
        alarm: TrackerEvent.Alarm,
        app: AppSettings,
    ) {
        speaker.dropPending()
        // Derselbe Grund ohne zwischenzeitliches Clear ist dieselbe Nachricht zweimal.
        val news = "${alarm.kind}/${alarm.reason}"
        if (latched == news || !app.speechAnnounceAlarms || !app.speechEnabled) {
            latched = news
            return
        }
        latched = news
        // Nur der Grund: der geratene Zug kam durch den SAN-Ansager als "king e1->f1 illegal move suspec ted" heraus.
        speaker.say(AlarmPhrase.of(alarm.reason, app.speechLanguage), flush = true)
    }

    private fun onCleared(app: AppSettings) {
        if (latched == null) return
        latched = null
        if (app.speechAnnounceAlarms && app.speechEnabled) speaker.say(AlarmPhrase.restored(app.speechLanguage))
    }

    private fun onSequence(
        event: TrackerEvent.SequenceCommitted,
        app: AppSettings,
    ) {
        if (latched != null || event.sans.isEmpty()) return
        val last = ply(event.fenAfter)
        val text =
            event.sans
                .mapIndexed { i, san ->
                    // Only the parity is used; the offset keeps it positive for the earlier plies.
                    phrase(san, last + i - event.sans.lastIndex + event.sans.size * 2, app)
                }.joinToString(" ${MovePhrase.and(app.speechLanguage)} ")
        speaker.say(text)
    }

    private fun phrase(
        san: String,
        ply: Int,
        app: AppSettings,
    ) = MovePhrase.of(san, ply, app.speechVerbosity, app.speechLanguage)

    /** The FEN after the move names the side to move NEXT, so "b" means White just played. */
    private fun ply(fenAfter: String): Int = if (fenAfter.contains(" b ")) 1 else 2
}
