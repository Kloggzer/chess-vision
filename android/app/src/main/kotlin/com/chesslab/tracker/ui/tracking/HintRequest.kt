package com.chesslab.tracker.ui.tracking

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import com.chesslab.tracker.analysis.AnalysisOptions
import com.chesslab.tracker.analysis.EngineLane
import com.chesslab.tracker.analysis.EngineService
import com.chesslab.tracker.analysis.MateLineResolver
import com.chesslab.tracker.analysis.ReviewBudget
import com.chesslab.tracker.games.GameSessionController
import com.chesslab.tracker.hints.FenClock
import com.chesslab.tracker.hints.HintHost
import com.chesslab.tracker.hints.HintLine
import com.chesslab.tracker.hints.HintMoment
import com.chesslab.tracker.hints.HintOutcome
import com.chesslab.tracker.hints.HintPhrase
import com.chesslab.tracker.settings.SettingsHost
import com.chesslab.tracker.speech.SpeakerHost
import com.chesslab.tracker.ui.analysis.AnalysisHost
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val FALLBACK_LANGUAGE = "en-US"

fun speechLanguage(): String =
    SettingsHost.repository.value
        ?.appSettings
        ?.value
        ?.speechLanguage ?: FALLBACK_LANGUAGE

/** Stellung, Gate, Alarm und Rueckzieher-Fenster LIVE aus den Fluessen, nie aus einem festgehaltenen Wert. */
@Composable
internal fun rememberHintRequest(
    viewModel: TrackingViewModel,
    games: GameSessionController?,
    analysis: AnalysisHost,
    fen: String,
): () -> Unit {
    val scope = rememberCoroutineScope()
    val clock = remember { FenClock() }
    // Der Stempel muss LAUFEN: gesetzt erst beim Druck gilt jede Stellung als frisch gewechselt.
    LaunchedEffect(fen) { clock.steadyMs(fen) }
    return remember(viewModel, games, analysis) {
        {
            scope.launch {
                val outcome =
                    HintHost.controller.request(
                        moment = { moment(viewModel, games, analysis, clock) },
                        resolveLine = liveLineResolver(analysis.engines) { analysis.settings.value.options },
                    )
                announce(outcome)
            }
        }
    }
}

/** Auf dem LIVE-Prozess der Leiste, also unter demselben `gateBlock`: schlaegt es zu, bricht die Suche ab. */
internal fun liveLineResolver(
    engines: EngineService,
    options: () -> AnalysisOptions,
): suspend (String, String) -> HintLine =
    { position, uci ->
        val budget = options().let { ReviewBudget(threads = it.threads, hashMb = it.hashMb) }
        withContext(Dispatchers.Default) {
            val resolved = MateLineResolver(engines, EngineLane.LIVE, budget).resolve(position, listOf(uci))
            HintLine(resolved.sanLine, resolved.failure)
        }
    }

private fun announce(outcome: HintOutcome) {
    if (outcome is HintOutcome.Ignored) return
    HintPhrase.of(outcome, speechLanguage()).takeIf { it.isNotBlank() }?.let {
        SpeakerHost.speaker?.say(it, flush = true)
    }
}

private fun moment(
    viewModel: TrackingViewModel,
    games: GameSessionController?,
    analysis: AnalysisHost,
    clock: FenClock,
): HintMoment {
    val ui = viewModel.ui.value
    return HintMoment(
        fen = ui.fen,
        recordFen =
            games
                ?.state
                ?.value
                ?.game
                ?.plies
                ?.lastOrNull()
                ?.fenAfter,
        steadyMs = clock.steadyMs(ui.fen),
        alarmed = ui.alarm != null,
        blocked = analysis.block.value,
        result = analysis.result.value,
    )
}
