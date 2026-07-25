package com.chesslab.tracker.ui.tracking

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.chesslab.tracker.ui.analysis.EvalBarSlot
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted

/** The tracking route: binds the screen to the service's session and to navigation. */
@Composable
fun TrackingRoute(
    onRecalibrate: () -> Unit,
    viewModel: TrackingViewModel = viewModel(),
) {
    val session by TrackerSessionHost.session.collectAsStateWithLifecycle()
    LaunchedEffect(session) { viewModel.attach(session ?: NoTrackerSession) }
    LaunchedEffect(viewModel) { viewModel.recalibrateRequests.collect { onRecalibrate() } }
    TrackingScreen(viewModel)
}

@Composable
private fun TrackingScreen(viewModel: TrackingViewModel) {
    val ui by viewModel.ui.collectAsStateWithLifecycle()
    val moves by viewModel.moves.collectAsStateWithLifecycle()
    val promotion by viewModel.promotion.collectAsStateWithLifecycle()
    val acceptCnn by viewModel.acceptCnn.collectAsStateWithLifecycle()
    val preview by viewModel.preview.collectAsStateWithLifecycle()
    var showPreview by remember { mutableStateOf(false) }

    Column(
        Modifier.fillMaxSize().padding(horizontal = 14.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        StateHeader(ui)
        // The eval bar is optional, gated and self-contained (07c) — it reads the tracker's status
        // itself and renders nothing when no engine shipped for this ABI.
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            EvalBarSlot()
            BoardCanvas(
                fen = ui.fen,
                modifier = Modifier.weight(1f),
                lastMoveUci = viewModel.lastMoveUci,
                alarmed = ui.boardTinted,
            )
        }
        ui.alarm?.let {
            AlarmCard(
                alarm = it,
                onAcceptCnn = viewModel::onAcceptCnnRequested,
                onUndo = viewModel::onUndo,
                onNewBaseline = viewModel::onNewBaseline,
            )
        }
        MoveList(
            rows = remember(moves) { moveRows(moves) },
            modifier = Modifier.fillMaxWidth().weight(1f),
        )
        TextButton(onClick = { showPreview = !showPreview }) {
            Text(if (showPreview) "Hide camera view" else "Show camera view", color = OnSurfaceMuted)
        }
        if (showPreview) PreviewOverlay(bitmap = preview, overlay = ui.overlay)
        ActionBar(
            onUndo = viewModel::onUndo,
            onResetGame = viewModel::onResetGame,
            onRecalibrate = viewModel::onRecalibrate,
        )
    }

    acceptCnn?.let {
        AcceptCnnDialog(
            preview = it,
            onConfirm = viewModel::onAcceptCnnConfirmed,
            onCancel = viewModel::onAcceptCnnCancelled,
        )
    }
    promotion?.let {
        PromotionDialog(prompt = it, fen = ui.fen, onChoose = viewModel::onPromotionChosen)
    }
}

/** The two things that must be readable from a metre away: what it thinks, and how fast it thinks it. */
@Composable
private fun StateHeader(ui: TrackingUiState) {
    val tone = toneColor(ui.tone)
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(ui.stateText, style = MaterialTheme.typography.displayMedium, color = tone)
            // The fps colour is frozen to the alarm colour while alarmed: the loop is running but
            // no move can commit, and a healthy-looking counter would say otherwise.
            Text(ui.fpsText, style = MaterialTheme.typography.labelMedium, color = tone)
        }
        Text(
            text = ui.infoLine ?: " ",
            style = MaterialTheme.typography.bodyMedium,
            color = if (ui.alarm != null) Danger else OnSurfaceMuted,
            maxLines = 1,
        )
    }
}

private fun toneColor(tone: StateTone): Color =
    when (tone) {
        StateTone.Idle -> OnSurface
        StateTone.Busy -> Busy
        StateTone.Active -> Accent
        StateTone.Alarm -> Danger
    }

/** Undo, Reset game and Recalibrate are three DIFFERENT things (MEMORY: `android-single-camera-owner`). */
@Composable
private fun ActionBar(
    onUndo: () -> Unit,
    onResetGame: () -> Unit,
    onRecalibrate: () -> Unit,
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedButton(onClick = onUndo, modifier = Modifier.weight(1f).heightIn(min = 52.dp)) {
            Text("Undo", style = MaterialTheme.typography.labelLarge)
        }
        OutlinedButton(onClick = onResetGame, modifier = Modifier.weight(1f).heightIn(min = 52.dp)) {
            Text("Reset game", style = MaterialTheme.typography.labelLarge)
        }
        OutlinedButton(onClick = onRecalibrate, modifier = Modifier.weight(1f).heightIn(min = 52.dp)) {
            Text("Recalibrate", style = MaterialTheme.typography.labelLarge)
        }
    }
}
