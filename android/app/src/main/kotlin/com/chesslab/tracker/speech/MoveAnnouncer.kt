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
        // A re-latch of the same kind without an intervening clear is the same news twice.
        if (latched == alarm.kind || !app.speechAnnounceAlarms) {
            latched = alarm.kind
            return
        }
        latched = alarm.kind
        val guess = alarm.guessSan?.let { ", possible move ${phrase(it, 1, app)}" } ?: ""
        // A refusal's conflicts are the two squares of the move that was thrown out, not squares
        // that disagree — saying "2 squares disagree" would name the wrong thing.
        val what =
            if (alarm.kind == "illegal_move_refused") {
                "Position lost, a move could not be played"
            } else {
                "Position mismatch: ${alarm.conflicts.size} squares disagree"
            }
        speaker.say("$what$guess", flush = true)
    }

    private fun onCleared(app: AppSettings) {
        if (latched == null) return
        latched = null
        if (app.speechAnnounceAlarms) speaker.say("Position restored")
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
                }.joinToString(" and ")
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
