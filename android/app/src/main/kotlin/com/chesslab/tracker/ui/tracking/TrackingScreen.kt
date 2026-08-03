package com.chesslab.tracker.ui.tracking

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.chesslab.tracker.games.GameSessionState
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.UNKNOWN
import com.chesslab.tracker.service.TrackerRun
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.ConfirmDialog
import com.chesslab.tracker.ui.Figure
import com.chesslab.tracker.ui.OutlineAction
import com.chesslab.tracker.ui.analysis.EvalBarSlot
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.games.gamesDir
import com.chesslab.tracker.ui.review.MoveList
import com.chesslab.tracker.ui.review.SpectatorShareCard
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Touch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.withContext

/** The tracking route: binds the screen to the service's session and to navigation. */
@Composable
fun TrackingRoute(
    onBack: () -> Unit,
    onCamera: () -> Unit,
    viewModel: TrackingViewModel = viewModel(),
) {
    val session by TrackerSessionHost.session.collectAsStateWithLifecycle()
    // The run switch, not the session: between the tap and the service's first callback there is
    // no session and tracking is nevertheless on.
    val running by TrackerRun.running.collectAsStateWithLifecycle()
    LaunchedEffect(session) { viewModel.attach(session ?: NoTrackerSession) }
    LaunchedEffect(running) { viewModel.tracking = running }
    // Recalibrating IS the camera screen in board mode. There used to be a second route for it with
    // byte-identical arguments; an alias is not an intent.
    LaunchedEffect(viewModel) { viewModel.recalibrateRequests.collect { onCamera() } }
    TrackingScreen(viewModel, running, onBack)
}

@Composable
private fun TrackingScreen(
    viewModel: TrackingViewModel,
    running: Boolean,
    onBack: () -> Unit,
) {
    val ui by viewModel.ui.collectAsStateWithLifecycle()
    val promotion by viewModel.promotion.collectAsStateWithLifecycle()
    val acceptCnn by viewModel.acceptCnn.collectAsStateWithLifecycle()
    val preview by viewModel.preview.collectAsStateWithLifecycle()
    val cameraOn by viewModel.cameraOn.collectAsStateWithLifecycle()
    // The live game lives in the service, not in this screen's view model — the same handle Home and
    // the Games screen use. Reaching for it here is what lets a game be SAVED where it is played.
    val games by GameSessionHost.controller.collectAsStateWithLifecycle()
    val live by (games?.state ?: NO_LIVE_GAME).collectAsStateWithLifecycle()
    var endingGame by remember { mutableStateOf(false) }
    var discarding by remember { mutableStateOf(false) }
    var recalibrating by remember { mutableStateOf(false) }
    var showPreview by remember { mutableStateOf(false) }
    var showShare by remember { mutableStateOf(false) }

    ChesslabScaffold(
        title = "Tracking",
        onBack = onBack,
        actions = {
            TrackerMenu(
                viewModel = viewModel,
                cameraOn = cameraOn,
                showPreview = showPreview,
                onTogglePreview = { showPreview = !showPreview },
                onShare = { showShare = true },
            )
        },
    ) { bars ->
        TrackingBody(
            viewModel = viewModel,
            ui = ui,
            game = live.game,
            camera = preview.takeIf { showPreview },
            running = running,
            modifier = Modifier.padding(bars),
            onEndGame = { endingGame = true },
            // Recalibrating replaces the geometry the running game has been tracked against, and
            // there is no way back to the old quad. With no moves committed there is nothing to lose.
            onRecalibrate = { if (live.moveCount > 0) recalibrating = true else viewModel.onRecalibrate() },
        )
    }

    if (showShare) ShareDialog { showShare = false }
    if (recalibrating) {
        ConfirmDialog(
            title = "Recalibrate mid-game?",
            body = "${live.moveCount} moves have been tracked against the current board geometry. " +
                "Fitting a new grid replaces it, and the old one is not kept.",
            verb = "Recalibrate",
            onConfirm = {
                recalibrating = false
                viewModel.onRecalibrate()
            },
            onDismiss = { recalibrating = false },
        )
    }
    if (discarding) {
        ConfirmDialog(
            title = "Discard this game?",
            body = "${live.moveCount} moves and everything recorded for them. This cannot be undone.",
            verb = "Discard",
            onConfirm = {
                discarding = false
                // The record must go too. Resetting only the ENGINE left the discarded game standing
                // in the service, so the next ply was illegal from it and opened a seam inside a game
                // the user had just thrown away.
                games?.discard()
                viewModel.onResetGame()
                endingGame = false
            },
            onDismiss = { discarding = false },
        )
    }
    TrackingDialogs(
        viewModel = viewModel,
        ui = ui,
        promotion = promotion,
        acceptCnn = acceptCnn,
        endingMoves = live.moveCount.takeIf { endingGame },
        onEndSave = { white, black ->
            games?.endAndSave(white, black)
            viewModel.onResetGame()
            endingGame = false
        },
        // With moves on the board this only OPENS the confirmation; with none there is nothing to
        // confirm, and the same callback re-seeds the tracker outright.
        onEndDiscard = {
            if (live.moveCount > 0) {
                discarding = true
            } else {
                games?.discard()
                viewModel.onResetGame()
                endingGame = false
            }
        },
        onEndDismiss = { endingGame = false },
    )
}

