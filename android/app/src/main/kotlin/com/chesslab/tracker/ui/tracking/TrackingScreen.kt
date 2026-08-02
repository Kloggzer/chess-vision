package com.chesslab.tracker.ui.tracking

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.chesslab.tracker.games.GameSessionState
import com.chesslab.tracker.ui.analysis.EvalBarSlot
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import kotlinx.coroutines.flow.MutableStateFlow

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
    // The live game lives in the service, not in this screen's view model — the same handle the
    // Games tab uses. Reaching for it here is what lets a game be SAVED where it is played.
    val games by GameSessionHost.controller.collectAsStateWithLifecycle()
    val live by (games?.state ?: NO_LIVE_GAME).collectAsStateWithLifecycle()
    var endingGame by remember { mutableStateOf(false) }

    TrackingBody(viewModel, ui, moves, preview, cameraOn) { endingGame = true }

    TrackingDialogs(
        viewModel = viewModel,
        ui = ui,
        promotion = promotion,
        acceptCnn = acceptCnn,
        endingMoves = live.moveCount.takeIf { endingGame },
        onEndSave = {
            games?.endAndSave()
            viewModel.onResetGame()
            endingGame = false
        },
        onEndDiscard = {
            viewModel.onResetGame()
            endingGame = false
        },
        onEndDismiss = { endingGame = false },
    )
}

