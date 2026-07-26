package com.chesslab.tracker.speech.ui

import android.content.Intent
import android.speech.tts.TextToSpeech
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.SettingsHost
import com.chesslab.tracker.speech.MovePhrase
import com.chesslab.tracker.speech.SpeechState
import com.chesslab.tracker.speech.SpeechVerbosity
import com.chesslab.tracker.speech.androidSpeechEngine
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.settings.Card
import com.chesslab.tracker.ui.settings.SectionButton
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted

/** The languages with a hand-written vocabulary in `MovePhrase`; anything else speaks English. */
private val LANGUAGES = listOf("English" to "en-US", "Deutsch" to "de-DE")

/**
 * Speech is off until the user turns it on here, and this screen is the only place that says a
 * sentence on demand — the test button is the only way to find out that the device has no voice
 * data for a language before a game depends on it.
 */
@Composable
fun SpeechSettingsScreen(onBack: () -> Unit) {
    val repository by SettingsHost.repository.collectAsStateWithLifecycle()
    val bound = repository
    val context = LocalContext.current
    // Its own engine: the announcer's belongs to the service and must not be flushed mid-game.
    val preview = remember { androidSpeechEngine(context) }
    DisposableEffect(preview) { onDispose { preview.close() } }
    val state by preview.state.collectAsStateWithLifecycle()

    ChesslabScaffold("Spoken moves", onBack) { bars ->
        Column(
            Modifier.fillMaxSize().padding(bars).padding(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (bound == null) {
                Text("The tracker service is not running yet.", color = OnSurfaceMuted)
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
                    SectionButton("Install voice data") {
                        context.startActivity(
                            Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                        )
                    }
                }
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
    Card {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Announce moves", style = MaterialTheme.typography.labelLarge, color = OnSurface)
            Switch(checked = app.speechEnabled, onCheckedChange = { onChange(app.copy(speechEnabled = it)) })
        }
        Text(
            "Stays silent while the phone is on silent, vibrate or Do-Not-Disturb, and while the " +
                "illegal-move alarm is latched — a tracker that narrates a board it no longer believes is worse than a quiet one.",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
    }
    Card {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Announce alarms", style = MaterialTheme.typography.labelLarge, color = OnSurface)
            Switch(checked = app.speechAnnounceAlarms, onCheckedChange = { onChange(app.copy(speechAnnounceAlarms = it)) })
        }
    }
    Card {
        Text("Language", style = MaterialTheme.typography.labelLarge, color = OnSurface)
        Chips(LANGUAGES, app.speechLanguage) { onChange(app.copy(speechLanguage = it)) }
    }
    Card {
        Text("Verbosity", style = MaterialTheme.typography.labelLarge, color = OnSurface)
        Chips(SpeechVerbosity.entries.map { it.label to it }, app.speechVerbosity) { onChange(app.copy(speechVerbosity = it)) }
    }
    Card {
        Text(speechStateText(state), style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
        SectionButton("Say a test move") { onTest() }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun <T> Chips(
    options: List<Pair<String, T>>,
    selected: T,
    onSelect: (T) -> Unit,
) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        options.forEach { (label, value) ->
            FilterChip(
                selected = value == selected,
                onClick = { onSelect(value) },
                label = { Text(label, style = MaterialTheme.typography.labelMedium) },
            )
        }
    }
}
