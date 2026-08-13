package com.chesslab.tracker.ui.tracking

import androidx.annotation.StringRes
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.chesslab.tracker.R
import com.chesslab.tracker.analysis.AnalysisSettingsHost
import com.chesslab.tracker.games.GameSessionController
import com.chesslab.tracker.games.GameSessionState
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.UNKNOWN
import com.chesslab.tracker.service.TrackerRun
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.ConfirmDialog
import com.chesslab.tracker.ui.Figure
import com.chesslab.tracker.ui.FilledAction
import com.chesslab.tracker.ui.OutlineAction
import com.chesslab.tracker.ui.SourceFramedPreview
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
import com.chesslab.tracker.ui.theme.Outline
import com.chesslab.tracker.ui.theme.Radius
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Stroke
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

/**
 * What is open on top of the board. One state rather than five booleans: at most one of these can be
 * up at a time, and five independent flags made that an invariant nothing enforced.
 */
private enum class TrackerModal {
    NONE,
    ENDING,
    DISCARDING,
    RECALIBRATING,
    SHARE,
}

@Composable
private fun TrackingScreen(
    viewModel: TrackingViewModel,
    running: Boolean,
    onBack: () -> Unit,
) {
    val ui by viewModel.ui.collectAsStateWithLifecycle()
    val preview by viewModel.preview.collectAsStateWithLifecycle()
    val cameraOn by viewModel.cameraOn.collectAsStateWithLifecycle()
    // The live game lives in the service, not in this screen's view model — the same handle Home and
    // the Games screen use. Reaching for it here is what lets a game be SAVED where it is played.
    val games by GameSessionHost.controller.collectAsStateWithLifecycle()
    val live by (games?.state ?: NO_LIVE_GAME).collectAsStateWithLifecycle()
    var modal by remember { mutableStateOf(TrackerModal.NONE) }
    var showPreview by remember { mutableStateOf(false) }

    // Recalibrating replaces the geometry the running game has been tracked against, and there is no
    // way back to the old quad. With no moves committed there is nothing to lose (specs/48 rule 6),
    // and moving the control into the overflow does not change that.
    val onRecalibrate = {
        if (live.moveCount > 0) modal = TrackerModal.RECALIBRATING else viewModel.onRecalibrate()
    }

    ChesslabScaffold(
        title = "Tracking",
        onBack = onBack,
        actions = {
            TrackerMenu(
                viewModel = viewModel,
                cameraOn = cameraOn,
                showPreview = showPreview,
                onTogglePreview = { showPreview = !showPreview },
                onShare = { modal = TrackerModal.SHARE },
                onRecalibrate = onRecalibrate,
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
            onEndGame = { modal = TrackerModal.ENDING },
            onRecalibrate = onRecalibrate,
        )
    }

    TrackingModals(viewModel, games, live.moveCount, modal) { modal = it }
}

/**
 * Everything modal on this screen, kept out of the layout so the screen reads as a layout.
 *
 * Two of these are the acts that cannot be undone (specs/48 rule 6). Undo, Stop tracking and End
 * game are deliberately NOT among them: Undo IS the reversal, and the other two save the game on
 * the way out.
 */
@Composable
private fun TrackingModals(
    viewModel: TrackingViewModel,
    games: GameSessionController?,
    moves: Int,
    modal: TrackerModal,
    onModal: (TrackerModal) -> Unit,
) {
    val ui by viewModel.ui.collectAsStateWithLifecycle()
    val promotion by viewModel.promotion.collectAsStateWithLifecycle()
    val acceptCnn by viewModel.acceptCnn.collectAsStateWithLifecycle()
    val close = { onModal(TrackerModal.NONE) }
    // The record must go with the engine reset. Resetting only the ENGINE left the discarded game
    // standing in the service, so the next ply was illegal from it and opened a seam inside a game
    // the user had just thrown away.
    val discard = {
        games?.discard()
        viewModel.onResetGame()
        close()
    }
    when (modal) {
        TrackerModal.SHARE -> ShareDialog(close)
        TrackerModal.ENDING ->
            EndGameDialog(
                moves = moves,
                onSave = { white, black ->
                    games?.endAndSave(white, black)
                    viewModel.onResetGame()
                    close()
                },
                // With moves on the board this only OPENS the confirmation; with none there is
                // nothing to confirm and the same control re-seeds the tracker outright.
                onDiscard = { if (moves > 0) onModal(TrackerModal.DISCARDING) else discard() },
                onDismiss = close,
            )
        TrackerModal.DISCARDING ->
            ConfirmDialog(
                title = "Discard this game?",
                body = "$moves moves and everything recorded for them. This cannot be undone.",
                verb = "Discard",
                onConfirm = discard,
                onDismiss = close,
            )
        TrackerModal.RECALIBRATING ->
            ConfirmDialog(
                title = "Recalibrate mid-game?",
                body =
                    "$moves moves have been tracked against the current board geometry. Fitting a " +
                        "new grid replaces it, and the old one is not kept.",
                verb = "Recalibrate",
                onConfirm = {
                    close()
                    viewModel.onRecalibrate()
                },
                onDismiss = close,
            )
        TrackerModal.NONE -> Unit
    }
    acceptCnn?.let {
        AcceptCnnDialog(
            preview = it,
            onConfirm = viewModel::onAcceptCnnConfirmed,
            onCancel = viewModel::onAcceptCnnCancelled,
        )
    }
    promotion?.let { PromotionDialog(prompt = it, fen = ui.fen, onChoose = viewModel::onPromotionChosen) }
}

/**
 * Everything the action bar used to spend two rows of chips on — and, since specs/49, Recalibrate.
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
    onRecalibrate: () -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    val torchOn by viewModel.torchOn.collectAsStateWithLifecycle()
    IconButton(onClick = { open = true }) {
        Icon(Icons.Filled.MoreVert, contentDescription = "More")
    }
    DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
        // Recalibrating a board that is already tracking is a repair, not one of the three things a
        // running game is for. It kept its confirmation — a menu is not a licence.
        DropdownMenuItem(text = { Text("Recalibrate") }, onClick = {
            onRecalibrate()
            open = false
        })
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

/**
 * **Two jobs, two layouts** (specs/49). Getting the camera working and watching a game need
 * different content, and one arrangement for both left roughly half the screen inert in either
 * state: an eval bar with nothing to evaluate, a ~500 px box holding "No moves yet", and — on the
 * screen that OWNS the camera — no camera, so a failing calibration could not be seen at all.
 *
 * [TrackingSwitch] is outside the branch because starting and stopping is the one control both
 * states share, and it is the bottom of the screen in both.
 */
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
    Column(
        modifier.fillMaxSize().padding(vertical = Space.sm),
        verticalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        StatusLine(ui)
        if (ui.ready) {
            Watching(viewModel, ui, game, camera, running, onEndGame)
        } else {
            NotReady(viewModel, ui, onRecalibrate)
        }
        TrackingSwitch(running)
    }
}