/**
 * Everything the action bar used to spend two rows of chips on.
 *
 * The labels are FIXED words with the state beside them in a second `Text`, so `tap-text "Camera
 * view"` keeps working whichever way the toggle stands — a label that changes wording is a control
 * no agent and no smoke test can reach (`CLAUDE.md`).
 */
@Composable
private fun RowScope.TrackerMenu(
    viewModel: TrackingViewModel,
    cameraOn: Boolean,
    showPreview: Boolean,
    onTogglePreview: () -> Unit,
    onShare: () -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    val torchOn by viewModel.torchOn.collectAsStateWithLifecycle()
    IconButton(onClick = { open = true }) {
        Icon(Icons.Filled.MoreVert, contentDescription = "More")
    }
    DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
        MenuToggle("Camera view", showPreview) {
            onTogglePreview()
            open = false
        }
        // The off switch says what the camera IS, not what the tap does: the service holds the
        // device for as long as it runs, backgrounded or not.
        MenuToggle("Tracking camera", cameraOn) {
            viewModel.onToggleCamera()
            open = false
        }
        if (viewModel.hasTorch) {
            // It re-measures the optics and re-takes the baseline; see `TorchControl`.
            MenuToggle("Light", torchOn) {
                viewModel.onToggleTorch()
                open = false
            }
        }
        DropdownMenuItem(text = { Text("Share on Wi-Fi") }, onClick = {
            onShare()
            open = false
        })
    }
}

@Composable
private fun MenuToggle(
    label: String,
    on: Boolean,
    onClick: () -> Unit,
) {
    DropdownMenuItem(
        text = {
            Row(horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
                Text(label)
                Text(if (on) "on" else "off", color = if (on) Accent else OnSurfaceMuted)
            }
        },
        onClick = onClick,
    )
}

/**
 * Putting the board on the Wi-Fi, from the screen that IS the board.
 *
 * This card used to be the whole unique content of a top-level "Spectator" destination whose board
 * and move list were this screen's, from the same `GameView`.
 */
@Composable
private fun ShareDialog(onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Done", color = Accent) } },
        title = { Text("Share on Wi-Fi", color = OnSurface) },
        text = { SpectatorShareCard() },
    )
}

