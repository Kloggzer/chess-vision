package com.chesslab.tracker.ui.tracking

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
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
    val cameraOn by viewModel.cameraOn.collectAsStateWithLifecycle()
    var showPreview by remember { mutableStateOf(false) }

    Column(
        Modifier.fillMaxSize().padding(horizontal = 14.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        StateHeader(ui)
        BoardRow(ui, viewModel.lastMoveUci)
        ui.alarm?.let {
            AlarmCard(
                alarm = it,
                onAcceptCnn = viewModel::onAcceptCnnRequested,
                onUndo = viewModel::onUndo,
                onNewBaseline = viewModel::onNewBaseline,
            )
        }
        // The camera view REPLACES the move list rather than stacking above it: at its 4:3 aspect
        // it did not fit in the leftover space and overdrew the board. While you are aiming the
        // camera the score sheet is not what you are looking at.
        Box(Modifier.fillMaxWidth().weight(1f)) {
            if (showPreview) {
                // No source size: the preview bitmap is a UNIFORMLY downscaled copy of the analyzer
                // frame the corners were measured in (`bgrToBitmap`), so the bitmap's own size is
                // the right divisor. Passing a stale delivered size here would offset the quad.
                PreviewOverlay(
                    bitmap = preview,
                    overlay = ui.overlay,
                    modifier = Modifier.fillMaxSize(),
                    corners = ui.corners,
                )
            } else {
                MoveList(
                    rows = remember(moves) { moveRows(moves) },
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
        ActionBar(
            onUndo = viewModel::onUndo,
            onResetGame = viewModel::onResetGame,
            onRecalibrate = viewModel::onRecalibrate,
            showPreview = showPreview,
            onTogglePreview = { showPreview = !showPreview },
            cameraOn = cameraOn,
            onToggleCamera = viewModel::onToggleCamera,
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

/**
 * The eval bar is optional, gated and self-contained (07c) — it reads the tracker's status itself
 * and renders nothing when no engine shipped for this ABI.
 *
 * `IntrinsicSize.Min` is load-bearing: the bar fills the row's height, so without an intrinsic the
 * row claimed the whole column, the move list collapsed to zero and the action bar was pushed
 * off-screen entirely. The square board decides the height here.
 */
@Composable
private fun BoardRow(
    ui: TrackingUiState,
    lastMoveUci: String?,
) {
    Row(
        Modifier.fillMaxWidth().height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        EvalBarSlot()
        BoardCanvas(
            fen = ui.fen,
            modifier = Modifier.weight(1f),
            lastMoveUci = lastMoveUci,
            alarmed = ui.boardTinted,
        )
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
        // Two lines and an ellipsis: at one hard-clipped line the note ended mid-word, which reads
        // as a rendering bug rather than as a message that is longer than the screen.
        Text(
            text = ui.infoLine ?: " ",
            style = MaterialTheme.typography.bodyMedium,
            color = if (ui.alarm != null) Danger else OnSurfaceMuted,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
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
    showPreview: Boolean,
    onTogglePreview: () -> Unit,
    cameraOn: Boolean,
    onToggleCamera: () -> Unit,
) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ActionButton("Undo", onUndo, Modifier.weight(1f))
            ActionButton("Reset game", onResetGame, Modifier.weight(1f))
            ActionButton("Recalibrate", onRecalibrate, Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            // The off switch says what the camera IS, not what the tap does: the service holds the
            // device for as long as it runs, backgrounded or not, and whether it is being watched
            // is the one thing a person needs off this row.
            ToggleChip(
                selected = cameraOn,
                onClick = onToggleCamera,
                label = if (cameraOn) "Tracking · camera on" else "Stopped · tap to resume",
                modifier = Modifier.weight(1f),
            )
            // The camera view is a diagnostic, off by default (06b) — but a control, not a link.
            ToggleChip(
                selected = showPreview,
                onClick = onTogglePreview,
                label = if (showPreview) "Hide camera view" else "Show camera view",
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun ToggleChip(
    selected: Boolean,
    onClick: () -> Unit,
    label: String,
    modifier: Modifier = Modifier,
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        modifier = modifier.heightIn(min = 44.dp),
        label = {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
    )
}

@Composable
private fun ActionButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    OutlinedButton(onClick = onClick, modifier = modifier.heightIn(min = 52.dp), contentPadding = PaddingValues(4.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge, maxLines = 1)
    }
}