/**
 * **B — tracking.** The job is to watch a game, so the game is what is on screen.
 *
 * Nothing here is filled while tracking is nominal: watching is not an act. The one exception is the
 * alarm card, which when the latch is up IS the screen's current job and carries its own resolution.
 */
@Composable
private fun ColumnScope.Watching(
    viewModel: TrackingViewModel,
    ui: TrackingUiState,
    game: GameView,
    camera: android.graphics.Bitmap?,
    running: Boolean,
    onEndGame: () -> Unit,
) {
    val lastCommit = viewModel.lastCommit.collectAsStateWithLifecycle().value
    // ONE reserved line, and it is the most volatile string on the screen — reflowing it above the
    // board shifts every button under the user's thumb. It reserved TWO, for a not-calibrated
    // sentence that belongs to the other layout now and is printed there at full size. Blank while
    // alarmed: the note doubles as the NOTIFICATION text, so it then reads "Open the app to fix it"
    // directly above the card that carries the buttons.
    Text(
        text = if (ui.alarm != null) " " else ui.infoLine ?: " ",
        style = MaterialTheme.typography.bodySmall,
        color = OnSurfaceMuted,
        minLines = 1,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
    )
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
    // The list GROWS with its content and is absent while there is none. `fill = false` caps it at
    // what is left over and lets it be smaller — it used to be a ~500 px reserved box whose whole
    // content was the words "No moves yet", which is the empty-state rule inverted.
    if (game.plies.isNotEmpty()) {
        MoveList(game = game, modifier = Modifier.fillMaxWidth().weight(1f, fill = false))
    }
    // Not tracking is a legitimate state of this screen, not an error: the board keeps the
    // position it last had and the only control left is the one that would change that.
    if (running) {
        ActionBar(
            onUndo = viewModel::onUndo,
            undoLabel = pluralStringResource(R.plurals.tracking_take_back, undoCount(lastCommit), undoCount(lastCommit)),
            // Ending a game that has moves USED to throw it away without a word.
            onEndGame = onEndGame,
        )
    }
}

/**
 * **A — not ready.** No camera, no frames or no geometry. The job is to make it work.
 *
 * The picture takes the space, because seeing what the phone sees is the only way to know why it is
 * failing — and the board this screen would otherwise draw is the position the app BELIEVES, which
 * here is an unrelated picture. No board, no eval bar, no move list: none of them can say anything
 * yet. The reason is stated once, at normal size, in the body colour.
 */
