package com.chesslab.tracker.speech

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch

/**
 * Turns tracker events into speech.
 *
 * It collects on [Dispatchers.Default], never on the analyzer, pipeline or ONNX observer thread:
 * the 15 fps budget outranks speech, and `TextToSpeech.speak` is an IPC call into another process.
 *
 * The rule that matters is the alarm. While the illegal-move alarm is latched the engine itself no
 * longer believes the board, so narrating moves would be actively misleading — the alarm is the
 * only thing spoken, and anything queued behind it is dropped rather than delivered late.
 */
class MoveAnnouncer(
    private val scope: CoroutineScope,
    private val speaker: Speaker,
    private val settings: SettingsRepository,
    /**
     * How long the commit waited here before it was handed to the speaker, in ms — the app's own
     * share of "move played -> move heard". The engine's share is the frame loop's state timeline
     * (`chesslabState`) and the speech engine's share is the utterance's synthesis latency; this is
     * the piece in between, and without it the three could not be added up.
     */
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
        if (!app.speechEnabled) return
        // Die Stimme folgt der Einstellung. Ohne das sprach eine en-US-Stimme deutsche Wörter.
        if (app.speechLanguage != spoken) {
            spoken = app.speechLanguage
            speaker.setLanguage(app.speechLanguage)
        }
        when (event) {
            is TrackerEvent.Alarm -> onAlarm(event, app)
            is TrackerEvent.AlarmCleared -> onCleared(app)
            is TrackerEvent.MoveCommitted ->
                if (latched == null) {
                    val started = System.currentTimeMillis()
                    speaker.say(phrase(event.san, ply(event.fenAfter), app))
                    onQueued(event.san, System.currentTimeMillis() - started)
                }
            is TrackerEvent.SequenceCommitted -> onSequence(event, app)
            // Stuck, Note, ReAnchored and PromotionPending are screen business, not speech.
            else -> Unit
        }
    }

    private fun onAlarm(
        alarm: TrackerEvent.Alarm,
        app: AppSettings,
    ) {
        speaker.dropPending()
        // Derselbe Grund ohne zwischenzeitliches Clear ist dieselbe Nachricht zweimal; ein anderer
        // Grund ist neue Nachricht, auch wenn dieselbe Sperre hält.
        val news = "${alarm.kind}/${alarm.reason}"
        if (latched == news || !app.speechAnnounceAlarms) {
            latched = news
            return
        }
        latched = news
        // Nur der Grund. Der geratene Zug lief hier durch den SAN-Ansager und kam als
        // "king e1->f1 illegal move suspec ted" heraus — er steht auf der Karte (User, 2026-08-28).
        speaker.say(AlarmPhrase.of(alarm.reason, app.speechLanguage), flush = true)
    }

    private fun onCleared(app: AppSettings) {
        if (latched == null) return
        latched = null
        if (app.speechAnnounceAlarms) speaker.say(AlarmPhrase.restored(app.speechLanguage))
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