/** The layout, lifted out so [TrackingScreen] reads as wiring rather than as a wall. */
@Composable
private fun TrackingBody(
    viewModel: TrackingViewModel,
    ui: TrackingUiState,
    game: GameView,
    camera: android.graphics.Bitmap?,
    running: Boolean,
    modifier: Modifier = Modifier,
    onEndGame: () -> Unit,
    onRecalibrate: () -> Unit,
) {
    val lastCommit = viewModel.lastCommit.collectAsStateWithLifecycle().value
    Column(
        modifier.fillMaxSize().padding(vertical = Space.sm),
        verticalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        StateHeader(ui)
        // The camera board takes the BOARD's slot, not the leftover space under it. Both show the
        // same 8x8; when you turn the camera on you are diagnosing, and the picture you need to
        // read square by square is the one from the lens.
        BoardRow(ui, game.plies.lastOrNull()?.uci, camera)
        ui.alarm?.let {
            AlarmCard(
                alarm = it,
                onAcceptCnn = viewModel::onAcceptCnnRequested,
                onUndo = viewModel::onUndo,
                onNewBaseline = viewModel::onNewBaseline,
                lastCommit = lastCommit,
            )
        }
        Box(Modifier.fillMaxWidth().weight(1f)) {
            // The same list the review screen and the LAN page render, from the same source.
            MoveList(game = game, modifier = Modifier.fillMaxSize())
        }
        // Not tracking is a legitimate state of this screen, not an error: the board keeps the
        // position it last had and the only control left is the one that would change that.
        if (running) {
            ActionBar(
                onUndo = viewModel::onUndo,
                undoLabel = undoLabel(lastCommit),
                // Ending a game that has moves USED to throw it away without a word.
                onEndGame = onEndGame,
                onRecalibrate = onRecalibrate,
            )
        }
        TrackingSwitch(running)
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
    onEndSave: (String, String) -> Unit,
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
        horizontalArrangement = Arrangement.spacedBy(Space.sm),
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
    Column(verticalArrangement = Arrangement.spacedBy(Space.hair)) {
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
                Figure(ui.fpsText, tone)
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
        // directly above a card that says the same thing and carries the buttons.
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

/** Undo, End game and Recalibrate are three DIFFERENT things (MEMORY: `android-single-camera-owner`). */
@Composable
private fun ActionBar(
    onUndo: () -> Unit,
    undoLabel: String,
    onEndGame: () -> Unit,
    onRecalibrate: () -> Unit,
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
        // Not always "Undo": one press unwinds the last COMMIT, and a CNN recovery commits a
        // whole bridge (four plies on 2026-08-02). It gets NO confirmation — it IS the reversal.
        OutlineAction(undoLabel, onUndo, Modifier.weight(1f))
        // Nor does ending: the game is saved on the way out, and its dialog asks who played.
        OutlineAction("End game", onEndGame, Modifier.weight(1f))
        OutlineAction("Recalibrate", onRecalibrate, Modifier.weight(1f))
    }
}

/**
 * Ending a game where it is PLAYED, and the one place the app asks who played it.
 *
 * "Reset game" used to discard a played game without a word, and the only save action lived on the
 * Games tab — a place you are not looking at while a game is running. Both outcomes are now named,
 * and the destructive one is not the default.
 *
 * The two name fields are optional and pre-filled from the last saved game, because the same two
 * people normally play again. Nothing is asked before the first move: a dialog in front of somebody
 * who wants to press one button and play is the reason this was never captured.
 */
@Composable
private fun EndGameDialog(
    moves: Int,
    onSave: (String, String) -> Unit,
    onDiscard: () -> Unit,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    var white by remember { mutableStateOf("") }
    var black by remember { mutableStateOf("") }
    LaunchedEffect(Unit) {
        val last = withContext(Dispatchers.IO) { GameStore(gamesDir(context)).list().firstOrNull() }
        white = last?.white?.takeUnless { it == UNKNOWN }.orEmpty()
        black = last?.black?.takeUnless { it == UNKNOWN }.orEmpty()
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (moves > 0) "End this game?" else "Start a new game?") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Space.sm)) {
                Text(
                    if (moves > 0) {
                        "$moves moves are recorded. Saving keeps them in Games together with this " +
                            "session's frames; discarding drops the game — frames already written stay " +
                            "on disk and are deleted from the Games screen."
                    } else {
                        "Nothing is recorded yet. This re-seeds the tracker from the starting position."
                    },
                )
                if (moves > 0) {
                    OutlinedTextField(white, { white = it }, label = { Text("White") }, singleLine = true)
                    OutlinedTextField(black, { black = it }, label = { Text("Black") }, singleLine = true)
                    Text("Leave blank to skip.", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (moves > 0) onSave(named(white), named(black)) else onDiscard()
                },
            ) {
                Text(if (moves > 0) "Save & new game" else "New game", color = Accent)
            }
        },
        dismissButton = {
            // Never the default action, and never silent: discarding a played game is the one
            // outcome here that cannot be undone, so it does not act — it opens the confirmation.
            if (moves > 0) {
                TextButton(onClick = onDiscard) { Text("Discard…", color = Danger) }
            } else {
                TextButton(onClick = onDismiss) { Text("Cancel", color = OnSurfaceMuted) }
            }
        },
    )
}

/** A blank field is not a player called "", it is the same "nobody said" the store already has. */
private fun named(value: String): String = value.trim().ifBlank { UNKNOWN }

private val NO_LIVE_GAME = MutableStateFlow(GameSessionState())