@Composable
private fun ColumnScope.NotReady(
    viewModel: TrackingViewModel,
    ui: TrackingUiState,
    onRecalibrate: () -> Unit,
) {
    val preview by viewModel.rawPreview.collectAsStateWithLifecycle()
    val rotation by viewModel.previewRotation.collectAsStateWithLifecycle()
    ui.infoLine?.let {
        Text(it, style = MaterialTheme.typography.bodyLarge, color = OnSurface)
    }
    // With no service there is no camera to look at, so there is no picture and no frame around
    // one — a box saying "No camera frame yet" over a tracker nobody has started is the reserved
    // empty container this pack exists to remove. The space keeps the switch at the bottom.
    if (ui.task == TrackerTask.START) {
        Spacer(Modifier.weight(1f))
    } else {
        SourceFramedPreview(
            preview = preview,
            rotationDegrees = rotation,
            sourceWidth = preview?.width ?: 0,
            sourceHeight = preview?.height ?: 0,
            // The edge is what makes it read as a picture rather than as a hole in the screen: the
            // frame is letterboxed inside its box and the bands are the app's own ground colour.
            modifier =
                Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .border(Stroke.hairline, Outline, RoundedCornerShape(Radius.md))
                    .clip(RoundedCornerShape(Radius.md)),
            empty = { Text("No camera frame yet", style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted) },
        )
    }
    // The screen's ONE filled button, and it is whatever the screen needs NOW. `START` has none of
    // its own: `TrackingSwitch` below is already that button, and two filled buttons is rule 3
    // broken in the state the rule was written for.
    when (ui.task) {
        TrackerTask.CALIBRATE -> FilledAction("Calibrate", onRecalibrate, Modifier.fillMaxWidth())
        TrackerTask.RESUME_CAMERA -> FilledAction("Resume camera", viewModel::onToggleCamera, Modifier.fillMaxWidth())
        TrackerTask.START, TrackerTask.WATCH -> Unit
    }
}

/**
 * The eval bar is optional, gated and self-contained (07c) — it reads the tracker's status itself
 * and renders nothing when no engine shipped for this ABI. It is skipped outright when analysis is
 * switched off: with nothing to evaluate it drew a static half-and-half split and the word "eval"
 * beside the board, for the whole length of every game. **Absent, not empty.**
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
    val analysis by AnalysisSettingsHost.settings.collectAsStateWithLifecycle()
    Row(
        Modifier.fillMaxWidth().height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        if (analysis.enabled) EvalBarSlot()
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

/**
 * One row: what it thinks, and how fast it thinks it.
 *
 * It was a stacked block whose largest element — `WAITING`, ~90 px, the biggest type on the screen —
 * was a fact nobody could act on. What to DO about it is the filled button now, which is where an
 * instruction belongs. The fps colour is frozen to the alarm colour while alarmed: the loop runs but
 * no move can commit, and a healthy-looking counter would say otherwise.
 */
@Composable
private fun StatusLine(ui: TrackingUiState) {
    val tone = toneColor(ui.tone)
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(stringResource(labelText(ui.state)), style = MaterialTheme.typography.titleMedium, color = tone, maxLines = 1)
        Row(horizontalArrangement = Arrangement.spacedBy(Space.sm), verticalAlignment = Alignment.CenterVertically) {
            ui.fpsDetail?.let {
                Text(it, style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted, maxLines = 1)
            }
            Figure(ui.fpsText, tone)
        }
    }
}

/** [TrackerLabel] -> the words for it. The only place those words exist outside `strings.xml`. */
@StringRes
private fun labelText(label: TrackerLabel): Int =
    when (label) {
        TrackerLabel.LIVE -> R.string.tracking_state_live
        TrackerLabel.HAND_OVER_BOARD -> R.string.tracking_state_hand
        TrackerLabel.NO_DETECTION -> R.string.tracking_state_no_detection
        TrackerLabel.POSITION_LOST -> R.string.tracking_state_lost
        TrackerLabel.CAMERA_OFF -> R.string.tracking_state_camera_off
        TrackerLabel.NOT_TRACKING -> R.string.tracking_state_off
    }

@Composable
private fun toneColor(tone: StateTone): Color =
    when (tone) {
        StateTone.Idle -> OnSurface
        StateTone.Busy -> Busy
        StateTone.Active -> Accent
        StateTone.Alarm -> Danger
    }

/**
 * The two things a running game is FOR — taking a move back and finishing.
 *
 * Recalibrate was the third identical outline button here and is in the `⋯` overflow now: it is a
 * repair, not a move in the game, and having it beside Undo is what made the sentence "tap
 * Recalibrate" point at one of three things that all looked the same. It is still a DIFFERENT act
 * from Reset game and must never share a handler (MEMORY: `android-single-camera-owner`).
 */
@Composable
private fun ActionBar(
    onUndo: () -> Unit,
    undoLabel: String,
    onEndGame: () -> Unit,
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
        // Not always "Undo": one press unwinds the last COMMIT, and a CNN recovery commits a
        // whole bridge (four plies on 2026-08-02). It gets NO confirmation — it IS the reversal.
        OutlineAction(undoLabel, onUndo, Modifier.weight(1f))
        // Nor does ending: the game is saved on the way out, and its dialog asks who played.
        OutlineAction("End game", onEndGame, Modifier.weight(1f))
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