/** The layout, lifted out so [TrackingScreen] reads as wiring rather than as a wall. */
@Composable
private fun TrackingBody(
    viewModel: TrackingViewModel,
    ui: TrackingUiState,
    moves: List<MoveEntry>,
    preview: android.graphics.Bitmap?,
    cameraOn: Boolean,
    onEndGame: () -> Unit,
) {
    var showPreview by remember { mutableStateOf(false) }
    val lastCommit = viewModel.lastCommit.collectAsStateWithLifecycle().value
    Column(
        Modifier.fillMaxSize().padding(horizontal = 14.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // Everything above the action bar SCROLLS, and the bar itself is measured outside it.
        //
        // A `Column` measures its children in order and hands each what is left. With the bar as an
        // ordinary child, a grown alarm card ate the height, the weighted move list fell to zero,
        // and the bar — measured last — got the remainder: on a real board it rendered 1-2 mm tall
        // and could not be pressed. `heightIn(min = 48.dp)` does not save a child there; a minimum
        // is not a reservation. Giving the scroll region the weight and leaving the bar unweighted
        // inverts that: the bar takes its natural height first and the content yields.
        Column(
            Modifier.weight(1f).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            StateHeader(ui)
            // The camera board takes the BOARD's slot, not the leftover space under it. Both show
            // the same 8x8; when you turn the camera on you are diagnosing, and the picture you
            // need to read square by square is the one from the lens.
            BoardRow(ui, viewModel.lastMoveUci, camera = preview.takeIf { showPreview })
            ui.alarm?.let {
                AlarmCard(
                    alarm = it,
                    onAcceptCnn = viewModel::onAcceptCnnRequested,
                    onUndo = viewModel::onUndo,
                    onNewBaseline = viewModel::onNewBaseline,
                    lastCommit = lastCommit,
                )
            }
            MoveList(rows = remember(moves) { moveRows(moves) }, modifier = Modifier.fillMaxWidth())
        }
        ActionBar(
            onUndo = viewModel::onUndo,
            undoLabel = undoLabel(lastCommit),
            // Resetting a game that has moves USED to throw it away without a word.
            onResetGame = onEndGame,
            onRecalibrate = viewModel::onRecalibrate,
            showPreview = showPreview,
            onTogglePreview = { showPreview = !showPreview },
            cameraOn = cameraOn,
            onToggleCamera = viewModel::onToggleCamera,
            torchOn = viewModel.torchOn.collectAsStateWithLifecycle().value,
            hasTorch = viewModel.hasTorch,
            onToggleTorch = viewModel::onToggleTorch,
        )
    }
}

/** Everything modal on this screen, kept out of the layout so the screen reads as a layout. */
@Composable
private fun TrackingDialogs(
    viewModel: TrackingViewModel,
    ui: TrackingUiState,
    promotion: PromotionPrompt?,
    acceptCnn: AcceptCnnPreview?,
    endingMoves: Int?,
    onEndSave: () -> Unit,
    onEndDiscard: () -> Unit,
    onEndDismiss: () -> Unit,
) {
    endingMoves?.let {
        EndGameDialog(moves = it, onSave = onEndSave, onDiscard = onEndDiscard, onDismiss = onEndDismiss)
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
    camera: android.graphics.Bitmap? = null,
) {
    Row(
        Modifier.fillMaxWidth().height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        EvalBarSlot()
        if (camera != null) {
            BoardPreview(bitmap = camera, overlay = ui.overlay, modifier = Modifier.weight(1f).aspectRatio(1f))
        } else {
            BoardCanvas(
                fen = ui.fen,
                modifier = Modifier.weight(1f),
                lastMoveUci = lastMoveUci,
                alarmed = ui.boardTinted,
            )
        }
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
            // Stacked rather than one long line: the rate and the reason each stay short enough to
            // read at arm's length, which a single "camera 30 fps · not calibrated" does not.
            Column(horizontalAlignment = Alignment.End) {
                // The fps colour is frozen to the alarm colour while alarmed: the loop is running
                // but no move can commit, and a healthy-looking counter would say otherwise.
                Text(ui.fpsText, style = MaterialTheme.typography.labelMedium, color = tone)
                ui.fpsDetail?.let {
                    Text(it, style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted, maxLines = 1)
                }
            }
        }
        // ALWAYS two lines, never one or none. The note is the most volatile string on the screen
        // ("stuck: cnn_desync" -> the two-line "not calibrated yet — tap Recalibrate …"), and it
        // sits above everything: reflowing it shifted the board and the whole action bar under the
        // user's thumb. `minLines` reserves the taller of the two shapes; the ellipsis handles the
        // rest, because at one hard-clipped line the note ended mid-word and read as a bug.
        // Blank while alarmed, and that is not a hole. This note is built to be the NOTIFICATION
        // text (`StatusPublisher`), so under an alarm it reads "Position lost — tracking paused.
        // Open the app to fix it." — an instruction to open the app, printed inside the open app,
        // directly above a card that says the same thing and carries the buttons. The state word
        // above and the card below are the two places that state belongs; three was one too many.
        // The two reserved lines stay, so nothing reflows when the alarm clears.
        Text(
            text = if (ui.alarm != null) " " else ui.infoLine ?: " ",
            style = MaterialTheme.typography.bodyMedium,
            color = OnSurfaceMuted,
            minLines = 2,
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
    undoLabel: String,
    onResetGame: () -> Unit,
    onRecalibrate: () -> Unit,
    showPreview: Boolean,
    onTogglePreview: () -> Unit,
    cameraOn: Boolean,
    onToggleCamera: () -> Unit,
    torchOn: Boolean,
    hasTorch: Boolean,
    onToggleTorch: () -> Unit,
) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            // Not always "Undo": one press unwinds the last COMMIT, and a CNN recovery commits a
            // whole bridge (four plies on 2026-08-02).
            ActionButton(undoLabel, onUndo, Modifier.weight(1f))
            ActionButton("Reset game", onResetGame, Modifier.weight(1f))
            ActionButton("Recalibrate", onRecalibrate, Modifier.weight(1f))
        }
        if (hasTorch) {
            // Its own row and its own sentence: this one re-measures the optics and re-takes the
            // baseline, so it is not the same weight of act as showing the camera view.
            ToggleChip(
                selected = torchOn,
                onClick = onToggleTorch,
                label = if (torchOn) "Light on · tap to switch off" else "Light off · tap to light the board",
                modifier = Modifier.fillMaxWidth(),
            )
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

/**
 * Ending a game where it is PLAYED.
 *
 * "Reset game" used to discard a played game without a word, and the only save action lived on the
 * Games tab — a place you are not looking at while a game is running. Both outcomes are now named,
 * and the destructive one is not the default.
 */
@Composable
private fun EndGameDialog(
    moves: Int,
    onSave: () -> Unit,
    onDiscard: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (moves > 0) "End this game?" else "Start a new game?") },
        text = {
            Text(
                if (moves > 0) {
                    "$moves moves are recorded. Saving keeps them in Games together with this " +
                        "session's frames; discarding throws both away."
                } else {
                    "Nothing is recorded yet. This re-seeds the tracker from the starting position."
                },
            )
        },
        confirmButton = {
            TextButton(onClick = if (moves > 0) onSave else onDiscard) {
                Text(if (moves > 0) "Save & new game" else "New game", color = Accent)
            }
        },
        dismissButton = {
            // Never the default action, and never silent: discarding a played game is the one
            // outcome here that cannot be undone.
            if (moves > 0) {
                TextButton(onClick = onDiscard) { Text("Discard", color = Danger) }
            } else {
                TextButton(onClick = onDismiss) { Text("Cancel", color = OnSurfaceMuted) }
            }
        },
    )
}

private val NO_LIVE_GAME = MutableStateFlow(GameSessionState())
