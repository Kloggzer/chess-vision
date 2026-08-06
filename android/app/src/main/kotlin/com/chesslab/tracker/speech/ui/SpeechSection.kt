package com.chesslab.tracker.speech.ui

import android.content.Intent
import android.speech.tts.TextToSpeech
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.SettingsHost
import com.chesslab.tracker.speech.MovePhrase
import com.chesslab.tracker.speech.SpeechState
import com.chesslab.tracker.speech.SpeechVerbosity
import com.chesslab.tracker.speech.androidSpeechEngine
import com.chesslab.tracker.ui.Card
import com.chesslab.tracker.ui.OutlineAction
import com.chesslab.tracker.ui.settings.PreferenceRow
import com.chesslab.tracker.ui.settings.SwitchPreference
import com.chesslab.tracker.ui.settings.ValuePreference
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space

/**
 * The languages with a hand-written vocabulary in `MovePhrase`; anything else speaks English.
 *
 * Internal because the Settings landing row states the current one in its summary, and a second
 * code→name table over there would be free to disagree with the chips on this page.
 */
internal val SPEECH_LANGUAGES = listOf("English" to "en-US", "Deutsch" to "de-DE")

/**
 * Spoken moves — a Settings subpage since specs/47.
 *
 * Four settings held a sixth of the app's top-level surface as a "Speech" tab, and they were
 * already built out of the app's own `Card` and outline button. Nothing about them changed; only
 * where they are.
 *
 * Speech is off until the user turns it on here, and this is the only place that says a sentence on
 * demand — the test button is the only way to find out that the device has no voice data for a
 * language before a game depends on it.
 */
@Composable
fun SpeechSection() {
    val repository by SettingsHost.repository.collectAsStateWithLifecycle()
    val bound = repository
    val context = LocalContext.current
    // Its own engine: the announcer's belongs to the service and must not be flushed mid-game.
    val preview = remember { androidSpeechEngine(context) }
    DisposableEffect(preview) { onDispose { preview.close() } }
    val state by preview.state.collectAsStateWithLifecycle()

    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Space.sm)) {
        if (bound == null) {
            Text("Reading the stored settings…", color = OnSurfaceMuted)
            return@Column
        }
        val app by bound.appSettings.collectAsStateWithLifecycle()
        Body(app, state, { bound.updateApp(it) }) {
            preview.setLanguage(app.speechLanguage)
            preview.say(MovePhrase.of("Nf3", 1, app.speechVerbosity, app.speechLanguage))
        }
        (state as? SpeechState.LanguageMissing)?.let {
            Card {
                Text("No voice data for ${it.locale} — speaking US English.", color = OnSurfaceMuted)
                OutlineAction("Install voice data", {
                    context.startActivity(
                        Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                    )
                })
            }
        }
    }
}

/** The engine's own state names are jargon; this is what the user can do about each one. */
private fun speechStateText(state: SpeechState): String =
    when (state) {
        is SpeechState.Ready -> "Voice ready."
        is SpeechState.LanguageMissing -> "No voice data for this language — speaking US English."
        is SpeechState.Failed -> "Text-to-speech is unavailable on this device."
        else -> "Starting the voice engine — press the test button once it is ready."
    }

@Composable
private fun Body(
    app: AppSettings,
    state: SpeechState,
    onChange: (AppSettings) -> Unit,
    onTest: () -> Unit,
) {
    SwitchPreference(
        title = "Announce moves",
        summary = "Respects silent mode, Do Not Disturb and tracker alarms",
        checked = app.speechEnabled,
        onCheckedChange = { onChange(app.copy(speechEnabled = it)) },
    )
    SwitchPreference(
        title = "Announce alarms",
        summary = "Speak when the observed board needs attention",
        checked = app.speechAnnounceAlarms,
        onCheckedChange = { onChange(app.copy(speechAnnounceAlarms = it)) },
    )
    ValuePreference(
        title = "Language",
        options = SPEECH_LANGUAGES,
        selected = app.speechLanguage,
        onSelect = { onChange(app.copy(speechLanguage = it)) },
    )
    ValuePreference(
        title = "Detail",
        options = SpeechVerbosity.entries.map { it.label to it },
        selected = app.speechVerbosity,
        onSelect = { onChange(app.copy(speechVerbosity = it)) },
    )
    PreferenceRow(
        title = "Test voice",
        summary = speechStateText(state),
        onClick = onTest,
    )
}
